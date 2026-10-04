#!/bin/bash
set -e
SERVER_URL="${1:-https://pakwheels-market-intelligence-production.up.railway.app}"
DB_FILE="backend/pakwheels.db"

if [ ! -f "$DB_FILE" ]; then
    echo "Error: $DB_FILE not found."
    exit 1
fi

echo "========================================="
echo "PakWheels Database Cloud Sync"
echo "Target: $SERVER_URL"
echo "Source: $DB_FILE ($(du -h $DB_FILE | cut -f1))"
echo "========================================="

curl -f -X POST "$SERVER_URL/api/db/import" -F "file=@$DB_FILE"
echo ""
echo "Database successfully synced to cloud!"
