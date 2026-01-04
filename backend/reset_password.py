import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load existing env vars (for URL)
load_dotenv()

def reset_password():
    print("🔐 ZippyFit Admin: Password Reset Tool")
    print("---------------------------------------")
    
    # 1. Get Configuration
    url = os.environ.get("SUPABASE_URL")
    if not url:
        print("❌ Error: SUPABASE_URL not found in .env")
        return

    # 2. Get Service Role Key
    # We try to get it from env, otherwise ask user
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not service_key:
        print("\n⚠️  Service Role Key not found in .env.")
        print("   This is required for admin actions (bypassing security).")
        print("   You can find it in Supabase Dashboard -> Project Settings -> API -> service_role (secret)")
        service_key = input("\n🔑 Please paste your SUPABASE_SERVICE_ROLE_KEY: ").strip()
    
    if not service_key:
        print("❌ Error: Service key is required.")
        return

    # 3. Initialize Admin Client
    try:
        # verify=False is sometimes needed if SSL certs are missing in dev, generally defaults are fine
        supabase: Client = create_client(url, service_key)
    except Exception as e:
        print(f"❌ Error initializing Supabase: {e}")
        return

    # 4. Get User Details
    email = input("\n👤 Enter the user's email: ").strip()
    new_password = input("🔑 Enter new password: ").strip()

    if not email or not new_password:
        print("❌ Error: Email and Password are required.")
        return

    print(f"\n⏳ Attempting to reset password for {email}...")

    # 5. Perform Update
    try:
        # Supabase Admin API to update user
        user = supabase.auth.admin.update_user_by_id(
            uid=get_user_id_by_email(supabase, email),
            attributes={"password": new_password}
        )
        print("\n✅ SUCCESS! Password updated.")
        print(f"User {email} can now log in with the new password.")
        
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        # Only works if we have the ID, let's try a direct update if possible or handle generic errors
        if "User not found" in str(e):
             print("   (Double check the email address)")

def get_user_id_by_email(client, email):
    # Depending on the SDK version, getUserById or listUsers might differ.
    # The safest "Admin" way often requires listing or using a specific lookup.
    # supabase-py's auth.admin has list_users
    
    # Simple strategy: List users and find match (not efficient for millions, fine for 10)
    # OR better: supabase.auth.admin.get_user_by_id() requires ID.
    # But we only have email. 
    # Let's try to search by email if strictly needed, but update_user_by_id requires ID.
    # Actually, recent supabase-py doesn't have update_user_by_email clearly exposed in all versions.
    # Let's rely on list_users() filtering.
    
    # Attempt to list users
    try:
        users = client.auth.admin.list_users()
        for u in users:
            if u.email == email:
                return u.id
    except:
        pass
        
    raise Exception(f"Could not find user with email {email}")

if __name__ == "__main__":
    reset_password()
