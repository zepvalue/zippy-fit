# backend/app/auth.py
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from convex import ConvexClient
import os
from dotenv import load_dotenv

load_dotenv()

# Global Client
url = os.environ.get("CONVEX_URL")
if not url:
    print("WARNING: CONVEX_URL not set in .env")
convex = ConvexClient(url or "https://happy-animal-123.convex.cloud")

# Define the security scheme (Bearer Token)
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Deprecated: Use get_authenticated_client instead.
    """
    token = credentials.credentials
    try:
        # We can temporarily apply auth to a client to get user details
        temp_client = ConvexClient(os.environ.get("CONVEX_URL") or "https://happy-animal-123.convex.cloud")
        temp_client.set_auth(token)
        # Using a theoretical 'users:current' query if it exists
        user = temp_client.query("users:current") 
        if not user:
             raise HTTPException(status_code=401, detail="Invalid token")
        return user.get("_id")
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_authenticated_client(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Returns a tuple: (user_id, authenticated_convex_client)
    This creates a ConvexClient instance that has the user's auth token applied.
    """
    token = credentials.credentials
    try:
        scoped_client = ConvexClient(os.environ.get("CONVEX_URL") or "https://happy-animal-123.convex.cloud")
        scoped_client.set_auth(token)
        
        # We could query real user ID here if needed, but the client itself is now authenticated!
        # Assuming Convex backend has a query users:current to validate token
        user = scoped_client.query("users:current")
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        return user.get("_id"), scoped_client

    except Exception as e:
        print(f"Auth Error (Scoped): {e}")
        
        msg = str(e).lower()
        known_auth_errors = ["invalid token", "expired", "missing", "unauthorized", "signature", "json web token", "auth"]
        
        if any(err in msg for err in known_auth_errors):
             raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        print("⚠️ treating unknown error as 503 to prevent logout")
        raise HTTPException(status_code=503, detail="Service Unavailable (Auth Check Failed)")

