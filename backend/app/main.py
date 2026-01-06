import random
import string
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Supabase Setup
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- FITNESS FACTS GRIMOIRE ---
FITNESS_FACTS = [
    {"id": 1, "title": "The Gatorade Myth", "text": "Wait! Don't drink that Gatorade yet. Unless you trained for 60+ minutes, water is better. Sugar spikes kill fat oxidation post-workout."},
    {"id": 2, "title": "Sleep is Anabolic", "text": "Muscles don't grow in the gym; they grow in bed. Sleeping less than 7 hours drops testosterone by up to 15%."},
    {"id": 3, "title": "Protein Timing", "text": "The 'Anabolic Window' is 24 hours wide. Total daily protein matters more than chugging a shake 30 seconds after your last rep."},
    {"id": 4, "title": "Grip Strength", "text": "Grip strength is one of the strongest predictors of longevity. A weak handshake correlates with higher mortality risk."},
    {"id": 5, "title": "Creatine is King", "text": "Creatine isn't a steroid. It's the most researched supplement on earth. It boosts brain function as much as it boosts muscle."},
    {"id": 6, "title": "Walking vs Running", "text": "Walking 10k steps burns almost as many calories as a 5k run, but with zero cortisol spike. Perfect for fat loss."},
    {"id": 7, "title": "The 80/20 Rule", "text": "You can't out-train a bad diet. 80% of your body composition is determined by what you eat, not how hard you lift."},
    {"id": 8, "title": "Sitting is Smoking", "text": "Sitting for 8+ hours a day cancels out the benefits of a 1-hour workout. Get up every 30 minutes."},
    {"id": 9, "title": "Stretch Under Load", "text": "Static stretching weakens muscles before lifting. Use dynamic warmups or weighted stretches (like deep squats) instead."},
    {"id": 10, "title": "Consistency > Intensity", "text": "A mediocre workout done consistently beats a perfect workout done once a month."},
]

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
    # members = client.table("profiles").select("id").eq("team_id", team_id).execute()
    # if len(members.data) >= 2:
    #     raise HTTPException(status_code=400, detail="Team is full!")

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
        
        # --- STREAK FREEZE LOGIC ---
        freezes = team_data.get('freezes_available', 0) or 0
        
        if freezes > 0:
            # SAVE THEM!
            print(f"❄️ FREEZE DEPLOYED! Team {team_data['id']} saved by freeze.")
            # Use 1 freeze
            new_freezes = freezes - 1
            # Simulate they did it yesterday to stop the decay loop
            yesterday_iso = (now - timedelta(days=1)).isoformat()
            
            client.table("teams").update({
                "freezes_available": new_freezes,
                "last_streak_at": yesterday_iso
            }).eq("id", team_data['id']).execute()
            
            # Update local data for return
            team_data['freezes_available'] = new_freezes
            team_data['last_streak_at'] = yesterday_iso
            return team_data
        # ---------------------------

        # --- REPAIR WINDOW (CRITICAL STATE) ---
        # If we are here, they have NO freezes and missed a day.
        # Check if we are already in critical state
        repair_deadline = team_data.get('repair_deadline')
        
        if repair_deadline:
            # We are already critical. Check if expired.
            deadline_dt = datetime.fromisoformat(repair_deadline.replace('Z', '+00:00'))
            if now > deadline_dt:
                # TIMEOUT! REAL DEATH.
                print(f"💀 CRITICAL FAILURE: Team {team_data['id']} missed repair window.")
                new_hearts = 3
                new_streak = 0
                
                # Reset including clearing deadline
                client.table("teams").update({
                    "hearts": new_hearts,
                    "streak": new_streak,
                    "last_streak_at": (now - timedelta(days=1)).isoformat(),
                    "repair_deadline": None
                }).eq("id", team_data['id']).execute()
                
                team_data['hearts'] = new_hearts
                team_data['streak'] = new_streak
                team_data['repair_deadline'] = None
                return team_data
            else:
                # Still within window. Do not punish yet.
                print(f"⚠️ CRITICAL STATE: Team {team_data['id']} has until {repair_deadline}")
                return team_data
        else:
            # ENTER CRITICAL STATE
            # Grant 24 hours from NOW to repair.
            # Set hearts to 0 to indicate danger (visual only, real death is strict).
            
            new_deadline = (now + timedelta(hours=24)).isoformat()
            print(f"🚨 ENTERING CRITICAL STATE: Team {team_data['id']}. Deadline: {new_deadline}")
            
            client.table("teams").update({
                "hearts": 0,
                "repair_deadline": new_deadline
            }).eq("id", team_data['id']).execute()
            
            team_data['hearts'] = 0
            team_data['repair_deadline'] = new_deadline
            return team_data
        # --------------------------------------
        
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
    
    # --- MEMBER COUNT CHECK ---
    members_req = client.table("profiles").select("id", count="exact").eq("team_id", team_id).execute()
    member_count = members_req.count if members_req.count else len(members_req.data)
    
    # DYNAMIC STATUS: Safe only if EVERYONE is done
    team_completion_count = len(finished_user_ids)
    all_done = team_completion_count >= member_count
    
    team_status = "SAFE" if all_done else "AT_RISK"

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
        "member_count": member_count,
        "team_completion_count": team_completion_count, # <--- NEW
        "hearts": team_data['hearts'],
        "streak": team_data['streak'],
        "freezes_available": team_data.get('freezes_available', 0) or 0,
        "status": team_status,
        "user_completed_today": user_done,
        "partner_completed_today": all_done, # Deprecated concept, mapped to "all done" for legacy
        "nudge_active": nudge_active,
        "nudge_at": last_nudge if nudge_active else None,
        "spot_requester_id": team_data.get('spot_requester_id'),
        "spot_date": team_data.get('spot_date'),
        "repair_deadline": team_data.get('repair_deadline'),
        "boss_hp": team_data.get('boss_hp', 10000),
        "boss_max_hp": team_data.get('boss_max_hp', 10000),
        "boss_name": team_data.get('boss_name', 'The Sloth King'),
        "boss_image_index": team_data.get('boss_image_index', 0)
    }

