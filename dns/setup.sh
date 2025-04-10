#!/bin/bash
set -e

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please create it with your PDNS_PASSWORD."
    exit 1
fi

# Create schema directory if it doesn't exist
mkdir -p schema

# Download the PowerDNS schema
echo "Downloading PowerDNS schema..."
curl -o schema/schema.pgsql.sql https://raw.githubusercontent.com/PowerDNS/pdns/master/modules/gpgsqlbackend/schema.pgsql.sql

# Initialize the database
echo "Initializing database..."
psql -U postgres -d exhibitron -f init-db.sql

echo "Setup complete. You can now start PowerDNS with: docker compose up -d" 