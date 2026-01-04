from pydantic import BaseModel

class JoinRequest(BaseModel):
    code: str

class TeamResponse(BaseModel):
    team_id: str
    code: str
    message: str