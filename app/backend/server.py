
from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId

# ================= ENV =================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# ================= APP =================
app = FastAPI()

@app.get("/")
async def root():
    return {"status": "FASTAPI RUNNING"}

api_router = APIRouter(prefix="/api")

# ================= SERIALIZERS =================
def serialize_client(doc):
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "phone": doc.get("phone", ""),
        "email": doc.get("email", ""),
        "notes": doc.get("notes", ""),
        "created_at": doc.get("created_at"),
    }

def serialize_event(doc):
    return {
        "id": str(doc["_id"]),
        "client_id": doc.get("client_id", ""),
        "client_name": doc.get("client_name", ""),
        "event_name": doc.get("event_name", ""),
        "event_date": doc.get("event_date", ""),
        "event_time": doc.get("event_time", ""),
        "location": doc.get("location", ""),
        "payment_status": doc.get("payment_status", "pending"),
        "payment_amount": doc.get("payment_amount", 0.0),
        "notes": doc.get("notes", ""),
        "reminder_sent_1day": doc.get("reminder_sent_1day", False),
        "reminder_sent_1hour": doc.get("reminder_sent_1hour", False),
        "created_at": doc.get("created_at"),
    }

def safe_id(id_str):
    try:
        return ObjectId(id_str)
    except:
        return None

# ================= MODELS =================
class ClientCreate(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    notes: str = ""

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None

class EventCreate(BaseModel):
    client_id: str
    event_name: str
    event_date: str
    event_time: str
    location: str = ""
    payment_status: str = "pending"
    payment_amount: float = 0.0
    notes: str = ""

# ================= HEALTH =================
@api_router.get("/")
async def api_root():
    return {"message": "Makeup API Working"}

# ================= CLIENTS =================

@api_router.post("/clients")
async def create_client(data: ClientCreate):
    doc = data.dict()
    doc["created_at"] = datetime.utcnow()

    result = await db.clients.insert_one(doc)
    doc["_id"] = result.inserted_id

    return serialize_client(doc)

@api_router.get("/clients")
async def get_clients(search: Optional[str] = None):

    query = {}

    if search:
        query = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
            ]
        }

    clients = await db.clients.find(query).sort("name", 1).to_list(1000)

    return [serialize_client(c) for c in clients]

@api_router.get("/clients/{client_id}")
async def get_client(client_id: str):

    oid = safe_id(client_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid ID")

    client = await db.clients.find_one({"_id": oid})
    if not client:
        raise HTTPException(status_code=404, detail="Not found")

    return serialize_client(client)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str):

    oid = safe_id(client_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid ID")

    result = await db.clients.delete_one({"_id": oid})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")

    return {"message": "Deleted"}

# ================= EVENTS =================

@api_router.post("/events")
async def create_event(data: EventCreate):

    oid = safe_id(data.client_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid client ID")

    client = await db.clients.find_one({"_id": oid})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    doc = data.dict()
    doc["client_name"] = client["name"]
    doc["reminder_sent_1day"] = False
    doc["reminder_sent_1hour"] = False
    doc["created_at"] = datetime.utcnow()

    result = await db.events.insert_one(doc)
    doc["_id"] = result.inserted_id

    return serialize_event(doc)

@api_router.get("/events")
async def get_events(client_id: Optional[str] = None):

    query = {}

    if client_id:
        query["client_id"] = client_id

    events = await db.events.find(query).to_list(1000)

    return [serialize_event(e) for e in events]

# ================= INCLUDE =================
app.include_router(api_router)

# ================= CORS =================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= LOGGING =================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