# 4. Update 'log_workout' to save the Date
@app.post("/workout")
def log_workout(auth: tuple = Depends(get_authenticated_client)):
    user_id, client = auth
    profile = client.table("profiles").select("team_id").eq("id", user_id).execute()
    team_id = profile.data[0]['team_id']
    
    payload = {}
    try:
        # Pydantic/FastAPI might have consumed body already? 
        # Actually in this setup we are not using a Pydantic model for body in the signature
        # We need to read the body.
        # But 'log_workout' signature above doesn't take a Request object.
        # WAIT: Previous tools edits might have messed up the signature.
        # Let's assume standard FastAPI Request usage or dependency if we want body.
        # The previous successful edits didn't show the signature change to include Request.
        # However, checking the file previously, we saw:
        # def log_workout(auth: tuple = Depends(get_authenticated_client), payload: dict = Body(...)):
        # Ah, I need to check the current signature in the file to be safe.
        pass
    except:
        pass

    # RE-READING line 296 from context provided in Step 831:
    # def log_workout(auth: tuple = Depends(get_authenticated_client)):
    # This refuses the body payload! I need to fix the signature to accept the body.
    return {"error": "Signature mismatch in previous context, fixing now"} 

# WAIT, I see I cannot change the signature in this tool call easily if I don't see it fully.
# The previous `log_workout` context (Step 832) shows lines 296+.
# It seems I might have defined it without `request: Request` or a Pydantic model?
# Actually, the previously applied edits were applied to `log_workout`.
# Let's look at the `log_workout` definition again in Step 831.
# Line 296: def log_workout(auth: tuple = Depends(get_authenticated_client)):
# If I want to read `payload`, I need to add it to the signature!
# But wait, specific editing instructions were used previously.
# Let's rely on FastAPI features. I will add `payload: dict = Body(...)` to signature.

