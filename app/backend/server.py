from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

@app.get("/")
async def root():
    return {"status": "FASTAPI RUNNING"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper function to convert ObjectId to string
    
def serialize_doc(doc):
    if not doc:
        return None

    return {
        "id": str(doc.get("_id")),
        "name": doc.get("name", ""),
        "phone": doc.get("phone", ""),
        "email": doc.get("email", ""),
        "notes": doc.get("notes", ""),
        "created_at": doc.get("created_at"),
    }
# ==================== CLIENT MODELS ====================
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

class ClientResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: str
    notes: str
    created_at: datetime

# ==================== EVENT MODELS ====================
class EventCreate(BaseModel):
    client_id: str
    event_name: str
    event_date: str  # ISO date string
    event_time: str  # HH:MM format
    location: str = ""
    payment_status: str = "pending"  # pending, partial, paid
    payment_amount: float = 0.0
    notes: str = ""

class EventUpdate(BaseModel):
    client_id: Optional[str] = None
    event_name: Optional[str] = None
    event_date: Optional[str] = None
    event_time: Optional[str] = None
    location: Optional[str] = None
    payment_status: Optional[str] = None
    payment_amount: Optional[float] = None
    notes: Optional[str] = None
    reminder_sent_1day: Optional[bool] = None
    reminder_sent_1hour: Optional[bool] = None

class EventResponse(BaseModel):
    id: str
    client_id: str
    client_name: str
    event_name: str
    event_date: str
    event_time: str
    location: str
    payment_status: str
    payment_amount: float
    notes: str
    reminder_sent_1day: bool
    reminder_sent_1hour: bool
    created_at: datetime

# ==================== CLIENT ENDPOINTS ====================
@api_router.get("/")
async def root():
    return {"message": "Makeup Client Tracker API"}

@api_router.post("/clients", response_model=ClientResponse)
async def create_client(client_data: ClientCreate):
    client_dict = client_data.dict()
    client_dict['created_at'] = datetime.utcnow()

    result = await db.clients.insert_one(client_dict)
    client_dict['id'] = str(result.inserted_id)

    return ClientResponse(**client_dict)

@api_router.get("/clients", response_model=List[ClientResponse])
async def get_clients(search: Optional[str] = None):
    query = {}
    if search:
        query = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        }

    clients = await db.clients.find(query).sort("name", 1).to_list(1000)

    return [serialize_doc(c) for c in clients]

@api_router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str):
    try:
        client = await db.clients.find_one({"_id": ObjectId(client_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid client ID")

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    return ClientResponse(**serialize_doc(client))

@api_router.put("/clients/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, client_data: ClientUpdate):
    try:
        update_data = {k: v for k, v in client_data.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")

        result = await db.clients.update_one(
            {"_id": ObjectId(client_id)},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Client not found")

        client = await db.clients.find_one({"_id": ObjectId(client_id)})
        return ClientResponse(**serialize_doc(client))
    except HTTPException:
        raise
    except:
        raise HTTPException(status_code=400, detail="Invalid client ID")

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str):
    try:
        # Also delete associated events
        await db.events.delete_many({"client_id": client_id})

        result = await db.clients.delete_one({"_id": ObjectId(client_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Client not found")

        return {"message": "Client deleted successfully"}
    except HTTPException:
        raise
    except:
        raise HTTPException(status_code=400, detail="Invalid client ID")

# ==================== EVENT ENDPOINTS ====================
@api_router.post("/events", response_model=EventResponse)
async def create_event(event_data: EventCreate):
    # Verify client exists
    try:
        client = await db.clients.find_one({"_id": ObjectId(event_data.client_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid client ID")

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    event_dict = event_data.dict()
    event_dict['client_name'] = client['name']
    event_dict['reminder_sent_1day'] = False
    event_dict['reminder_sent_1hour'] = False
    event_dict['created_at'] = datetime.utcnow()

    result = await db.events.insert_one(event_dict)
    event_dict['id'] = str(result.inserted_id)

    return EventResponse(**event_dict)

@api_router.get("/events", response_model=List[EventResponse])
async def get_events(client_id: Optional[str] = None, status: Optional[str] = None, upcoming: Optional[bool] = None):
    query = {}

    if client_id:
        query['client_id'] = client_id

    if status:
        query['payment_status'] = status

    if upcoming:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        query['event_date'] = {"$gte": today}

    events = await db.events.find(query).sort([("event_date", 1), ("event_time", 1)]).to_list(1000)
    return [EventResponse(**serialize_doc(e)) for e in events]

@api_router.get("/events/upcoming", response_model=List[EventResponse])
async def get_upcoming_events():
    """Get events that need reminders (within next 24 hours)"""
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")
    tomorrow = (now + timedelta(days=1)).strftime("%Y-%m-%d")

    events = await db.events.find({
        "event_date": {"$in": [today, tomorrow]}
    }).sort([("event_date", 1), ("event_time", 1)]).to_list(1000)

    return [EventResponse(**serialize_doc(e)) for e in events]

@api_router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str):
    try:
        event = await db.events.find_one({"_id": ObjectId(event_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid event ID")

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return EventResponse(**serialize_doc(event))

@api_router.put("/events/{event_id}", response_model=EventResponse)
async def update_event(event_id: str, event_data: EventUpdate):
    try:
        update_data = {k: v for k, v in event_data.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")

        # If client_id is being updated, update client_name too
        if 'client_id' in update_data:
            client = await db.clients.find_one({"_id": ObjectId(update_data['client_id'])})
            if client:
                update_data['client_name'] = client['name']

        result = await db.events.update_one(
            {"_id": ObjectId(event_id)},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")

        event = await db.events.find_one({"_id": ObjectId(event_id)})
        return EventResponse(**serialize_doc(event))
    except HTTPException:
        raise
    except:
        raise HTTPException(status_code=400, detail="Invalid event ID")

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str):
    try:
        result = await db.events.delete_one({"_id": ObjectId(event_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")

        return {"message": "Event deleted successfully"}
    except HTTPException:
        raise
    except:
        raise HTTPException(status_code=400, detail="Invalid event ID")

# ==================== DASHBOARD STATS ====================
@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")

    # Total clients
    total_clients = await db.clients.count_documents({})

    # Total events
    total_events = await db.events.count_documents({})

    # Upcoming events (from today onwards)
    upcoming_events = await db.events.count_documents({"event_date": {"$gte": today}})

    # Payment stats
    pending_payments = await db.events.count_documents({"payment_status": "pending", "event_date": {"$gte": today}})
    partial_payments = await db.events.count_documents({"payment_status": "partial", "event_date": {"$gte": today}})

    # Total revenue (paid events)
    paid_events = await db.events.find({"payment_status": "paid"}).to_list(1000)
    total_revenue = sum(e.get('payment_amount', 0) for e in paid_events)

    # Pending amount
    pending_events = await db.events.find({"payment_status": {"$in": ["pending", "partial"]}}).to_list(1000)
    pending_amount = sum(e.get('payment_amount', 0) for e in pending_events)

    return {
        "total_clients": total_clients,
        "total_events": total_events,
        "upcoming_events": upcoming_events,
        "pending_payments": pending_payments,
        "partial_payments": partial_payments,
        "total_revenue": total_revenue,
        "pending_amount": pending_amount
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
