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
# Précontrôle 100 % Bash et utilitaires QNAP. Ne jamais démarrer un
# conteneur de diagnostic Python et ne pas demander de Python à l'hôte.
docker info >/dev/null 2>&1 || fail "Docker non accessible via ce SSH."
# Le CLI QNAP Tailscale n'est pas toujours dans le PATH des connexions SSH.
if ! command -v tailscale >/dev/null 2>&1; then
  for candidate in \
    /share/CE_CACHEDEV1_DATA/.qpkg/Tailscale/tailscale \
    /share/CE_CACHEDEV1_DATA/.qpkg/Tailscale/bin/tailscale \
    /share/CACHEDEV1_DATA/.qpkg/Tailscale/tailscale \
    /share/CACHEDEV1_DATA/.qpkg/Tailscale/bin/tailscale
  do
    if [[ -x "$candidate" ]]; then
      export PATH="$(dirname "$candidate"):$PATH"
      break
    fi
  done
fi
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
for port in "$RS_PUBLIC_HOST_PORT" "$RS_ADMIN_HOST_PORT" "$RS_FUNNEL_HTTPS_PORT" "$RS_SERVE_ADMIN_HTTPS_PORT"; do
  [[ "$port" =~ ^[0-9]+$ ]] || fail "Port non numérique : ${port}"
done
[[ "$RS_PUBLIC_HOST_PORT" != "$RS_ADMIN_HOST_PORT" && "$RS_PUBLIC_HOST_PORT" != "$RS_FUNNEL_HTTPS_PORT" && "$RS_PUBLIC_HOST_PORT" != "$RS_SERVE_ADMIN_HTTPS_PORT" &&
   "$RS_ADMIN_HOST_PORT" != "$RS_FUNNEL_HTTPS_PORT" && "$RS_ADMIN_HOST_PORT" != "$RS_SERVE_ADMIN_HTTPS_PORT" ]] ||
  fail "Les quatre ports doivent être différents."
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

# Vérification non destructive des routes existantes.
# QNAP utilise Tailscale 1.40.0 : le JSON status est disponible même si le
# binaire n'est pas dans le PATH de la session interactive.
info "Contrôle des ports Tailscale (aucune route modifiée)."
TS_FUNNEL_JSON="$(tailscale funnel status --json)" ||
  fail "Impossible de lire le statut Funnel JSON. Aucun déploiement."
TS_SERVE_JSON="$(tailscale serve status --json)" ||
  fail "Impossible de lire le statut Serve JSON. Aucun déploiement."
[[ "$TS_FUNNEL_JSON" == *"{"* && "$TS_SERVE_JSON" == *"{"* ]] ||
  fail "Statut Tailscale non reconnu comme objet JSON."
for port in "$RS_FUNNEL_HTTPS_PORT" "$RS_SERVE_ADMIN_HTTPS_PORT"; do
  # Le diagnostic est volontairement conservateur : une occurrence du nombre
  # dans les deux statuts fait arrêter l'installation, même en cas de faux positif.
  if printf '%s\n%s\n' "$TS_FUNNEL_JSON" "$TS_SERVE_JSON" |
      grep -Eq "(^|[^0-9])${port}([^0-9]|$)"; then
    fail "Port HTTPS Tailscale ${port} mentionné dans une route existante : aucun écrasement."
  fi
done
info "Les ports HTTPS ResurGo n'apparaissent pas dans les configurations Funnel/Serve."

info "Étape 2 : vérification non destructive des ports NAS."
command -v netstat >/dev/null ||
  fail "netstat introuvable : impossible de garantir les ports libres."
LISTEN="$(netstat -tln 2>/dev/null)" ||
  fail "Impossible de lire les sockets TCP ouvertes du NAS."
for port in "$RS_PUBLIC_HOST_PORT" "$RS_ADMIN_HOST_PORT"             "$RS_FUNNEL_HTTPS_PORT" "$RS_SERVE_ADMIN_HTTPS_PORT"; do
  [[ "$port" =~ ^[0-9]+$ && "$port" -ge 1024 && "$port" -le 65535 ]] ||
    fail "Port interdit: ${port}"
  if printf '%s\n' "$LISTEN" | grep -Eq ":[[:space:]]*${port}[[:space:]]"; then
    fail "Port TCP ${port} déjà écouté par le NAS : aucun écrasement."
  fi
done
info "Les quatre ports n'apparaissent pas dans les sockets à l'écoute."