@app.post("/workout")
def log_workout(
    auth: tuple = Depends(get_authenticated_client), 
    payload: dict = Body(...)
):
    user_id, client = auth
    profile = client.table("profiles").select("team_id").eq("id", user_id).execute()
    team_id = profile.data[0]['team_id']

    client.table("workouts").insert({ "user_id": user_id, "team_id": team_id }).execute()

    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%d 00:00:00+00")
    workouts_req = client.table("workouts").select("user_id").eq("team_id", team_id).gte("created_at", today_start).execute()
    unique_users = {w['user_id'] for w in workouts_req.data}

    status = "logged"
    
    # --- GET MEMBER COUNT ---
    members_req = client.table("profiles").select("id", count="exact").eq("team_id", team_id).execute()
    member_count = members_req.count if members_req.count else len(members_req.data)
    
    # --- SPOT ME LOGIC ---
    # Check if there is an active spot request for TODAY
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Optimizing queries: fetch team header once
    team_res = client.table("teams").select("*").eq("id", team_id).execute()
    if not team_res.data:
         return {"error": "Team not found"}
    team_data_header = team_res.data[0]
    
    spot_date = team_data_header.get('spot_date')
    spot_requester = team_data_header.get('spot_requester_id')

    if spot_date == today_str and spot_requester and spot_requester != user_id:
        # User is spotting their partner! 
        # We auto-log a workout for the partner so the streak counts.
        print(f"🦸 SPOT HERO: {user_id} is spotting {spot_requester}")
        client.table("workouts").insert({ "user_id": spot_requester, "team_id": team_id, "is_spot_fill": True }).execute()
        
        # Re-fetch unique users
        workouts_req = client.table("workouts").select("user_id").eq("team_id", team_id).gte("created_at", today_start).execute()
        unique_users = {w['user_id'] for w in workouts_req.data}

    # MATCH MEMBER COUNT
    if len(unique_users) >= member_count:
        # Fetch current streak AND freezes AND repair_deadline AND boss_hp
        current_streak = team_data_header['streak']
        current_freezes = team_data_header.get('freezes_available', 0) or 0
        
        new_streak = current_streak + 1
        
        # Streak Freeze Earning Logic: Every 10 days
        if new_streak > 0 and new_streak % 10 == 0:
            current_freezes += 1
            print(f"❄️ FREEZE EARNED! Team {team_id} has {current_freezes} freezes.")
        
        # CHECK FOR REPAIR
        current_deadline = team_data_header.get('repair_deadline')
        
        update_payload = {
            "streak": new_streak,
            "freezes_available": current_freezes,
            "last_streak_at": datetime.now(timezone.utc).isoformat(),
            "last_nudge_at": None,
            "nudge_from_id": None,
            "spot_date": None,
            "spot_requester_id": None
        }
        
        if current_deadline:
             print(f"❤️‍🩹 PENANCE COMPLETE! Team {team_id} repaired the streak.")
             update_payload["repair_deadline"] = None
             update_payload["hearts"] = 3
        
        # --- BOSS BATTLE LOGIC ---
        damage = payload.get('damage', 0)
        
        if not damage:
            duration_minutes = payload.get('duration_minutes', 0)
            if isinstance(duration_minutes, int) and duration_minutes > 0:
                damage = duration_minutes * 10
        
        if damage > 0:
             print(f"⚔️ BOSS DAMAGE: {damage}")
        
        # 2. Apply Damage (if boss is alive)
        current_boss_hp = team_data_header.get('boss_hp', 10000) or 10000
        if current_boss_hp > 0 and damage > 0:
            new_boss_hp = max(0, current_boss_hp - damage)
            update_payload['boss_hp'] = new_boss_hp
            print(f"👹 BOSS: {current_boss_hp} -> {new_boss_hp}")
            
            if new_boss_hp == 0:
                print("🏆 BOSS DEFEATED!")
             
        client.table("teams").update(update_payload).eq("id", team_id).execute()
        
        status = "streak_incremented"

    # --- SECRET SCROLL UNLOCK LOGIC ---
    # Check if this was the FIRST workout of the day for this user
    todays_workouts = client.table("workouts").select("id", count="exact").eq("user_id", user_id).gte("created_at", today_start).execute()
    count_today = todays_workouts.count if todays_workouts.count is not None else len(todays_workouts.data)
    
    new_fact = None
    if count_today == 1: # First one!
        # 1. Get unlocked IDs
        try:
            unlocked_res = client.table("user_facts").select("fact_id").eq("user_id", user_id).execute()
            unlocked_ids = {row['fact_id'] for row in unlocked_res.data}
            
            # 2. Find unlocked candidates
            candidates = [f for f in FITNESS_FACTS if f['id'] not in unlocked_ids]
            
            if candidates:
                # 3. Pick one
                # Seed with today's date so it's consistent if they retry, OR random? 
                # Random is more fun for "gacha" feel.
                fact_to_unlock = random.choice(candidates)
                
                # 4. Save to DB
                client.table("user_facts").insert({
                    "user_id": user_id,
                    "fact_id": fact_to_unlock['id']
                }).execute()
                
                new_fact = fact_to_unlock
                print(f"📜 SCROLL UNLOCKED: {fact_to_unlock['title']}")
        except Exception as e:
            print(f"⚠️ Error unlocking fact (Table missing?): {e}")

    return {"status": "success", "event": status, "new_fact": new_fact}

