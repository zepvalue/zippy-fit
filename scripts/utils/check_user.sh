#!/bin/bash
# Check a user's current state in Convex (team_id, name, etc.)
# Usage: ./check_user.sh <email>

EMAIL="$1"
if [ -z "$EMAIL" ]; then
  echo "Usage: $0 <email>"
  exit 1
fi

cd "$(dirname "$0")/../../mobile"
npx convex run admin:getUserByEmail "{\"email\":\"$EMAIL\"}"
