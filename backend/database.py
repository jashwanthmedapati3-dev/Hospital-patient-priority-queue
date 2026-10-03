"""
Database layer — In-memory storage with optional MongoDB support.

Falls back to in-memory dicts if MongoDB is unavailable.
This makes the app work immediately for hackathon demos without
requiring MongoDB installation.

Collections (simulated):
  - users         : login credentials + roles
  - patients      : patient records
  - queue_history : audit trail of all queue events
"""

import os
import time
from datetime import datetime

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "hospital_er_queue")

_use_mongo = False
_client = None
_db = None

# In-memory stores
_mem_users = {}
_mem_patients = {}
_mem_history = []


def _try_connect_mongo():
    global _use_mongo, _client, _db
    try:
        from pymongo import MongoClient
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        _client.admin.command('ping')  # test connection
        _db = _client[DB_NAME]
        _db.users.create_index("username", unique=True)
        _db.patients.create_index("patient_id", unique=True)
        _db.queue_history.create_index("timestamp")
        _use_mongo = True
        print("[OK] Connected to MongoDB")
    except Exception as e:
        _use_mongo = False
        print(f"[WARN] MongoDB not available. Using in-memory storage.")


def get_db():
    global _db
    if _db is None and not _use_mongo:
        _try_connect_mongo()
    return _db


def close_db():
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None


# Initialize on import
_try_connect_mongo()


# ── Users ────────────────────────────────────────────────────────────────
def create_user(username, hashed_password, role, full_name):
    doc = {
        "username": username,
        "password": hashed_password,
        "role": role,
        "full_name": full_name,
        "created_at": datetime.utcnow().isoformat(),
    }
    if _use_mongo:
        try:
            _db.users.insert_one(doc.copy())
        except Exception:
            pass  # duplicate
    else:
        _mem_users[username] = doc.copy()
    return doc


def find_user(username):
    if _use_mongo:
        return _db.users.find_one({"username": username}, {"_id": 0})
    return _mem_users.get(username)


# ── Patients ─────────────────────────────────────────────────────────────
def save_patient(patient_dict):
    if _use_mongo:
        _db.patients.update_one(
            {"patient_id": patient_dict["patient_id"]},
            {"$set": patient_dict},
            upsert=True,
        )
    else:
        _mem_patients[patient_dict["patient_id"]] = patient_dict.copy()


def get_patient(patient_id):
    if _use_mongo:
        return _db.patients.find_one({"patient_id": patient_id}, {"_id": 0})
    return _mem_patients.get(patient_id)


def get_all_patients():
    if _use_mongo:
        return list(_db.patients.find({}, {"_id": 0}))
    return list(_mem_patients.values())


def update_patient_status(patient_id, status):
    if _use_mongo:
        _db.patients.update_one(
            {"patient_id": patient_id},
            {"$set": {"status": status}},
        )
    else:
        if patient_id in _mem_patients:
            _mem_patients[patient_id]["status"] = status


def update_patient_fields(patient_id, fields: dict):
    if _use_mongo:
        _db.patients.update_one(
            {"patient_id": patient_id},
            {"$set": fields},
        )
    else:
        if patient_id in _mem_patients:
            _mem_patients[patient_id].update(fields)


# ── Queue History ────────────────────────────────────────────────────────
def log_event(patient_id, event_type, details=""):
    doc = {
        "patient_id": patient_id,
        "event_type": event_type,
        "details": details,
        "timestamp": datetime.utcnow().isoformat(),
    }
    if _use_mongo:
        _db.queue_history.insert_one(doc.copy())
    else:
        _mem_history.append(doc.copy())
    return doc


def get_queue_history(event_type=None, patient_id=None, limit=200):
    if _use_mongo:
        query = {}
        if event_type:
            query["event_type"] = event_type
        if patient_id:
            query["patient_id"] = patient_id
        cursor = _db.queue_history.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit)
        return list(cursor)
    else:
        results = _mem_history.copy()
        if event_type:
            results = [r for r in results if r["event_type"] == event_type]
        if patient_id:
            results = [r for r in results if r["patient_id"] == patient_id]
        results.sort(key=lambda x: x["timestamp"], reverse=True)
        return results[:limit]


def get_analytics_data():
    """Aggregate analytics from patients collection."""
    patients = get_all_patients()

    level_counts = {}
    status_counts = {"WAITING": 0, "IN_TREATMENT": 0, "COMPLETED": 0, "CANCELLED": 0}
    waiting_times = {"CRITICAL": [], "HIGH": [], "MEDIUM": [], "LOW": []}
    hourly_volume = {}

    for p in patients:
        level = p.get("emergency_level", "LOW")
        level_counts[level] = level_counts.get(level, 0) + 1

        status = p.get("status", "WAITING")
        if status in status_counts:
            status_counts[status] += 1

        arrival = p.get("arrival_time", 0)
        if arrival:
            wait_min = (time.time() - arrival) / 60
            if level in waiting_times:
                waiting_times[level].append(wait_min)

            hour_key = datetime.fromtimestamp(arrival).strftime("%H:00")
            hourly_volume[hour_key] = hourly_volume.get(hour_key, 0) + 1

    avg_waiting = {}
    for level, times in waiting_times.items():
        avg_waiting[level] = round(sum(times) / len(times), 1) if times else 0

    return {
        "level_counts": level_counts,
        "status_counts": status_counts,
        "avg_waiting_times": avg_waiting,
        "hourly_volume": hourly_volume,
        "total_patients": len(patients),
    }