# --- NEW: Request a Spot Endpoint ---
@app.post("/team/spot")
def request_spot(auth: tuple = Depends(get_authenticated_client)):
    user_id, client = auth
    profile = client.table("profiles").select("team_id").eq("id", user_id).execute()
    if not profile.data or not profile.data[0]['team_id']:
        raise HTTPException(status_code=400, detail="No team found")
    
    team_id = profile.data[0]['team_id']
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    client.table("teams").update({
        "spot_requester_id": user_id,
        "spot_date": today_str
    }).eq("id", team_id).execute()

    return {"message": "Spot requested"}

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
    import re

    user_id, client = auth
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    challenge_text = "No challenge available today!"

    # 1. Try to fetch specific challenge for today
    specific = client.table("challenges").select("text").eq("date", today_str).execute()
    
    if specific.data:
        challenge_text = specific.data[0]['text']
    else:
        # 2. Fallback: Get a random one from the pool (where date is null)
        pool = client.table("challenges").select("text").is_("date", "null").execute()
        
        if pool.data:
            # Use a stable hash of the date so all users see the SAME fallback challenge today
            hash_val = 0
            for char in today_str:
                hash_val = ord(char) + ((hash_val << 5) - hash_val)
            
            index = abs(hash_val) % len(pool.data)
            challenge_text = pool.data[index]['text']

    # 3. Parse for Countable Data
    # Regex to find "Action N Unit" or "N Unit"
    # Examples: "20 Pushups", "Run 5km", "Do 50 Squats"
    
    base_count = 0
    unit = ""
    
    # Match number
    match = re.search(r'(\d+)', challenge_text)
    if match:
        base_count = int(match.group(1))
        # Remove number from text to find unit? Or just send full text.
        # Simple heuristic for unit:
        # If text is "20 Pushups", unit is "Pushups"
        parts = challenge_text.split()
        for p in parts:
             if not any(char.isdigit() for char in p) and p.lower() not in ["do", "run", "complete"]:
                  # This is a weak heuristic but works for "20 Pushups" -> "Pushups"
                  # ideally we just pass the text and let UI handle, but user asked for "set number"
                  unit = p
                  # refine unit logic if needed later
    
    return {
        "text": challenge_text, 
        "base_count": base_count, 
        "unit": unit
    }

# --- NEW: Grimoire Endpoint ---
@app.get("/grimoire")
def get_grimoire(auth: tuple = Depends(get_authenticated_client)):
    user_id, client = auth
    
    # 1. Get user's unlocked IDs
    try:
        unlocked_res = client.table("user_facts").select("fact_id, created_at").eq("user_id", user_id).execute()
        unlocked_map = {row['fact_id']: row['created_at'] for row in unlocked_res.data}
    except Exception as e:
        print(f"⚠️ Error fetching grimoire: {e}")
        return []

    # 2. Build response
    library = []
    for fact in FITNESS_FACTS:
        is_unlocked = fact['id'] in unlocked_map
        if is_unlocked:
            library.append({
                **fact,
                "unlocked_at": unlocked_map[fact['id']],
                "status": "unlocked"
            })
        else:
             # Option: Show locked items as "???"
             library.append({
                 "id": fact['id'],
                 "title": "???",
                 "text": "This knowledge is sealed.",
                 "status": "locked"
             })
             
    # Sort: Unlocked first (by date desc), then locked
    library.sort(key=lambda x: (x['status'] == 'locked', x.get('unlocked_at', '')))
    
    return library
