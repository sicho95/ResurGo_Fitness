#!/usr/bin/env bash
# ResurGo Sync — non-destructive QNAP deployment helper.
# Requires local SSH/terminal access to NAS. Never publishes admin via Funnel.
set -euo pipefail
umask 077
cd "$(dirname "$0")"

RS_PUBLIC_HOST_PORT="${RS_PUBLIC_HOST_PORT:-18879}"
RS_ADMIN_HOST_PORT="${RS_ADMIN_HOST_PORT:-18880}"
RS_FUNNEL_HTTPS_PORT="${RS_FUNNEL_HTTPS_PORT:-10000}"
RS_SERVE_ADMIN_HTTPS_PORT="${RS_SERVE_ADMIN_HTTPS_PORT:-9443}"

fail(){ printf 'ERREUR : %s\n' "$*" >&2; exit 1; }
info(){ printf '[ResurGo] %s\n' "$*"; }

[[ -f .env ]] || fail "Créer .env avec RS_HOST_DATA_DIR et secrets, à partir de .env.example."
command -v docker >/dev/null || fail "Docker est introuvable sur le NAS."
docker compose version >/dev/null || fail "Docker Compose V2 indisponible."
command -v curl >/dev/null || fail "curl requis."
command -v python3 >/dev/null || fail "Python 3 requis pour valider les secrets/config."
command -v tailscale >/dev/null || fail "CLI tailscale introuvable sur ce NAS : ne pas modifier les tunnels."

set -a
# shellcheck disable=SC1091
. ./.env
set +a

