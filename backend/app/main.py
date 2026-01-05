import random
import string
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.auth import get_authenticated_client
from app.schemas import JoinRequest, TeamResponse
from datetime import datetime, timezone, timedelta

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:8080", "http://127.0.0.1:8081", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HELPER: Generate Invite Code ---
def generate_code(length=4):
    """Generates a random string like 'A7X2'"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

# --- ENDPOINT 1: Create a Team ---
@app.post("/team/create", response_model=TeamResponse)
def create_team(auth: tuple = Depends(get_authenticated_client)):
    user_id, client = auth

    # 1. Check if user is already in a team
    user_data = client.table("profiles").select("team_id").eq("id", user_id).execute()
    
    # --- SELF-HEALING: Create Profile if missing ---
    if not user_data.data:
        print(f"🛠️ FIX: Creating missing profile for {user_id}")
        # Insert minimal profile so we can proceed
        client.table("profiles").insert({"id": user_id}).execute()
        # Re-fetch (should be empty team_id)
        user_data = client.table("profiles").select("team_id").eq("id", user_id).execute()
    # -----------------------------------------------

    # If the profile exists AND has a team_id
    if user_data.data and user_data.data[0].get('team_id'):
         raise HTTPException(status_code=400, detail="You are already in a team!")

    # 2. Generate Code & Create Team
    code = generate_code()
    team_data = {
        "code": code,
        "name": "Untitled Duo",
        "hearts": 3,
        "streak": 0
    }
    result = client.table("teams").insert(team_data).execute()
    new_team_id = result.data[0]['id']

    # 3. Link User to Team
    update_response = client.table("profiles").update({"team_id": new_team_id}).eq("id", user_id).execute()

    # 4. CRITICAL CHECK: Did the update work?
    if not update_response.data:
        print(f"🚨 ERROR: User {user_id} has no profile row even after fix attempt!")
        raise HTTPException(
            status_code=500, 
            detail="Profile missing. Please run the SQL fix in Supabase."
        )

    return {"team_id": new_team_id, "code": code, "message": "Team Created"}

# --- ENDPOINT 2: Join a Team ---
@app.post("/team/join", response_model=TeamResponse)
def join_team(req: JoinRequest, auth: tuple = Depends(get_authenticated_client)):
    user_id, client = auth

    # 1. Find team by code
    # Note: We use .upper() to make it case-insensitive
    response = client.table("teams").select("id").eq("code", req.code.upper()).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    team_id = response.data[0]['id']

    # 2. Check if team is full (Optional: Limit to 2 people)
    members = client.table("profiles").select("id").eq("team_id", team_id).execute()
    if len(members.data) >= 2:
        raise HTTPException(status_code=400, detail="Team is full!")

    # 3. Join the team
    # --- SELF-HEALING: Ensure profile exists before update ---
    user_data = client.table("profiles").select("id").eq("id", user_id).execute()
    if not user_data.data:
         print(f"🛠️ FIX: Creating missing profile for {user_id} (Join Flow)")
         client.table("profiles").insert({"id": user_id}).execute()
    # ---------------------------------------------------------

    client.table("profiles").update({"team_id": team_id}).eq("id", user_id).execute()

    # 4. Clear any stale nudges so the new user isn't bombarded
    client.table("teams").update({
        "last_nudge_at": None,
        "nudge_from_id": None
    }).eq("id", team_id).execute()

    return {"team_id": team_id, "code": req.code, "message": "Joined successfully"}

def process_heart_decay(client, team_data):
    """
    Checks if the team missed yesterday.
    If so, deducts hearts. If hearts hit 0, reset streak.
    Updates the database but preserves the original 'code' in the return value.
    Note: Requires 'client' to perform the update.
    """
    last_streak_iso = team_data.get('last_streak_at')
    
    # If no date (new team), skip
    if not last_streak_iso:
        return team_data

    # Parse Dates
    last_streak_dt = datetime.fromisoformat(last_streak_iso.replace('Z', '+00:00'))
    now = datetime.now(timezone.utc)
    
    # Calculate difference in days
    diff_days = (now.date() - last_streak_dt.date()).days

    # Logic: 0 or 1 day diff = Good. 2+ days = Missed yesterday.
    if diff_days > 1:
        missed_days = diff_days - 1
        print(f"📉 DECISION: Team {team_data['id']} missed {missed_days} days.")
        
        # Calculate Penalty
        new_hearts = team_data['hearts'] - missed_days
        new_streak = team_data['streak']
        
        if new_hearts <= 0:
            new_hearts = 3      # Reset hearts
            new_streak = 0      # DEATH (Reset Streak)
            print(f"💀 DEATH: Team {team_data['id']} streak reset.")
        
        # Update "Yesterday" so we don't punish them again immediately
        yesterday = (now - timedelta(days=1)).isoformat()
        
        # 1. Update Database (Fire and Forget)
        client.table("teams").update({
            "hearts": new_hearts,
            "streak": new_streak,
            "last_streak_at": yesterday 
        }).eq("id", team_data['id']).execute()
        
        # 2. Update Local Data (Safely)
        # We modify the existing dictionary instead of replacing it.
        # This ensures 'code', 'name', etc. stay safe.
        team_data['hearts'] = new_hearts
        team_data['streak'] = new_streak
        
        return team_data

    # If no penalty, return original data
    return team_data

# 3. Update 'get_dashboard' to use the Helper
@app.get("/dashboard")
def get_dashboard(auth: tuple = Depends(get_authenticated_client)):
    user_id, client = auth

    print(f"🔍 DEBUG: Dashboard request for {user_id}")
    profile = client.table("profiles").select("team_id").eq("id", user_id).execute()
    
    if not profile.data or not profile.data[0]['team_id']:
        print(f"ℹ️ DEBUG: No team found for {user_id}")
        return {"has_team": False, "hearts": 0, "streak": 0, "status": "No Team"}

    team_id = profile.data[0]['team_id']
    print(f"🔍 DEBUG: Fetching Team {team_id}")
    
    team_req = client.table("teams").select("*").eq("id", team_id).execute()
    
    # SAFETY CHECK: Orphaned Team ID?
    if not team_req.data:
        print(f"🚨 ERROR: Profile text claims team {team_id} but it does not exist in 'teams' table!")
        # Self-heal: Remove the bad team_id
        client.table("profiles").update({"team_id": None}).eq("id", user_id).execute()
        return {"has_team": False, "hearts": 0, "streak": 0, "status": "Team Missing (Fixed)"}

    team_data = team_req.data[0]

    # --- NEW: RUN HEALTH CHECK ---
    # This might modify the team data (lower hearts) before we send it back
    team_data = process_heart_decay(client, team_data)
    # -----------------------------

    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%d 00:00:00+00")
    workouts_req = client.table("workouts")\
        .select("user_id")\
        .eq("team_id", team_id)\
        .gte("created_at", today_start)\
        .execute()
    
    finished_user_ids = {w['user_id'] for w in workouts_req.data}
    user_done = user_id in finished_user_ids
    partner_done = len(finished_user_ids) > 1 or (len(finished_user_ids) == 1 and not user_done)
    team_status = "SAFE" if (user_done and partner_done) else "AT_RISK"

    # --- NUDGE CHECK ---
    nudge_active = False
    last_nudge = team_data.get('last_nudge_at')
    nudge_from = team_data.get('nudge_from_id')
    
    if last_nudge and nudge_from and nudge_from != user_id:
        # Check if nudge is recent (e.g., within last 24 hours)
        nudge_dt = datetime.fromisoformat(last_nudge.replace('Z', '+00:00'))
        if (datetime.now(timezone.utc) - nudge_dt).days < 1:
            nudge_active = True

    return {
        "team_id": str(team_id),
        "has_team": True,
        "team_name": team_data['name'],
        "code": team_data['code'],
        "hearts": team_data['hearts'],        # Now reflects the decay
        "streak": team_data['streak'],        # Now reflects the reset
        "status": team_status,
        "user_completed_today": user_done,
        "partner_completed_today": partner_done,
        "nudge_active": nudge_active,
        "nudge_at": last_nudge if nudge_active else None
    }

# 4. Update 'log_workout' to save the Date
@app.post("/workout")
def log_workout(auth: tuple = Depends(get_authenticated_client)):
    user_id, client = auth
    profile = client.table("profiles").select("team_id").eq("id", user_id).execute()
    team_id = profile.data[0]['team_id']

    client.table("workouts").insert({ "user_id": user_id, "team_id": team_id }).execute()

    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%d 00:00:00+00")
    workouts_req = client.table("workouts").select("user_id").eq("team_id", team_id).gte("created_at", today_start).execute()
    unique_users = {w['user_id'] for w in workouts_req.data}

    status = "logged"
    
    if len(unique_users) >= 2:
        current_streak = client.table("teams").select("streak").eq("id", team_id).execute().data[0]['streak']
        
        # UPDATE STREAK + LAST_STREAK_AT + CLEAR NUDGES
        client.table("teams").update({
            "streak": current_streak + 1,
            "last_streak_at": datetime.now(timezone.utc).isoformat(),
            "last_nudge_at": None,  # Clear the nudge
            "nudge_from_id": None
        }).eq("id", team_id).execute()
        
        status = "streak_incremented"

    return {"status": "success", "event": status}

# --- NEW: History Endpoint ---
@app.get("/history")
def get_history(auth: tuple = Depends(get_authenticated_client)):
    user_id, client = auth
    # Simply return all created_at dates for this user
    # We truncate to YYYY-MM-DD
    workouts = client.table("workouts")\
        .select("created_at")\
        .eq("user_id", user_id)\
        .execute()
    
    # Set comprehension to unique dates
    dates = {w['created_at'].split("T")[0] for w in workouts.data}
    return sorted(list(dates))

# --- NEW: Nudge Endpoint ---
@app.post("/team/nudge")
def send_nudge(auth: tuple = Depends(get_authenticated_client)):
    user_id, client = auth
    profile = client.table("profiles").select("team_id").eq("id", user_id).execute()
    if not profile.data or not profile.data[0]['team_id']:
        raise HTTPException(status_code=400, detail="No team found")
    
    team_id = profile.data[0]['team_id']
    
    # Store nudge in team table (simple implementation: updates 'last_nudge_at' and 'nudge_from_id')
    # Use standard ISO format
    now_iso = datetime.now(timezone.utc).isoformat()
    
    client.table("teams").update({
        "last_nudge_at": now_iso,
        "nudge_from_id": user_id
    }).eq("id", team_id).execute()
    
    return {"message": "Nudge sent!"}

# --- NEW: Challenge Endpoint ---
@app.get("/challenge")
def get_challenge(auth: tuple = Depends(get_authenticated_client)):
    user_id, client = auth
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 1. Try to fetch specific challenge for today
    specific = client.table("challenges").select("text").eq("date", today_str).execute()
    
    if specific.data:
        return {"text": specific.data[0]['text']}
    
    # 2. Fallback: Get a random one from the pool (where date is null)
    pool = client.table("challenges").select("text").is_("date", "null").execute()
    
    if pool.data:
        # Use a stable hash of the date so all users see the SAME fallback challenge today
        hash_val = 0
        for char in today_str:
            hash_val = ord(char) + ((hash_val << 5) - hash_val)
        
        index = abs(hash_val) % len(pool.data)
        return {"text": pool.data[index]['text']}
    
    return {"text": "No challenge available today!"}
