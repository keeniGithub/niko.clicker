from pydantic import BaseModel

class User(BaseModel):
    username: str
    score: int

class ClickRequest(BaseModel):
    username: str
    is_drag: bool = False