# Préserve les volumes des autres projets ; crée uniquement le volume ResurGo
# au moment du déploiement, jamais lors du diagnostic.
if [[ "${1:-}" == "--apply" ]]; then
  mkdir -p "$RS_HOST_DATA_DIR" ||
    fail "Impossible de créer le volume spécifique ResurGo."
  chmod 700 "$RS_HOST_DATA_DIR" ||
    fail "Impossible de protéger le volume spécifique ResurGo."
  chown 10001:10001 "$RS_HOST_DATA_DIR" ||
    fail "UID/GID 10001 requis pour le volume ResurGo."
fi

info "Contrôle du réseau Docker existant — sans création de Virtual Switch."
BRIDGE_DRIVER="$(docker network inspect bridge --format '{{.Driver}}' 2>/dev/null)" ||
  fail "Réseau Docker bridge introuvable : ne pas créer de nouveau réseau QNAP."
[[ "$BRIDGE_DRIVER" == "bridge" ]] ||
  fail "Le réseau Docker bridge existant n'utilise pas le driver attendu."
# Utiliser exclusivement les deux ports 127.0.0.1 du Compose ResurGo,
# ne pas faire docker network create / prune ni réinitialiser QNAP.
info "Réseau Docker bridge existant détecté."
info "Étape 3 : validation Docker."
docker compose config --quiet
if [[ "${1:-}" != "--apply" ]]; then
  info "PRÉVALIDATION UNIQUEMENT : ni conteneur ni route publiés."
  info "Relancer avec --apply pour installer les conteneurs ; l'activation Tailscale exige --enable-routes séparément."
  exit 0
fi

# Generate no secrets here, never echo them to a terminal.
docker compose up -d --build
# Container Station may report "Started" before Python/SQLite has initialized.
# Never publish Funnel before BOTH APIs are genuinely healthy.
info "Attente de démarrage des deux API, sans toucher aux routes Tailscale."
healthy=0
for attempt in $(seq 1 30); do
  if curl --fail --silent --max-time 3 "http://127.0.0.1:${RS_PUBLIC_HOST_PORT}/health" >/dev/null 2>&1 &&
     curl --fail --silent --max-time 3 -H "Authorization: Bearer ${RS_ADMIN_TOKEN}" \
       "http://127.0.0.1:${RS_ADMIN_HOST_PORT}/health" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 2
done
if [[ "$healthy" != 1 ]]; then
  info "Diagnostic des conteneurs ResurGo uniquement :"
  docker ps -a --filter 'name=resurgo-sync' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true
  info "Dernières lignes du service public :"
  docker logs --tail 30 resurgo-sync-public 2>&1 || true
  info "Dernières lignes du service admin :"
  docker logs --tail 30 resurgo-sync-admin 2>&1 || true
  fail "API ResurGo non prête après vérification : aucun Funnel ajouté."
fi
info "API publique et administration répondent aux tests locaux."
[[ "$(curl --silent --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:${RS_PUBLIC_HOST_PORT}/admin/profiles")" == "404" ]] ||
  fail "Une route admin apparaît sur l'API publique : REFUS de publier."

info "Conteneurs ResurGo opérationnels localement. Les routes restent inchangées."
if [[ "${2:-}" != "--enable-routes" ]]; then
  info "Pour activer les deux entrées HTTPS : relancer --apply --enable-routes APRÈS recette et audit."
  exit 0
fi

# Le NAS utilise Tailscale 1.40.0 : les options --bg --https
# sont propres aux versions récentes. Ne jamais tenter de les appliquer à 1.40
# en risquant de modifier le port 443 historique.
TS_VERSION="$(tailscale version | head -n 1)"
case "$TS_VERSION" in
  1.3[0-9].*|1.4[0-9].*|1.50.*|1.51.*)
    fail "Tailscale ${TS_VERSION} : conteneurs locaux installés. Routes inchangées. Configurer la syntaxe ancienne séparément après diagnostic." ;;
esac

info "Étape 4 : configuration explicite, sans reset et sur ports distincts."
# Configurer l'administration privée en premier ; ne publier Funnel qu'ensuite.
tailscale serve --bg --https="$RS_SERVE_ADMIN_HTTPS_PORT" "http://127.0.0.1:$RS_ADMIN_HOST_PORT" ||
  fail "Serve privé refusé : aucun Funnel ajouté."
tailscale funnel --bg --https="$RS_FUNNEL_HTTPS_PORT" "http://127.0.0.1:$RS_PUBLIC_HOST_PORT" ||
  fail "Funnel refusé : vérifier les routes ; Serve privé éventuellement déjà ajouté."
info "Contrôler maintenant les URL réellement affichées (ne pas en déduire de FQDN)."
tailscale funnel status
tailscale serve status
info "Vérifier immédiatement sur réseau EXTERNE que /admin et /admin/profiles renvoient 404 sur Funnel."
info "Dans PWA, inscrire la véritable URL publique HTTPS Funnel :port sans chemin admin."
