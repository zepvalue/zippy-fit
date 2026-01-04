# backend/app/auth.py
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

# Global Client (for admin/anon operations if needed, currently used for everything -> BAD for RLS)
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# Define the security scheme (Bearer Token)
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Deprecated: Use get_authenticated_client instead.
    Only checks basic validity but doesn't solve RLS.
    """
    token = credentials.credentials
    try:
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user.id
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_authenticated_client(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Returns a tuple: (user_id, authenticated_supabase_client)
    This client sends the user's token in headers, satisfying RLS policies.
    """
    token = credentials.credentials
    try:
        # 1. Verify User
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
             raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = user_response.user.id
        
        # 2. Create Scoped Client
        # We assume supabase-py supports the 'headers' override in ClientOptions or simply pass it to postgrest.
        # However, re-creating the client is the safest way to ensure state isolation.
        
        # Note: If 'key' is the ANON key, we just add the Authorization header.
        scoped_client = create_client(url, key, options={'headers': {'Authorization': f'Bearer {token}'}})
        
        return user_id, scoped_client

    except Exception as e:
        print(f"Auth Error (Scoped): {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
