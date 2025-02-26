#!/bin/sh

set -e

# Set working directory
cd "$HOME/cc-katalog-backups"

# Define temp file and backup name
temp_file=".backup-temp.sql"
timestamp="$(date +%Y%m%dT%H%M%S)"
backup_file="backup-$timestamp.sql"

# Run backup command and save output to temp file
SSH_AUTH_SOCK= ssh -i backup-key retrostar.classic-computing.de backup > "$temp_file"

# Check if the command was successful
if [ $? -ne 0 ]; then
    echo "Backup command failed" >&2
    rm -f "$temp_file"
    exit 1
fi

# Find the latest backup file (excluding the temp file)
latest_backup=$(ls -t backup-*.sql 2>/dev/null | head -n 1)

# Compare the temp file with the latest backup if it exists
if [ -n "$latest_backup" ] && cmp -s "$temp_file" "$latest_backup"; then
    # No changes, remove temp file
    rm "$temp_file"
else
    # Changes detected, move temp file to final backup file
    mv "$temp_file" "$backup_file"
fi

