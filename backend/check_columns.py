from app.auth import supabase
import sys

try:
    print("Checking 'teams' table columns...")
    # Try to select the specific columns. If they don't exist, PostgREST usually errors.
    res = supabase.table("teams").select("last_nudge_at,nudge_from_id").limit(1).execute()
    print("✅ Columns exist! Result:", res.data)
except Exception as e:
    print("❌ Error selecting columns (likely missing):", e)
