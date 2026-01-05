import requests
import sys
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load Env (Try backend first, then mobile)
load_dotenv("../.env") 
# If not found, try explicit path (assuming we run from zippy-fit root)
if not os.getenv("SUPABASE_URL"):
    load_dotenv("mobile/.env")

# CONFIG
API_URL = "http://127.0.0.1:8000"
SUPABASE_URL = os.getenv("EXPO_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Missing SUPABASE_URL or SUPABASE_KEY. Check .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def log(msg, color="white"):
    colors = {"green": "\033[92m", "red": "\033[91m", "blue": "\033[94m", "white": "\033[0m"}
    print(f"{colors.get(color, '')}{msg}\033[0m")

def get_auth_token(email, password):
    """ Authenticates or creates a test user to get a valid JWT """
    try:
        # Try Login
        res = supabase.auth.sign_in_with_password({"email": email, "password": password})
        return res.session.access_token, res.user.id
    except Exception as e:
        # User might not exist, try Sign Up
        try:
            res = supabase.auth.sign_up({"email": email, "password": password})
            if res.session:
                return res.session.access_token, res.user.id
            else:
                # If email conf is on, this might fail to give a session immediately
                # But for development projects, it's usually auto-confirm or we can't test easily.
                log(f"⚠️ Sign up for {email} initiated but no session returned. Check email confirmation settings.", "red")
                return None, None
        except Exception as signup_err:
            log(f"❌ Auth Failed for {email}: {signup_err}", "red")
            sys.exit(1)

# Authenticate Test Users
log("🔑 Authenticating Test Users...", "blue")
TOKEN_A, ID_A = get_auth_token("zippy_test_a@example.com", "password123")
TOKEN_B, ID_B = get_auth_token("zippy_test_b@example.com", "password123")

if not TOKEN_A or not TOKEN_B:
    log("❌ Failed to get tokens. Exiting.", "red")
    sys.exit(1)

HEADERS_A = {"Authorization": f"Bearer {TOKEN_A}"}
HEADERS_B = {"Authorization": f"Bearer {TOKEN_B}"}

def reset_team():
    # Helper to clean slate (Direct DB manipulation would be safer but this is a quick simulation)
    # Using a "Leave Team" or "Reset" workaround if available, otherwise just assuming clean slate for now.
    log("⚠️ Note: This script assumes a clean state or idempotent operations.", "blue")

def test_full_scenario():
    log("🚀 STARTING: ZippyFit Mega-Test", "blue")

    # ---------------------------------------------------------
    # SCENARIO A: NEW TEAM (Day Start)
    # ---------------------------------------------------------
    log("\n--- SCENARIO A: New Team (Both Sleeping) ---", "blue")
    # Reset/Mock Clean Slate (In a real test, hitting a /reset endpoint would be ideal)
    # check initial state
    res_a = requests.get(f"{API_URL}/dashboard", headers=HEADERS_A)
    status_a = res_a.json().get('status')
    
    if status_a == 'AT_RISK' or status_a == 'SLEEPING': # Depends on if own workout is done. Usually AT_RISK at start.
        log(f"   Initial Status: {status_a} (Expected AT_RISK)", "green")
    else:
        log(f"   Initial Status: {status_a} (Unexpected)", "red")


    # ---------------------------------------------------------
    # SCENARIO B: ONE PERSON DONE (The "At Risk" visual)
    # ---------------------------------------------------------
    log("\n--- SCENARIO B: User A Completes Workout ---", "blue")
    requests.post(f"{API_URL}/workout", headers=HEADERS_A)
    
    res_a = requests.get(f"{API_URL}/dashboard", headers=HEADERS_A)
    data_a = res_a.json()
    
    if data_a.get('user_completed_today') and not data_a.get('partner_completed_today'):
         log("   User A: Ready ✅, Partner: Sleeping 😴", "green")
         if data_a.get('status') == 'AT_RISK':
             log("   Team Status: AT_RISK ✅ (Streak is unsafe)", "green")
         else:
             log(f"   Team Status: {data_a.get('status')} ❌ (Expected AT_RISK)", "red")
    
    # Check User B View
    res_b = requests.get(f"{API_URL}/dashboard", headers=HEADERS_B)
    data_b = res_b.json()
    if data_b.get('partner_completed_today'): # A is partner to B
        log("   User B sees: Partner Ready ✅", "green")
    else:
        log("   User B sees: Partner Sleeping ❌ (Error)", "red")


    # ---------------------------------------------------------
    # SCENARIO D: NUDGE FLOW (Interlude)
    # ---------------------------------------------------------
    log("\n--- SCENARIO D: Nudge Flow ---", "blue")
    log("   User A nudges User B...", "white")
    n_res = requests.post(f"{API_URL}/team/nudge", headers=HEADERS_A)
    if n_res.status_code == 200:
        log("   Nudge Sent ✅", "green")
        
        # Verify B sees it
        res_b = requests.get(f"{API_URL}/dashboard", headers=HEADERS_B)
        if res_b.json().get('nudge_active'):
             log("   User B received Nudge ✅", "green")
        else:
             log("   User B did NOT receive Nudge ❌", "red")
    else:
        log(f"   Nudge Failed: {n_res.text}", "red")


    # ---------------------------------------------------------
    # SCENARIO C: BOTH DONE (Safe + Streak)
    # ---------------------------------------------------------
    log("\n--- SCENARIO C: User B Completes Workout ---", "blue")
    requests.post(f"{API_URL}/workout", headers=HEADERS_B)

    res_b = requests.get(f"{API_URL}/dashboard", headers=HEADERS_B)
    data_b = res_b.json()

    if data_b.get('status') == 'SAFE':
        log("   Team Status: SAFE ✅", "green")
    else:
        log(f"   Team Status: {data_b.get('status')} ❌", "red")

    if data_b.get('streak') > 0:
        log(f"   Streak: {data_b.get('streak')} 🔥", "green")
    
    # Verify Nudge Cleared
    if not data_b.get('nudge_active'):
         log("   Nudge Auto-Cleared: YES ✅", "green")
    else:
         log("   Nudge Auto-Cleared: NO ❌", "red")


if __name__ == "__main__":
    test_full_scenario()
