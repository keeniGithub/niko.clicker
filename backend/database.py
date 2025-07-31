import os
import json
from typing import Dict, List
from config import DB_FILE

def init_db():
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, "w") as f:
            json.dump({"users": {}}, f)
    else:
        try:
            with open(DB_FILE, "r") as f:
                content = f.read()
                if not content.strip():
                    with open(DB_FILE, "w") as f:
                        json.dump({"users": {}}, f)
                else:
                    json.loads(content)
        except json.JSONDecodeError:
            with open(DB_FILE, "w") as f:
                json.dump({"users": {}}, f)

def read_db() -> Dict:
    init_db()
    with open(DB_FILE, "r") as f:
        return json.load(f)

def write_db(data: Dict):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)

def get_leaderboard() -> List[Dict]:
    db = read_db()
    users = db.get("users", {})
    sorted_users = sorted(users.items(), key=lambda x: x[1].get("score", 0), reverse=True)
    return [{"username": k, "score": v.get("score", 0)} for k, v in sorted_users]

def get_user_position(username: str) -> int:
    leaderboard = get_leaderboard()
    for i, user in enumerate(leaderboard, 1):
        if user["username"] == username:
            return i
    return 0