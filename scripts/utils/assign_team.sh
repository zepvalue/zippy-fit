#!/bin/bash
# Force-assign a user to a team by email + team code.
# Usage: ./assign_team.sh <email> <team-code>

EMAIL="$1"
CODE="$2"

if [ -z "$EMAIL" ] || [ -z "$CODE" ]; then
  echo "Usage: $0 <email> <team-code>"
  exit 1
fi

cd "$(dirname "$0")/../../mobile"
echo "Assigning $EMAIL to team $CODE..."
npx convex run admin:assignTeam "{\"email\":\"$EMAIL\",\"teamCode\":\"$CODE\"}"
echo "Done."
