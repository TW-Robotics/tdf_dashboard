#!/usr/bin/env bash
set -Eeuo pipefail

trap 'printf "\nStart fehlgeschlagen (Zeile %s). Siehe Fehlermeldung oben.\n" "$LINENO" >&2' ERR

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
DOCKER=(docker)

fail() {
    printf '\nFehler: %s\n' "$*" >&2
    exit 1
}

as_root() {
    if (( EUID == 0 )); then
        "$@"
    elif command -v sudo >/dev/null 2>&1; then
        sudo "$@"
    else
        fail "Fuer diesen Schritt werden Administratorrechte benoetigt: $*"
    fi
}

compose() {
    "${DOCKER[@]}" compose --project-directory "$PROJECT_DIR" -f "$COMPOSE_FILE" "$@"
}

cd -- "$PROJECT_DIR"
[[ -f "$COMPOSE_FILE" ]] || fail "docker-compose.yml fehlt im Projektordner."
command -v docker >/dev/null 2>&1 || fail \
    "Docker ist nicht installiert. Installiere Docker Engine mit Compose oder Docker Desktop: https://docs.docker.com/get-started/get-docker/"
docker compose version >/dev/null 2>&1 || fail \
    "Docker Compose fehlt. Installiere das Compose-Plugin oder Docker Desktop: https://docs.docker.com/compose/install/"
compose config --quiet

printf 'Pruefe Docker ...\n'
if ! docker info >/dev/null 2>&1; then
    case "$(uname -s)" in
        Linux)
            if command -v systemctl >/dev/null 2>&1 && systemctl --user cat docker.service >/dev/null 2>&1; then
                printf 'Starte Docker fuer den aktuellen Benutzer ...\n'
                systemctl --user start docker.service
            elif command -v systemctl >/dev/null 2>&1 && systemctl cat docker.service >/dev/null 2>&1; then
                if ! systemctl is-active --quiet docker.service; then
                    printf 'Starte den Docker-Dienst (gegebenenfalls mit sudo) ...\n'
                    as_root systemctl start docker.service
                fi
            elif command -v service >/dev/null 2>&1; then
                printf 'Starte den Docker-Dienst (gegebenenfalls mit sudo) ...\n'
                as_root service docker start
            else
                fail "Docker ist nicht erreichbar. Starte Docker Engine oder Docker Desktop und fuehre das Skript erneut aus."
            fi
            if ! docker info >/dev/null 2>&1 && (( EUID != 0 )); then
                printf 'Pruefe den Docker-Zugriff mit sudo ...\n'
                if command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
                    DOCKER=(sudo docker)
                fi
            fi
            ;;
        Darwin)
            printf 'Starte Docker Desktop ...\n'
            open -a Docker
            ;;
        *)
            fail "Docker ist nicht erreichbar. Starte Docker Desktop und fuehre das Skript erneut aus."
            ;;
    esac
fi

docker_ready=false
for (( attempt = 1; attempt <= 60; attempt++ )); do
    if "${DOCKER[@]}" info >/dev/null 2>&1; then
        docker_ready=true
        break
    fi
    sleep 1
done
[[ "$docker_ready" == true ]] || fail "Docker ist nach 60 Sekunden nicht erreichbar. Pruefe den Docker-Dienst und deine Zugriffsrechte."
compose version >/dev/null

printf '\nBaue und starte das Robot Dashboard ...\n'
compose up -d --build

printf '\nWarte auf das Dashboard ...\n'
container_id="$(compose ps -q robot-lab)"
[[ -n "$container_id" ]] || fail "Der Dashboard-Container wurde nicht gestartet. Pruefe: docker compose logs robot-lab"

dashboard_ready=false
for (( attempt = 1; attempt <= 30; attempt++ )); do
    if compose exec -T robot-lab python -c \
        'import json, sys, urllib.request; response = json.load(urllib.request.urlopen("http://127.0.0.1:8080/api/health", timeout=2)); sys.exit(0 if response.get("ok") is True else 1)' \
        >/dev/null 2>&1; then
        dashboard_ready=true
        break
    fi
    if [[ "$("${DOCKER[@]}" inspect --format '{{.State.Running}}' "$container_id")" != true ]]; then
        break
    fi
    sleep 2
done

if [[ "$dashboard_ready" != true ]]; then
    compose logs --tail 50 robot-lab >&2 || true
    fail "Das Dashboard ist noch nicht bereit. Pruefe die Container-Logs oben."
fi

binding="$(compose port robot-lab 8080)"
binding="${binding%%$'\n'*}"
port="${binding##*:}"
[[ "$port" =~ ^[0-9]+$ ]] || fail "Der veroeffentlichte Dashboard-Port konnte nicht ermittelt werden."

printf '\nDas Robot Dashboard ist bereit.\n'
printf 'Dashboard:  http://localhost:%s\n' "$port"
printf 'Admin:      http://localhost:%s/admin/\n' "$port"
printf '\nLogs im Projektordner anzeigen: docker compose logs -f robot-lab\n'
printf 'System im Projektordner stoppen: docker compose stop\n'
