import requests
import sys

# CONFIG
API_URL = "http://127.0.0.1:8000"
USER_A_ID = "test_user_alpha"
USER_B_ID = "test_user_beta"

def log(msg, color="white"):
    colors = {"green": "\033[92m", "red": "\033[91m", "blue": "\033[94m", "white": "\033[0m"}
    print(f"{colors.get(color, '')}{msg}\033[0m")

def reset_team():
    # Helper to clean slate (Direct DB manipulation would be safer but this is a quick simulation)
    # Using a "Leave Team" or "Reset" workaround if available, otherwise just assuming clean slate for now.
    log("⚠️ Note: This script assumes a clean state or idempotent operations.", "blue")

def test_full_flow():
    log("🚀 STARTING: Full Flow Test", "blue")

    # 1. Dashboard Check
    log("1. Checking Dashboard for User A...", "white")
    try:
        res = requests.get(f"{API_URL}/dashboard", headers={"Authorization": USER_A_ID})
        if res.status_code == 200:
            log(f"   Success: {res.json()}", "green")
        else:
            log(f"   Failed: {res.status_code}", "red")
    except Exception as e:
        log(f"   Connection Error: {e}", "red")
        return

    # 2. Simulate Nudge
    log("2. User A Nudges User B...", "white")
    res = requests.post(f"{API_URL}/team/nudge", headers={"Authorization": USER_A_ID})
    if res.status_code == 200:
        log("   Nudge Sent ✅", "green")
    else:
        log(f"   Nudge Failed: {res.text}", "red")

    # Verify Nudge Active
    res = requests.get(f"{API_URL}/dashboard", headers={"Authorization": USER_B_ID})
    if res.json().get('nudge_active'):
        log("   Verified: User B sees Nudge ✅", "green")
    else:
        log("   Error: Nudge not active for User B ❌", "red")

    # 3. Both Complete Workout
    log("3. Completing Workouts...", "white")
    requests.post(f"{API_URL}/workout", headers={"Authorization": USER_A_ID})
    log("   User A Done.", "green")
    
    # Check intermediate state (User A Done, B Sleeping)
    res = requests.get(f"{API_URL}/dashboard", headers={"Authorization": USER_A_ID})
    status = res.json().get('status')
    log(f"   User A Status: {status} (Expected: AT_RISK or similar logic depending on view)", "white")

    requests.post(f"{API_URL}/workout", headers={"Authorization": USER_B_ID})
    log("   User B Done (Streak Increment Trigger).", "green")

    # 4. Verify SAFE State & Nudge Cleared
    log("4. Verifying Final State...", "white")
    res = requests.get(f"{API_URL}/dashboard", headers={"Authorization": USER_B_ID})
    data = res.json()
    
    if data.get('status') == 'SAFE':
        log("   Status: SAFE ✅", "green")
    else:
        log(f"   Status: {data.get('status')} ❌", "red")

    if not data.get('nudge_active'):
        log("   Nudge Cleared: YES ✅", "green")
    else:
        log("   Nudge Cleared: NO ❌ (Bug found!)", "red")

if __name__ == "__main__":
    test_full_flow()
