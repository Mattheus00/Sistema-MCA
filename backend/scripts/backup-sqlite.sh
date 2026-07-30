#!/usr/bin/env bash
# Backup simples do SQLite do SGI (uso em Render/VPS com cron).
# Ex.: 0 3 * * * /opt/sgi/scripts/backup-sqlite.sh

set -euo pipefail

DB_PATH="${SGI_DB_PATH:-/var/data/sgi.db}"
BACKUP_DIR="${SGI_BACKUP_DIR:-/var/data/backups}"
KEEP="${SGI_BACKUP_KEEP:-14}"
TS="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Arquivo de banco não encontrado: $DB_PATH" >&2
  exit 1
fi

# Cópia com sqlite3 .backup quando disponível (mais seguro com WAL).
DEST="$BACKUP_DIR/sgi-$TS.db"
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_PATH" ".backup '$DEST'"
else
  cp -f "$DB_PATH" "$DEST"
  [[ -f "${DB_PATH}-wal" ]] && cp -f "${DB_PATH}-wal" "${DEST}-wal" || true
  [[ -f "${DB_PATH}-shm" ]] && cp -f "${DB_PATH}-shm" "${DEST}-shm" || true
fi

# Retenção
ls -1t "$BACKUP_DIR"/sgi-*.db 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f

echo "Backup criado: $DEST"
