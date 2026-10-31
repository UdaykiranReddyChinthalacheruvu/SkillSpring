#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ -f .env ]]; then set -a; source .env; set +a; fi
PORT="${PORT:-8000}"
DB_URL="${DB_URL:-jdbc:mysql://127.0.0.1:3306/job_matcher}"
DB_USER="${DB_USER:-root}"
command -v javac >/dev/null || { echo "Install Java JDK 17 or newer."; exit 1; }
if [[ ! -f lib/mysql-connector-j-26.7.0.jar ]]; then echo "MySQL Connector/J driver is missing."; exit 1; fi
if [[ ! -f frontend/dist/index.html ]]; then
  command -v node >/dev/null || { echo "Install Node.js 20 or newer."; exit 1; }
  (cd frontend && npm install && npm run build)
fi
mkdir -p build/server
javac --add-modules jdk.httpserver -encoding UTF-8 -d build/server server/src/Json.java server/src/JobMatchServer.java
exec java --add-modules jdk.httpserver -cp "build/server:lib/mysql-connector-j-26.7.0.jar" JobMatchServer "$PORT"
