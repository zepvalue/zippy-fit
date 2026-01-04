import random
import string
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.auth import get_current_user, supabase
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
# backend/app/main.py
# backend/app/main.py
@app.post("/team/create", response_model=TeamResponse)
def create_team(user_id: str = Depends(get_current_user)):
    # 1. Check if user is already in a team
    user_data = supabase.table("profiles").select("team_id").eq("id", user_id).execute()
    
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
    result = supabase.table("teams").insert(team_data).execute()
    new_team_id = result.data[0]['id']

    # 3. Link User to Team
    update_response = supabase.table("profiles").update({"team_id": new_team_id}).eq("id", user_id).execute()

    # 4. CRITICAL CHECK: Did the update work?
    if not update_response.data:
        print(f"🚨 ERROR: User {user_id} has no profile row!")
        # If we hit this, it means you haven't run the SQL script yet.
        raise HTTPException(
            status_code=500, 
            detail="Profile missing. Please run the SQL fix in Supabase."
        )

    return {"team_id": new_team_id, "code": code, "message": "Team Created"}

# --- ENDPOINT 2: Join a Team ---
@app.post("/team/join", response_model=TeamResponse)
def join_team(req: JoinRequest, user_id: str = Depends(get_current_user)):
    # 1. Find team by code
    # Note: We use .upper() to make it case-insensitive
    response = supabase.table("teams").select("id").eq("code", req.code.upper()).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    team_id = response.data[0]['id']

    # 2. Check if team is full (Optional: Limit to 2 people)
    members = supabase.table("profiles").select("id").eq("team_id", team_id).execute()
    if len(members.data) >= 2:
        raise HTTPException(status_code=400, detail="Team is full!")

    # 3. Join the team
    supabase.table("profiles").update({"team_id": team_id}).eq("id", user_id).execute()

    return {"team_id": team_id, "code": req.code, "message": "Joined successfully"}

# backend/app/main.py

def process_heart_decay(team_data):
    """
    Checks if the team missed yesterday.
    If so, deducts hearts. If hearts hit 0, reset streak.
    Updates the database but preserves the original 'code' in the return value.
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
        supabase.table("teams").update({
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
def get_dashboard(user_id: str = Depends(get_current_user)):
    profile = supabase.table("profiles").select("team_id").eq("id", user_id).execute()
    if not profile.data or not profile.data[0]['team_id']:
        return {"has_team": False, "hearts": 0, "streak": 0, "status": "No Team"}

    team_id = profile.data[0]['team_id']
    team_req = supabase.table("teams").select("*").eq("id", team_id).execute()
    team_data = team_req.data[0]

    # --- NEW: RUN HEALTH CHECK ---
    # This might modify the team data (lower hearts) before we send it back
    team_data = process_heart_decay(team_data)
    # -----------------------------

    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%d 00:00:00+00")
    workouts_req = supabase.table("workouts")\
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
        "nudge_active": nudge_active
    }

# 4. Update 'log_workout' to save the Date
@app.post("/workout")
def log_workout(user_id: str = Depends(get_current_user)):
    profile = supabase.table("profiles").select("team_id").eq("id", user_id).execute()
    team_id = profile.data[0]['team_id']

    supabase.table("workouts").insert({ "user_id": user_id, "team_id": team_id }).execute()

    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%d 00:00:00+00")
    workouts_req = supabase.table("workouts").select("user_id").eq("team_id", team_id).gte("created_at", today_start).execute()
    unique_users = {w['user_id'] for w in workouts_req.data}

    status = "logged"
    
    if len(unique_users) >= 2:
        current_streak = supabase.table("teams").select("streak").eq("id", team_id).execute().data[0]['streak']
        
        # UPDATE STREAK + LAST_STREAK_AT
        supabase.table("teams").update({
            "streak": current_streak + 1,
            "last_streak_at": datetime.now(timezone.utc).isoformat() 
        }).eq("id", team_id).execute()
        
        status = "streak_incremented"

    return {"status": "success", "event": status}

# --- NEW: History Endpoint ---
@app.get("/history")
def get_history(user_id: str = Depends(get_current_user)):
    # Simply return all created_at dates for this user
    # We truncate to YYYY-MM-DD
    workouts = supabase.table("workouts")\
        .select("created_at")\
        .eq("user_id", user_id)\
        .execute()
    
    # Set comprehension to unique dates
    dates = {w['created_at'].split("T")[0] for w in workouts.data}
    return sorted(list(dates))

# --- NEW: Nudge Endpoint ---
@app.post("/team/nudge")
def send_nudge(user_id: str = Depends(get_current_user)):
    profile = supabase.table("profiles").select("team_id").eq("id", user_id).execute()
    if not profile.data or not profile.data[0]['team_id']:
        raise HTTPException(status_code=400, detail="No team found")
    
    team_id = profile.data[0]['team_id']
    
    # Store nudge in team table (simple implementation: updates 'last_nudge_at' and 'nudge_from_id')
    # Use standard ISO format
    now_iso = datetime.now(timezone.utc).isoformat()
    
    supabase.table("teams").update({
        "last_nudge_at": now_iso,
        "nudge_from_id": user_id
    }).eq("id", team_id).execute()
    
    return {"message": "Nudge sent!"}