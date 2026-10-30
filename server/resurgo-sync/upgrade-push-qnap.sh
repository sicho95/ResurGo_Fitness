#!/usr/bin/env bash
# Mise à jour non destructive : ResurGo seulement, NAS QNAP, réseau bridge existant.
# --check = télécharger/contrôler sans mutation ; --apply = sauvegarder puis redéployer.
# Ne touche jamais à Tailscale, Home Assistant, Forgejo ou AlphaTerminal.
set -Eeuo pipefail
umask 077
here="$(cd -- "$(dirname -- "$0")" && pwd)"
cd "$here"
mode="${1:---check}"
[[ "$mode" == "--check" || "$mode" == "--apply" ]] ||
  { echo "Usage: bash upgrade-push-qnap.sh --check|--apply" >&2; exit 2; }
say(){ echo "[ResurGo] $*"; }
die(){ echo "[ResurGo] ARRÊT : $*" >&2; exit 1; }
[[ -r .env ]] || die "Le .env privé de ResurGo est introuvable."
[[ -f docker-compose.yml && -f app.py ]] || die "Dossier ResurGo invalide."
docker info >/dev/null 2>&1 || die "Docker inaccessible."
[[ "$(docker network inspect bridge --format '{{.Driver}}' 2>/dev/null)" == "bridge" ]] ||
  die "Réseau bridge Docker existant introuvable."
docker ps --format '{{.Names}}' | grep -Fxq resurgo-sync-public ||
  die "Le conteneur public actuel doit être actif avant migration."
docker ps --format '{{.Names}}' | grep -Fxq resurgo-sync-admin ||
  die "Le conteneur admin actuel doit être actif avant migration."
curl -fsS --max-time 5 http://127.0.0.1:18879/health >/dev/null ||
  die "API ResurGo existante non saine : aucun changement."
[[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18879/admin/profiles)" == "404" ]] ||
  die "L'API publique expose l'administration : arrêt."

SOURCE="https://raw.githubusercontent.com/sicho95/ResurGo_Fitness/main/server/resurgo-sync"
STAGE="$(mktemp -d /tmp/resurgo-push-upgrade.XXXXXX)"
trap 'rm -rf "$STAGE"' EXIT
for file in app.py push_service.py push_worker.py requirements.txt Dockerfile docker-compose.yml; do
  curl -fLsS --retry 3 -o "$STAGE/$file" "$SOURCE/$file" ||
    die "Téléchargement $file impossible."
  [[ -s "$STAGE/$file" ]] || die "$file vide."
done
grep -Fq "push_service.ensure_schema" "$STAGE/app.py" ||
  die "Mauvaise version API."
grep -Fq "resurgo-push-worker:" "$STAGE/docker-compose.yml" ||
  die "Compose sans worker."
grep -Fq "network_mode: bridge" "$STAGE/docker-compose.yml" ||
  die "Réseau bridge non explicitement conservé."
grep -Fq "COPY --chown=10001:10001" "$STAGE/Dockerfile" ||
  die "Permissions applicatives incorrectes."
say "Six fichiers récupérés et contrôles non destructifs terminés."
if [[ "$mode" == "--check" ]]; then
  say "PRÉCONTRÔLE OK. NAS/SQLite/containers et Funnel inchangés."
  exit 0
fi

# Backup SQLite is created by sqlite3.backup INSIDE the already-running
# rootless ResurGo container: safe with WAL and concurrent requests.
stamp="$(date +%Y%m%d_%H%M%S)"
backup="resurgo-before-push-${stamp}.sqlite3"
say "Sauvegarde SQLite cohérente dans /data/$backup."
docker exec -u 10001:10001 resurgo-sync-public python3 -c '
import sqlite3,sys
source=sqlite3.connect("/data/resurgo.sqlite3",timeout=30)
target=sqlite3.connect("/data/"+sys.argv[1])
try:
    source.backup(target,pages=100,sleep=.25)
    print("Backup SQLite completed")
finally:
    target.close();source.close()
' "$backup" || die "Sauvegarde SQLite échouée. Pas de changement."

mkdir -p ".code-backups/$stamp"
for file in app.py requirements.txt Dockerfile docker-compose.yml; do
  cp -p "$file" ".code-backups/$stamp/$file" ||
    die "Sauvegarde source $file échouée."
done
for file in app.py push_service.py push_worker.py requirements.txt Dockerfile docker-compose.yml; do
  cp "$STAGE/$file" "$file" || die "Copie $file échouée."
  chmod 600 "$file" || die "chmod $file échoué."
done
say "Vérification Compose avec .env privé inchangé."
docker compose config --quiet || die "Compose invalide : les anciens fichiers sont dans .code-backups/$stamp."
say "Reconstruction ResurGo public/admin sans nouveau réseau, sans modifier Funnel."
docker compose up -d --build --force-recreate resurgo-sync-public resurgo-sync-admin ||
  die "Redémarrage API échoué. Sauvegardes : .code-backups/$stamp et /data/$backup."

ready=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:18879/health >/dev/null 2>&1 &&
     [[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18880/health)" == "401" ]] &&
     [[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18879/admin/profiles)" == "404" ]]; then
    ready=1;break
  fi
  sleep 2
done
if [[ "$ready" != 1 ]]; then
  docker logs --tail 20 resurgo-sync-public 2>&1 || true
  docker logs --tail 20 resurgo-sync-admin 2>&1 || true
  die "APIs après migration non saines. Ne pas activer Push."
fi
say "APIs 18879/18880 opérationnelles, isolation 401/404 vérifiée."
say "Aucun worker activé par cette commande."
say "Pour activer les rappels après recette du test Web Push :"
say "  docker compose --profile push up -d --build resurgo-push-worker"
say "Clé VAPID privée stockée sur le volume ResurGo ; ne pas partager .env ni les sauvegardes."
