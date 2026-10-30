#!/usr/bin/env bash
# Bootstrap sans écrasement pour NAS-DAMIEN QNAP.
# Télécharge uniquement le code serveur ResurGo, génère les secrets localement,
# lance le PRÉCONTRÔLE (aucun Docker démarré, aucune route Funnel modifiée).
set -Eeuo pipefail
umask 077

die(){ printf "\n[ResurGo] ARRÊT : %s\n" "$*" >&2; exit 1; }
say(){ printf "[ResurGo] %s\n" "$*"; }

BASE="${RESURGO_BASE:-/share/CE_CACHEDEV1_DATA/ResurGoSync}"
SERVER="$BASE/server"
DATA="$BASE/data"
SOURCE="https://raw.githubusercontent.com/sicho95/ResurGo_Fitness/main/server/resurgo-sync"

[[ -d /share/CE_CACHEDEV1_DATA ]] ||
  die "Le volume QNAP /share/CE_CACHEDEV1_DATA est absent : vérifier le VRAI chemin avec ls /share/."
[[ "$BASE" == /share/CE_CACHEDEV1_DATA/* && "$BASE" != /share/CE_CACHEDEV1_DATA/ ]] ||
  die "RESURGO_BASE non sûr, doit être un sous-dossier de /share/CE_CACHEDEV1_DATA."
[[ ! -L "$BASE" && ! -L "$SERVER" && ! -L "$DATA" ]] ||
  die "Répertoire de déploiement sous un lien symbolique : refus pour protéger les autres données."
[[ ! -e "$SERVER/.env" && ! -e "$SERVER/docker-compose.yml" ]] ||
  die "ResurGo est déjà installé dans $SERVER. Rien ne sera écrasé."

command -v curl >/dev/null || die "curl manquant."
command -v docker >/dev/null || die "docker manquant."
docker compose version >/dev/null 2>&1 || die "docker compose V2 manquant."
if ! command -v python3 >/dev/null 2>&1; then
  for candidate in \
    /share/CE_CACHEDEV1_DATA/.qpkg/Python3/bin/python3 \
    /share/CE_CACHEDEV1_DATA/.qpkg/Python312/bin/python3 \
    /share/CACHEDEV1_DATA/.qpkg/Python3/bin/python3
  do
    if [[ -x "$candidate" ]]; then
      export PATH="$(dirname "$candidate"):$PATH"
      break
    fi
  done
fi
command -v python3 >/dev/null || die "python3 manquant. Le test des ports/règles JSON Tailscale doit être fiable."
command -v openssl >/dev/null || die "openssl manquant (génération des secrets)."
[[ "$(id -u)" == "0" ]] || die "Lancer en SSH avec un compte administrateur UID 0, nécessaire pour chown du volume."

mkdir -p "$BASE"
chmod 700 "$BASE"
STAGE="$(mktemp -d "$BASE/.resurgo-staging.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
say "Téléchargement des sources ResurGo depuis GitHub…"
for file in app.py admin.html admin.js Dockerfile requirements.txt docker-compose.yml deploy-nas-qnap.sh .env.example; do
  curl --fail --silent --show-error --location --retry 2 --max-time 30 "$SOURCE/$file" -o "$STAGE/$file" ||
    die "Téléchargement impossible pour $file. Aucun autre service modifié."
  [[ -s "$STAGE/$file" ]] || die "Fichier vide : $file"
done
bash -n "$STAGE/deploy-nas-qnap.sh" || die "Script source invalide."

mkdir -p "$SERVER" "$DATA"
chmod 700 "$SERVER" "$DATA"
chown 10001:10001 "$DATA" || die "chown du dossier ResurGo impossible"
for file in app.py admin.html admin.js Dockerfile requirements.txt docker-compose.yml deploy-nas-qnap.sh .env.example; do
  cp "$STAGE/$file" "$SERVER/$file"
done
chmod 700 "$SERVER/deploy-nas-qnap.sh"
ADMIN_TOKEN="$(openssl rand -hex 32)"
PAIR_PEPPER="$(openssl rand -hex 32)"
[[ -n "$ADMIN_TOKEN" && -n "$PAIR_PEPPER" && "$ADMIN_TOKEN" != "$PAIR_PEPPER" ]] ||
  die "La génération des deux secrets a échoué."
{
  printf 'RS_HOST_DATA_DIR=%s\n' "$DATA"
  printf 'RS_PUBLIC_HOST_PORT=18879\n'
  printf 'RS_ADMIN_HOST_PORT=18880\n'
  printf 'RS_FUNNEL_HTTPS_PORT=10000\n'
  printf 'RS_SERVE_ADMIN_HTTPS_PORT=10001\n'
  printf 'RS_CORS_ORIGINS=https://sicho95.github.io\n'
  printf 'RS_MAX_PROFILES=60\n'
  printf 'RS_MAX_SIGNUPS_DAY=20\n'
  printf 'RS_MAX_SIGNUPS_ORIGIN_DAY=5\n'
  printf 'RS_ADMIN_TOKEN=%s\n' "$ADMIN_TOKEN"
  printf 'RS_PAIR_PEPPER=%s\n' "$PAIR_PEPPER"
} > "$SERVER/.env"
chmod 600 "$SERVER/.env"
unset ADMIN_TOKEN PAIR_PEPPER

say "Contrôles non destructifs des ports, règles Funnel/Serve et Docker Compose…"
cd "$SERVER"
if bash ./deploy-nas-qnap.sh; then
  printf '\n[ResurGo] PRÉCONTRÔLE VALIDÉ. Aucun serveur ni tunnel démarré.\n'
  printf '[ResurGo] Étape suivante, uniquement si tout est bon :\n'
  printf 'cd %q && bash ./deploy-nas-qnap.sh --apply --enable-routes\n' "$SERVER"
else
  printf '\n[ResurGo] BLOQUÉ : aucun conteneur/route ResurGo démarré.\n'
  printf '[ResurGo] La config privée est dans %s/.env, ne pas la partager.\n' "$SERVER"
  exit 1
fi
