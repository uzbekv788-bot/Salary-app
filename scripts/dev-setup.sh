#!/usr/bin/env bash
# Подготовка окружения для разработки (GitHub Codespaces или любой Linux с sudo):
# PostgreSQL, файл .env, зависимости, таблицы и демо-данные. Повторный запуск безопасен.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v psql >/dev/null; then
  sudo apt-get update -qq && sudo apt-get install -y -qq postgresql >/dev/null
fi
sudo service postgresql start >/dev/null
until pg_isready -q; do sleep 1; done
sudo -u postgres psql -qtAc "SELECT 1 FROM pg_roles WHERE rolname='salary'" | grep -q 1 \
  || sudo -u postgres psql -qc "CREATE USER salary WITH PASSWORD 'salary' CREATEDB;"
for db in salary salary_test; do
  sudo -u postgres psql -qtAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 \
    || sudo -u postgres psql -qc "CREATE DATABASE $db OWNER salary;"
done

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s|BETTER_AUTH_SECRET=\"\"|BETTER_AUTH_SECRET=\"$(openssl rand -base64 32)\"|" .env
fi

corepack enable >/dev/null 2>&1 || sudo corepack enable
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
pnpm db:seed
echo "✔ Готово. Запуск: pnpm dev — затем откройте порт 3000 (demo@salary.app / demo12345)"
