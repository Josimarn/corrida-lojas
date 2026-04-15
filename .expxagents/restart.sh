#!/bin/sh
LOG="/home/josimar/projetos/corrida-lojas/.expxagents/update.log"
unset EXPXAGENTS_VERSION
export DATA_DIR="/home/josimar/projetos/corrida-lojas/.expxagents/data"
echo "[$(date)] Starting update to expxagents@0.30.25" > "$LOG"
sleep 3
echo "[$(date)] Running npx expxagents@0.30.25 server" >> "$LOG"
exec /home/josimar/.nvm/versions/node/v20.20.2/bin/npx --yes expxagents@0.30.25 server >> "$LOG" 2>&1