[[ "$RS_PUBLIC_HOST_PORT" =~ ^[0-9]+$ ]] || fail "Port public hôte invalide."
[[ "$RS_ADMIN_HOST_PORT" =~ ^[0-9]+$ ]] || fail "Port admin hôte invalide."
[[ "$RS_FUNNEL_HTTPS_PORT" =~ ^(443|8443|10000)$ ]] || fail "Funnel : port HTTPS autorisé = 443, 8443 ou 10000."
[[ "$RS_SERVE_ADMIN_HTTPS_PORT" =~ ^[0-9]+$ ]] || fail "Serve : port HTTPS privé invalide."
[[ "$RS_FUNNEL_HTTPS_PORT" != "$RS_SERVE_ADMIN_HTTPS_PORT" ]] || fail "Serve et Funnel ne peuvent pas partager le port HTTPS."
[[ "${RS_HOST_DATA_DIR:-}" == /* && "$RS_HOST_DATA_DIR" != "/" ]] || fail "RS_HOST_DATA_DIR doit être un chemin absolu NAS."
[[ "${#RS_ADMIN_TOKEN}" -ge 48 && "${#RS_PAIR_PEPPER}" -ge 48 ]] || fail "RS_ADMIN_TOKEN et RS_PAIR_PEPPER doivent contenir au moins 48 caractères aléatoires."
[[ "$RS_ADMIN_TOKEN" != "$RS_PAIR_PEPPER" ]] || fail "Les deux secrets doivent être différents."
for secret in "$RS_ADMIN_TOKEN" "$RS_PAIR_PEPPER"; do
  if [[ "$secret" =~ (REMPLACER|CHANGE_ME|EXAMPLE|EXEMPLE|DUMMY|FAUX|PASSWORD|SECRET_LONG) ]]; then
    fail "Valeur de démonstration détectée : générer les vrais secrets hors GitHub."
  fi
done

info "Étape 1 : inventaire non destructif des routes et conteneurs."
tailscale version
tailscale funnel status || true
tailscale serve status || true
docker ps --format 'table {{.Names}}\t{{.Ports}}' || fail "Impossible de lire les conteneurs."

# Refuse to change an existing listener, even if it looks like ResurGo.
# Parse official JSON status; never wipe the whole tailnet with reset.
info "Contrôle des ports HTTPS Tailscale."
export RS_FUNNEL_HTTPS_PORT RS_SERVE_ADMIN_HTTPS_PORT
python3 - <<'PY'
import json, os, re, subprocess, sys
ports = [os.environ["RS_FUNNEL_HTTPS_PORT"],os.environ["RS_SERVE_ADMIN_HTTPS_PORT"]]
seen = []
for command in (["tailscale","funnel","status","--json"],["tailscale","serve","status","--json"]):
    result = subprocess.run(command,capture_output=True,text=True)
    if result.returncode != 0:sys.exit(f"Statut Tailscale illisible ({' '.join(command)}) ; refus de modifier la configuration.")
    try: cfg=json.loads(result.stdout or "{}")
    except json.JSONDecodeError:sys.exit("Impossible de décoder les routes JSON Tailscale ; refus de modifier.")
    seen.append(json.dumps(cfg,ensure_ascii=False))
for p in ports:
    for raw in seen:
        if re.search(r'(?<!\d):'+re.escape(p)+r'(?=\D|$)',raw) or re.search(r'"'+re.escape(p)+r'":',raw):
            sys.exit(f"Port Tailscale {p} déjà défini : ne pas écraser la configuration existante.")
print("Ports Tailscale choisis non référencés dans la configuration actuelle.")
PY

info "Étape 2 : vérifier le volume isolé et les ports Docker."
mkdir -p "$RS_HOST_DATA_DIR"
# QNAP peut nécessiter l'ajustement manuel de l'UID du volume 10001.
[[ -d "$RS_HOST_DATA_DIR" ]] || fail "Volume NAS introuvable."
python3 - <<'PY'
import os,socket
for key in ("RS_PUBLIC_HOST_PORT","RS_ADMIN_HOST_PORT"):
    port=int(os.environ.get(key,18879 if key=="RS_PUBLIC_HOST_PORT" else 18880))
    if not 1024<=port<=65535:raise SystemExit(f"Port hôte interdit : {port}")
    s=socket.socket()
    try:
        s.bind(("127.0.0.1",port))
    except OSError as e:
        raise SystemExit(f"Port hôte {port} déjà utilisé. Vérifier docker ps avant toute opération : {e}")
    finally:s.close()
PY

info "Étape 3 : validation Docker."
docker compose config --quiet
if [[ "${1:-}" != "--apply" ]]; then
  info "PRÉVALIDATION UNIQUEMENT : ni conteneur ni route publiés."
  info "Relancer avec --apply pour installer les conteneurs ; l'activation Tailscale exige --enable-routes séparément."
  exit 0
fi

# Generate no secrets here, never echo them to a terminal.
docker compose up -d --build
curl --fail --silent --show-error "http://127.0.0.1:${RS_PUBLIC_HOST_PORT}/health" >/dev/null ||
  fail "API publique locale non fonctionnelle. Aucun Funnel ajouté."
curl --fail --silent --show-error -H "Authorization: Bearer ${RS_ADMIN_TOKEN}" \
  "http://127.0.0.1:${RS_ADMIN_HOST_PORT}/health" >/dev/null ||
  fail "API admin locale non fonctionnelle. Aucun Funnel ajouté."
[[ "$(curl --silent --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:${RS_PUBLIC_HOST_PORT}/admin/profiles")" == "404" ]] ||
  fail "Une route admin apparaît sur l'API publique : REFUS de publier."

info "Conteneurs ResurGo opérationnels localement. Les routes restent inchangées."
if [[ "${2:-}" != "--enable-routes" ]]; then
  info "Pour activer les deux entrées HTTPS : relancer --apply --enable-routes APRÈS recette et audit."
  exit 0
fi

info "Étape 4 : configuration explicite, sans reset et sur ports distincts."
tailscale funnel --bg --https="$RS_FUNNEL_HTTPS_PORT" "http://127.0.0.1:$RS_PUBLIC_HOST_PORT"
tailscale serve --bg --https="$RS_SERVE_ADMIN_HTTPS_PORT" "http://127.0.0.1:$RS_ADMIN_HOST_PORT"
info "Contrôler maintenant les URL réellement affichées (ne pas en déduire de FQDN)."
tailscale funnel status
tailscale serve status
info "Vérifier immédiatement sur réseau EXTERNE que /admin et /admin/profiles renvoient 404 sur Funnel."
info "Dans PWA, inscrire la véritable URL publique HTTPS Funnel :port sans chemin admin."
