#!/usr/bin/env bash
# NAS-DAMIEN — Tailscale 1.40.x legacy Serve/Funnel syntax.
# Safe by default: --check does not change routes; --apply opts in explicitly.
# Does not reset existing /, /git, /livres, /agent, /alphaterm, /portainer.
set -Eeuo pipefail
umask 077
cd "$(dirname "$0")"

fail(){ printf '[ResurGo] ARRET : %s\n' "$*" >&2; exit 1; }
info(){ printf '[ResurGo] %s\n' "$*"; }
MODE="${1:---check}"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] ||
  fail "Usage : bash enable-tailscale-140.sh [--check|--apply]"

[[ -r .env ]] || fail "Fichier .env ResurGo absent."
set -a
# shellcheck disable=SC1091
. ./.env
set +a

# These exact ports were verified as unused on NAS-DAMIEN during staging.
[[ "${RS_PUBLIC_HOST_PORT:-}" == 18879 && "${RS_ADMIN_HOST_PORT:-}" == 18880 &&
   "${RS_FUNNEL_HTTPS_PORT:-}" == 10000 && "${RS_SERVE_ADMIN_HTTPS_PORT:-}" == 10001 ]] ||
  fail "Ports différents de la recette NAS (18879,18880,10000,10001) : refus."

TS=""
if command -v tailscale >/dev/null 2>&1; then
  TS="$(command -v tailscale)"
else
  for candidate in \
    /share/CE_CACHEDEV1_DATA/.qpkg/Tailscale/tailscale \
    /share/CE_CACHEDEV1_DATA/.qpkg/Tailscale/bin/tailscale \
    /share/CACHEDEV1_DATA/.qpkg/Tailscale/tailscale \
    /share/CACHEDEV1_DATA/.qpkg/Tailscale/bin/tailscale
  do
    if [[ -x "$candidate" ]]; then TS="$candidate";break;fi
  done
fi
[[ -n "$TS" ]] || fail "Client tailscale introuvable."

VERSION="$("$TS" version | head -n 1)"
[[ "$VERSION" == 1.40.* ]] ||
  fail "Script specifique Tailscale 1.40.x, version détectée : $VERSION."

info "Validation de la santé locale des deux API."
curl -fsS --max-time 5 "http://127.0.0.1:18879/health" >/dev/null ||
  fail "API publique inaccessible : pas d'ouverture Funnel."
curl -fsS --max-time 5 -H "Authorization: Bearer ${RS_ADMIN_TOKEN:?}" \
  "http://127.0.0.1:18880/health" >/dev/null ||
  fail "API admin injoignable avec son token : pas de nouvelle route."
[[ "$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' \
    'http://127.0.0.1:18879/admin/profiles')" == 404 ]] ||
  fail "API publique expose l'administration : refus absolu."
[[ "$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' \
    'http://127.0.0.1:18880/health')" == 401 ]] ||
  fail "API admin sans token n'est pas protégée : refus."

info "Sauvegarde locale de configuration Tailscale pour audit ; aucune reinitialisation."
mkdir -p .tailscale-audit
chmod 700 .tailscale-audit
STAMP="$(date +%Y%m%dT%H%M%S)"
"$TS" serve status --json > ".tailscale-audit/serve-before-$STAMP.json" ||
  fail "Lecture Serve JSON impossible."
"$TS" funnel status --json > ".tailscale-audit/funnel-before-$STAMP.json" ||
  fail "Lecture Funnel JSON impossible."
chmod 600 ".tailscale-audit/"*.json

# Positive check that all known routes still exist, not only that the ports
# are free. Preserve historical 443 routing for unrelated services.
CURRENT="$("$TS" serve status)"
for route in /git /agent /livres /alphaterm /portainer; do
  printf '%s\n' "$CURRENT" | grep -Fq "$route" ||
    fail "Route existante $route absente : ne pas changer les ports."
done
printf '%s\n' "$CURRENT" | grep -Fq '127.0.0.1:8123' ||
  fail "Route racine Home Assistant non trouvée : arrêt."

# The preexisting 443 routes may be extensive; never operate on 443.
for port in 10000 10001; do
  if grep -E "([^0-9]|^)$port([^0-9]|$)" ".tailscale-audit/serve-before-$STAMP.json" >/dev/null ||
     grep -E "([^0-9]|^)$port([^0-9]|$)" ".tailscale-audit/funnel-before-$STAMP.json" >/dev/null; then
    fail "Port HTTPS $port déjà mentionné par Tailscale : refus d'écrasement."
  fi
  if netstat -tln 2>/dev/null | grep -E ":${port}[[:space:]]" >/dev/null; then
    fail "Port HTTPS $port en écoute sur le NAS : refus d'écrasement."
  fi
done

info "Routes 443 existantes et ports 10000/10001 vérifiés."
if [[ "$MODE" == "--check" ]]; then
  info "PRECONTROLE OK ; aucun tunnel modifié."
  info "Pour appliquer explicitement : bash ./enable-tailscale-140.sh --apply"
  exit 0
fi

info "Activation ancienne syntaxe v1.40 : PRIVATE Serve HTTPS:10001 en premier."
"$TS" serve https:10001 / http://127.0.0.1:18880 ||
  fail "Serve prive non activé. Funnel toujours inchangé."

info "Activation Serve HTTPS:10000 vers API publique, sans rendre le port public encore."
"$TS" serve https:10000 / http://127.0.0.1:18879 ||
  fail "Serve public non configure : ne pas ouvrir Funnel."

info "Controle des routes 443 avant l'autorisation Funnel."
AFTER="$("$TS" serve status)"
for route in /git /agent /livres /alphaterm /portainer; do
  printf '%s\n' "$AFTER" | grep -Fq "$route" ||
    fail "Une ancienne route est absente : INTERRUPTION avant Funnel."
done

info "Funnel on pour le port 10000 SEULEMENT (jamais 443 ni 10001)."
"$TS" funnel 10000 on ||
  fail "Funnel 10000 refusé. Ne pas modifier les autres routes."

info "Validation du statut final (sans données sensibles)."
"$TS" funnel status
"$TS" serve status
info "Configurer dans ResurGo l'URL https://nas-damien.tailfb6907.ts.net:10000"
info "RECETTE REQUISE depuis iPhone hors Tailscale : /health=200 et /admin/profiles=404."
info "Administration privée sur tailnet : https://nas-damien.tailfb6907.ts.net:10001/"
