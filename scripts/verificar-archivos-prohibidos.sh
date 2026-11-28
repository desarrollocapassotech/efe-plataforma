#!/usr/bin/env bash
# Falla si hay versionados archivos que nunca tienen que estar en el repo: .env reales
# (solo se permite .env.example), keystores de Android y service accounts de Firebase.
set -euo pipefail

prohibidos=$(git ls-files | grep -E '(^|/)\.env(\..+)?$|\.keystore$|\.jks$|firebase-adminsdk.*\.json$|service-?account.*\.json$' | grep -vE '(^|/)\.env\.example$' || true)

if [ -n "$prohibidos" ]; then
  echo "Archivos prohibidos en el repo (secretos o claves):"
  echo "$prohibidos"
  exit 1
fi
echo "OK: no hay .env, keystores ni service accounts versionados."
