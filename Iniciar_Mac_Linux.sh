#!/bin/bash
cd "$(dirname "$0")"

echo "==================================================="
echo "  Ares Trophy Vault - Servidor Local Offline"
echo "==================================================="
echo ""

if ! command -v node &> /dev/null
then
    echo "[ERRO] Node.js não foi encontrado!"
    echo "Por favor, instale o Node.js em https://nodejs.org/"
    exit 1
fi

echo "Iniciando o servidor em http://localhost:3000 ..."
echo "O navegador abrirá automaticamente em instantes."
echo "(Para fechar o programa, pressione Ctrl+C)"
echo ""

(sleep 1.5; if which xdg-open > /dev/null; then xdg-open http://localhost:3000; elif which open > /dev/null; then open http://localhost:3000; fi) &

export NODE_ENV=production
node dist/server.cjs

