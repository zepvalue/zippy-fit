#!/bin/bash
# Reset a user's password via Convex Auth.
# Usage: ./run.sh <email> <new-password>

EMAIL="$1"
PASSWORD="$2"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "Usage: $0 <email> <new-password>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../../mobile"

echo "Resetting password for $EMAIL..."
npx convex run admin:resetPassword "{\"email\":\"$EMAIL\",\"newPassword\":\"$PASSWORD\"}"
echo "Done."
