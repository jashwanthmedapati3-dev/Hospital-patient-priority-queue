"""
Hospital Emergency Department — Patient Priority Queue Management System
Main FastAPI Application

Endpoints:
  POST   /api/auth/register
  POST   /api/auth/login
  GET    /api/auth/me

  POST   /api/patients                  — Register + enqueue
  GET    /api/patients                  — All patients
  GET    /api/patients/:id              — Single patient
  PATCH  /api/patients/:id/status       — Update status

  GET    /api/queue                     — Sorted queue
  GET    /api/queue/next                — Peek (heap root)
  POST   /api/queue/treat-next          — Extract max → start treatment
  POST   /api/queue/escalate/:id        — Update priority (escalation)
  DELETE /api/queue/:id                 — Remove from queue
  GET    /api/queue/heap-structure      — Heap array + tree for visualizer

  GET    /api/history                   — Queue event history
  GET    /api/analytics                 — Dashboard analytics
  POST   /api/ai-assistant              — AI assistant queries
"""

import os
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from heap import BinaryMaxHeap, HeapNode
from priority_engine import calculate_priority_score
from auth import hash_password, verify_password, create_token, decode_token
import database as db

# ── Global Heap Instance ─────────────────────────────────────────────────
heap = BinaryMaxHeap()

# Track treated / completed patients separately
treated_patients: dict[str, dict] = {}


# ── Lifespan ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    # Seed test accounts
    seed_users()
    seed_patients_if_empty()
    # Reload waiting patients from DB into heap
    reload_heap_from_db()
    yield
    db.close_db()


app = FastAPI(title="Hospital ER Queue System", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Models ─────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "Nurse"
    full_name: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


class PatientCreate(BaseModel):
    name: str
    age: int = 30
    gender: str = "Other"
    phone: str = ""
    symptoms: list[str] = []
    emergency_level: str = "MEDIUM"
    vitals: dict = {}


class EscalateRequest(BaseModel):
    new_level: str = "CRITICAL"
    reason: str = ""


class StatusUpdate(BaseModel):
    status: str


class AIQuery(BaseModel):
    query: str


# ── Auth Dependency ──────────────────────────────────────────────────────
def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(401, "Missing authorization header")
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid or expired token")
    return payload


# ── Doctors Mock Store ──────────────────────────────────────────────────
DOCTORS = [
    {
        "id": "doc-1",
        "name": "Dr. Sarah Jenkins",
        "specialty": "Emergency Medicine / Triage Lead",
        "status": "Available",
        "treated_count": 5,
        "avatar": "SJ",
    },
    {
        "id": "doc-2",
        "name": "Dr. Marcus Chen",
        "specialty": "Trauma Surgery",
        "status": "Busy",
        "treated_count": 4,
        "avatar": "MC",
        "note": "1 active in surgery"
    },
    {
        "id": "doc-3",
        "name": "Dr. Elena Rostova",
        "specialty": "Critical Care / Cardiology",
        "status": "Available",
        "treated_count": 6,
        "avatar": "ER",
    },
    {
        "id": "doc-4",
        "name": "Dr. David Miller",
        "specialty": "Internal Medicine / Pediatrics",
        "status": "Available",
        "treated_count": 3,
        "avatar": "DM",
    },
]


# ── Seed Data ────────────────────────────────────────────────────────────
def seed_users():
    accounts = [
        ("admin", "admin123", "Admin", "System Administrator"),
        ("doctor", "doctor123", "Doctor", "Dr. Marcus Chen"),
        ("nurse", "nurse123", "Nurse", "Nurse Emily Davis"),
        ("reception", "reception123", "Receptionist", "James Wilson"),
    ]
    for username, password, role, full_name in accounts:
        if not db.find_user(username):
            db.create_user(username, hash_password(password), role, full_name)


def seed_patients_if_empty():
    """Seed patients matching trauma center reference queue if empty."""
    existing = db.get_all_patients()
    if existing:
        return
    now = time.time()
    initial_patients = [
        {
            "patient_id": "PT-1001",
            "name": "James Wilson",
            "age": 62,
            "gender": "Male",
            "phone": "(555) 234-5678",
            "emergency_level": "CRITICAL",
            "priority_score": 98,
            "condition": "Acute Coronary Syndrome",
            "clinical_notes": "Crushing retrosternal chest pain radiating to left jaw, diaphoresis, dyspnea",
            "score_explanation": "Crushing retrosternal chest pain radiating to left jaw, diaphoresis, dyspnea",
            "priority_label": "Priority 5 — Critical",
            "assigned_md": "Dr. Elena Rostova",
            "arrival_time": now - 78 * 60,
            "status": "WAITING",
            "symptoms": ["Acute Coronary Syndrome", "Chest pain", "Dyspnea"],
            "vitals": {"heart_rate": 115, "blood_pressure": "165/95", "spo2": 92, "temperature": 37.1}
        },
        {
            "patient_id": "PT-1002",
            "name": "Amira Patel",
            "age": 28,
            "gender": "Female",
            "phone": "(555) 345-6789",
            "emergency_level": "CRITICAL",
            "priority_score": 95,
            "condition": "Penetrating Trauma & Severe Hemorrhage",
            "clinical_notes": "Active hemorrhage from torso penetration, profound hemorrhagic shock risk",
            "score_explanation": "Penetrating Trauma & Severe Hemorrhage",
            "priority_label": "P5 Critical",
            "assigned_md": "Dr. Marcus Chen",
            "arrival_time": now - 58 * 60,
            "status": "WAITING",
            "symptoms": ["Penetrating Trauma", "Severe Hemorrhage"],
            "vitals": {"heart_rate": 132, "blood_pressure": "84/52", "spo2": 94, "temperature": 36.4}
        },
        {
            "patient_id": "PT-1003",
            "name": "Carlos Gomez",
            "age": 34,
            "gender": "Male",
            "phone": "(555) 456-7890",
            "emergency_level": "HIGH",
            "priority_score": 82,
            "condition": "Acute Abdomen / Suspected Appendicitis",
            "clinical_notes": "Right lower quadrant severe rebound tenderness, fever, leukocytosis",
            "score_explanation": "Acute Abdomen / Suspected Appendicitis",
            "priority_label": "P4 Very Urgent",
            "assigned_md": "Dr. Sarah Jenkins",
            "arrival_time": now - 48 * 60,
            "status": "WAITING",
            "symptoms": ["Severe abdominal pain", "Fever", "Peritoneal irritation"],
            "vitals": {"heart_rate": 98, "blood_pressure": "128/82", "spo2": 98, "temperature": 38.6}
        },
        {
            "patient_id": "PT-1004",
            "name": "Robert Fox",
            "age": 45,
            "gender": "Male",
            "phone": "(555) 567-8901",
            "emergency_level": "MEDIUM",
            "priority_score": 68,
            "condition": "Severe Pyelonephritis / Early Sepsis",
            "clinical_notes": "High fever with shaking chills, flank pain, systemic bacteremia concern",
            "score_explanation": "Severe Pyelonephritis / Early Sepsis",
            "priority_label": "P3 Urgent",
            "assigned_md": "Dr. David Miller",
            "arrival_time": now - 58 * 60,
            "status": "WAITING",
            "symptoms": ["High fever", "Costovertebral flank pain", "Chills"],
            "vitals": {"heart_rate": 104, "blood_pressure": "110/70", "spo2": 97, "temperature": 39.2}
        },
        {
            "patient_id": "PT-1005",
            "name": "Chloe Bennett",
            "age": 19,
            "gender": "Female",
            "phone": "(555) 678-9012",
            "emergency_level": "LOW",
            "priority_score": 45,
            "condition": "Anterior Shoulder Dislocation",
            "clinical_notes": "Acute traumatic anterior dislocation, deformity noted, neurovascular intact",
            "score_explanation": "Anterior Shoulder Dislocation",
            "priority_label": "P2 Moderate",
            "assigned_md": "Dr. Sarah Jenkins",
            "arrival_time": now - 83 * 60,
            "status": "WAITING",
            "symptoms": ["Shoulder pain", "Deformity post fall"],
            "vitals": {"heart_rate": 84, "blood_pressure": "122/78", "spo2": 99, "temperature": 36.8}
        },
        {
            "patient_id": "PT-1006",
            "name": "Liam O'Connor",
            "age": 52,
            "gender": "Male",
            "phone": "(555) 789-0123",
            "emergency_level": "LOW",
            "priority_score": 35,
            "condition": "Complex Forearm Laceration",
            "clinical_notes": "5cm forearm laceration, bleeding controlled, requires wound closure",
            "score_explanation": "Complex Forearm Laceration",
            "priority_label": "P2 Moderate",
            "assigned_md": "Dr. David Miller",
            "arrival_time": now - 25 * 60,
            "status": "WAITING",
            "symptoms": ["Forearm laceration"],
            "vitals": {"heart_rate": 76, "blood_pressure": "124/80", "spo2": 99, "temperature": 36.7}
        }
    ]

    discharged_patients = [
        {"patient_id": "PT-0995", "name": "Emma Watson", "age": 41, "gender": "Female", "emergency_level": "MEDIUM", "priority_score": 58, "condition": "Acute Migraine with Aura", "status": "COMPLETED", "arrival_time": now - 180 * 60, "completion_time": now - 40 * 60},
        {"patient_id": "PT-0996", "name": "Daniel Craig", "age": 55, "gender": "Male", "emergency_level": "HIGH", "priority_score": 79, "condition": "Supraventricular Tachycardia", "status": "COMPLETED", "arrival_time": now - 160 * 60, "completion_time": now - 50 * 60},
        {"patient_id": "PT-0997", "name": "Maya Lin", "age": 29, "gender": "Female", "emergency_level": "LOW", "priority_score": 38, "condition": "Ankle Sprain Grade II", "status": "COMPLETED", "arrival_time": now - 150 * 60, "completion_time": now - 65 * 60},
        {"patient_id": "PT-0998", "name": "Victor Vance", "age": 67, "gender": "Male", "emergency_level": "CRITICAL", "priority_score": 92, "condition": "Acute Ischemic Stroke", "status": "COMPLETED", "arrival_time": now - 210 * 60, "completion_time": now - 80 * 60},
        {"patient_id": "PT-0999", "name": "Sofia Hernandez", "age": 8, "gender": "Female", "emergency_level": "HIGH", "priority_score": 75, "condition": "Febrile Convulsion", "status": "COMPLETED", "arrival_time": now - 140 * 60, "completion_time": now - 30 * 60},
    ]

    for p in initial_patients + discharged_patients:
        db.save_patient(p)


def reload_heap_from_db():
    """Reload WAITING patients from MongoDB into the in-memory heap on startup."""
    patients = db.get_all_patients()
    for p in patients:
        if p.get("status") == "WAITING":
            node = HeapNode(
                patient_id=p["patient_id"],
                name=p["name"],
                priority_score=p.get("priority_score", 50),
                arrival_time=p.get("arrival_time", time.time()),
                emergency_level=p.get("emergency_level", "MEDIUM"),
                status="WAITING",
                age=p.get("age", 30),
                gender=p.get("gender", ""),
                phone=p.get("phone", ""),
                symptoms=p.get("symptoms", []),
                vitals=p.get("vitals", {}),
                score_explanation=p.get("score_explanation", ""),
                condition=p.get("condition", ""),
                assigned_md=p.get("assigned_md", "Dr. Elena Rostova"),
                clinical_notes=p.get("clinical_notes", ""),
                priority_label=p.get("priority_label", ""),
            )
            heap.insert(node)
        elif p.get("status") in ("IN_TREATMENT", "COMPLETED", "CANCELLED"):
            treated_patients[p["patient_id"]] = p


# ═══════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ═══════════════════════════════════════════════════════════════════════
@app.post("/api/auth/register")
def register(req: RegisterRequest):
    if db.find_user(req.username):
        raise HTTPException(400, "Username already exists")
    hashed = hash_password(req.password)
    db.create_user(req.username, hashed, req.role, req.full_name)
    token = create_token({"username": req.username, "role": req.role, "full_name": req.full_name})
    return {"token": token, "username": req.username, "role": req.role, "full_name": req.full_name}


@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = db.find_user(req.username)
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token({"username": user["username"], "role": user["role"],
                          "full_name": user["full_name"]})
    return {"token": token, "username": user["username"], "role": user["role"],
            "full_name": user["full_name"]}


@app.get("/api/auth/me")
def me(user=Depends(get_current_user)):
    return user


# ═══════════════════════════════════════════════════════════════════════
# PATIENT ROUTES
# ═══════════════════════════════════════════════════════════════════════
@app.post("/api/patients")
def register_patient(req: PatientCreate, user=Depends(get_current_user)):
    patient_id = f"P-{uuid.uuid4().hex[:8].upper()}"
    arrival_time = time.time()

    score, explanation = calculate_priority_score(
        req.emergency_level, req.age, req.vitals, req.symptoms
    )

    node = HeapNode(
        patient_id=patient_id,
        name=req.name,
        priority_score=score,
        arrival_time=arrival_time,
        emergency_level=req.emergency_level.upper(),
        status="WAITING",
        age=req.age,
        gender=req.gender,
        phone=req.phone,
        symptoms=req.symptoms,
        vitals=req.vitals,
        score_explanation=explanation,
    )

    ops = heap.insert(node)

    patient_dict = node.to_dict()
    db.save_patient(patient_dict)
    db.log_event(patient_id, "PATIENT_REGISTERED",
                 f"{req.name} registered with {req.emergency_level} priority")
    db.log_event(patient_id, "ADDED_TO_QUEUE",
                 f"Score: {score} | {explanation}")

    return {
        "patient": patient_dict,
        "operations": ops,
        "heap": heap.get_heap_structure(),
    }


@app.get("/api/patients")
def list_patients(user=Depends(get_current_user)):
    all_p = db.get_all_patients()
    return {"patients": all_p}


@app.get("/api/patients/{patient_id}")
def get_patient(patient_id: str, user=Depends(get_current_user)):
    p = db.get_patient(patient_id)
    if not p:
        raise HTTPException(404, "Patient not found")
    return p


@app.patch("/api/patients/{patient_id}/status")
def update_status(patient_id: str, req: StatusUpdate, user=Depends(get_current_user)):
    p = db.get_patient(patient_id)
    if not p:
        raise HTTPException(404, "Patient not found")
    db.update_patient_status(patient_id, req.status)
    db.log_event(patient_id, f"PATIENT_{req.status}", f"Status changed to {req.status}")
    return {"message": "Status updated", "patient_id": patient_id, "status": req.status}


# ═══════════════════════════════════════════════════════════════════════
# QUEUE ROUTES
# ═══════════════════════════════════════════════════════════════════════
@app.get("/api/queue")
def get_queue(user=Depends(get_current_user)):
    sorted_patients = heap.get_sorted_patients()
    return {
        "queue": sorted_patients,
        "size": heap.size,
        "heap_structure": heap.get_heap_structure(),
    }


@app.get("/api/queue/next")
def peek_next(user=Depends(get_current_user)):
    top = heap.peek()
    if not top:
        return {"next_patient": None}
    return {"next_patient": top.to_dict()}


@app.post("/api/queue/treat-next")
def treat_next(user=Depends(get_current_user)):
    top, ops = heap.extract_max()
    if not top:
        raise HTTPException(404, "Queue is empty")
    patient_dict = top.to_dict()
    patient_dict["status"] = "IN_TREATMENT"
    patient_dict["treatment_start_time"] = time.time()
    treated_patients[top.patient_id] = patient_dict

    db.update_patient_fields(top.patient_id, {
        "status": "IN_TREATMENT",
        "treatment_start_time": time.time(),
    })
    db.log_event(top.patient_id, "PATIENT_TREATED",
                 f"Treatment started for {top.name} (Score: {top.priority_score})")

    return {
        "treated_patient": patient_dict,
        "operations": ops,
        "heap": heap.get_heap_structure(),
    }


@app.post("/api/queue/complete/{patient_id}")
def complete_treatment(patient_id: str, user=Depends(get_current_user)):
    if patient_id in treated_patients:
        treated_patients[patient_id]["status"] = "COMPLETED"
        treated_patients[patient_id]["completion_time"] = time.time()
    db.update_patient_fields(patient_id, {
        "status": "COMPLETED",
        "completion_time": time.time(),
    })
    db.log_event(patient_id, "PATIENT_COMPLETED", "Treatment completed")
    return {"message": "Treatment completed", "patient_id": patient_id}


@app.post("/api/queue/escalate/{patient_id}")
def escalate_patient(patient_id: str, req: EscalateRequest, user=Depends(get_current_user)):
    patient_data = heap.find_patient(patient_id)
    if not patient_data:
        raise HTTPException(404, "Patient not found in queue")

    new_score, new_explanation = calculate_priority_score(
        req.new_level,
        patient_data.get("age", 30),
        patient_data.get("vitals", {}),
        patient_data.get("symptoms", []),
    )

    success, ops = heap.update_priority(patient_id, new_score, req.new_level, new_explanation)
    if not success:
        raise HTTPException(500, "Failed to update priority")

    db.update_patient_fields(patient_id, {
        "priority_score": new_score,
        "emergency_level": req.new_level,
        "score_explanation": new_explanation,
    })
    db.log_event(patient_id, "EMERGENCY_ESCALATED",
                 f"Escalated to {req.new_level} | New score: {new_score} | Reason: {req.reason}")

    return {
        "patient_id": patient_id,
        "new_score": new_score,
        "new_level": req.new_level,
        "explanation": new_explanation,
        "operations": ops,
        "heap": heap.get_heap_structure(),
    }


@app.delete("/api/queue/{patient_id}")
def remove_from_queue(patient_id: str, user=Depends(get_current_user)):
    removed, ops = heap.remove(patient_id)
    if not removed:
        raise HTTPException(404, "Patient not found in queue")
    db.update_patient_status(patient_id, "CANCELLED")
    db.log_event(patient_id, "PATIENT_CANCELLED", f"{removed.name} removed from queue")
    return {
        "removed_patient": removed.to_dict(),
        "operations": ops,
        "heap": heap.get_heap_structure(),
    }


@app.get("/api/queue/heap-structure")
def get_heap_structure(user=Depends(get_current_user)):
    return heap.get_heap_structure()


@app.post("/api/queue/defer/{patient_id}")
def defer_patient(patient_id: str, user=Depends(get_current_user)):
    p = heap.find_patient(patient_id)
    if not p:
        raise HTTPException(404, "Patient not found in queue")
    new_score = max(10, p.get("priority_score", 50) - 20)
    success, ops = heap.update_priority(
        patient_id, new_score, p.get("emergency_level", "LOW"),
        "Patient deferred/delayed by triage physician"
    )
    db.update_patient_fields(patient_id, {"priority_score": new_score})
    db.log_event(patient_id, "PATIENT_DEFERRED", f"{p.get('name')} deferred to score {new_score}")
    return {"message": "Patient deferred", "operations": ops, "heap": heap.get_heap_structure()}


@app.post("/api/queue/override/{patient_id}")
def override_patient(patient_id: str, user=Depends(get_current_user)):
    p = heap.find_patient(patient_id)
    if not p:
        raise HTTPException(404, "Patient not found in queue")
    success, ops = heap.update_priority(
        patient_id, 100, "CRITICAL",
        "Clinical physician priority override — expedited to top of heap"
    )
    db.update_patient_fields(patient_id, {
        "priority_score": 100,
        "emergency_level": "CRITICAL",
        "priority_label": "P5 Critical"
    })
    db.log_event(patient_id, "CLINICAL_OVERRIDE", f"Urgent priority override for {p.get('name')}")
    return {"message": "Clinical override applied", "operations": ops, "heap": heap.get_heap_structure()}


# ═══════════════════════════════════════════════════════════════════════
# DOCTORS & STAFF ROUTES
# ═══════════════════════════════════════════════════════════════════════
@app.get("/api/doctors")
def get_doctors(user=Depends(get_current_user)):
    return {"doctors": DOCTORS}


@app.post("/api/doctors/{doc_id}/toggle")
def toggle_doctor_status(doc_id: str, user=Depends(get_current_user)):
    for d in DOCTORS:
        if d["id"] == doc_id or d["name"].lower() == doc_id.lower():
            d["status"] = "Busy" if d["status"] == "Available" else "Available"
            return {"doctor": d, "doctors": DOCTORS}
    raise HTTPException(404, "Doctor not found")



# ═══════════════════════════════════════════════════════════════════════
# HISTORY ROUTES
# ═══════════════════════════════════════════════════════════════════════
@app.get("/api/history")
def get_history(event_type: Optional[str] = None,
                patient_id: Optional[str] = None,
                user=Depends(get_current_user)):
    history = db.get_queue_history(event_type=event_type, patient_id=patient_id)
    return {"history": history}


# ═══════════════════════════════════════════════════════════════════════
# ANALYTICS ROUTES
# ═══════════════════════════════════════════════════════════════════════
@app.get("/api/analytics")
def get_analytics(user=Depends(get_current_user)):
    data = db.get_analytics_data()
    return data


# ═══════════════════════════════════════════════════════════════════════
# AI ASSISTANT
# ═══════════════════════════════════════════════════════════════════════
@app.post("/api/ai-assistant")
def ai_assistant(req: AIQuery, user=Depends(get_current_user)):
    query = req.query.lower().strip()
    sorted_q = heap.get_sorted_patients()
    all_patients = db.get_all_patients()

    response = ""

    if "next" in query or "who should be treated" in query or "treat next" in query:
        top = heap.peek()
        if top:
            d = top.to_dict()
            response = (
                f"🚨 **Next Patient: {d['name']}** (ID: {d['patient_id']})\n\n"
                f"- **Priority Score:** {d['priority_score']}/100\n"
                f"- **Emergency Level:** {d['emergency_level']}\n"
                f"- **Score Breakdown:** {d['score_explanation']}\n\n"
                f"**Reason:** This patient has the highest priority score in the queue. "
                f"The Binary Max Heap guarantees O(1) access to the highest-priority patient."
            )
        else:
            response = "✅ The queue is currently empty. No patients are waiting."

    elif "critical" in query and ("how many" in query or "count" in query or "waiting" in query):
        critical = [p for p in sorted_q if p.get("emergency_level") == "CRITICAL"]
        response = (
            f"🔴 **{len(critical)} Critical Patient(s) Currently Waiting**\n\n"
        )
        for i, p in enumerate(critical, 1):
            response += f"{i}. {p['name']} — Score: {p['priority_score']} | {p['score_explanation']}\n"
        if not critical:
            response += "No critical patients in the queue at this time."

    elif "longest" in query or "waiting the longest" in query:
        if sorted_q:
            import time as _t
            longest = None
            max_wait = 0
            for p in sorted_q:
                wait = _t.time() - p.get("arrival_time", _t.time())
                if wait > max_wait:
                    max_wait = wait
                    longest = p
            if longest:
                mins = int(max_wait // 60)
                response = (
                    f"⏳ **Longest Waiting Patient: {longest['name']}** "
                    f"(ID: {longest['patient_id']})\n\n"
                    f"- **Waiting Time:** {mins} minute(s)\n"
                    f"- **Emergency Level:** {longest['emergency_level']}\n"
                    f"- **Priority Score:** {longest['priority_score']}\n"
                )
        else:
            response = "✅ No patients currently waiting in the queue."

    elif "suggest" in query or "spo2" in query or "adjust" in query or "priority" in query:
        low_spo2 = [p for p in sorted_q
                    if p.get("vitals", {}).get("spo2", 100) < 94
                    and p.get("emergency_level") != "CRITICAL"]
        if low_spo2:
            response = "⚠️ **Priority Adjustment Suggestions:**\n\n"
            for p in low_spo2:
                spo2 = p.get("vitals", {}).get("spo2", "N/A")
                response += (
                    f"- **{p['name']}** (SpO2: {spo2}%) — Currently {p['emergency_level']}. "
                    f"Consider escalating to CRITICAL.\n"
                )
        else:
            response = "✅ All patients with low SpO2 are already marked as CRITICAL."

    elif "summary" in query or "status" in query or "overview" in query:
        waiting = len(sorted_q)
        in_treatment = len([p for p in all_patients if p.get("status") == "IN_TREATMENT"])
        completed = len([p for p in all_patients if p.get("status") == "COMPLETED"])
        response = (
            f"📊 **Queue Overview:**\n\n"
            f"- **Waiting:** {waiting} patient(s)\n"
            f"- **In Treatment:** {in_treatment} patient(s)\n"
            f"- **Completed:** {completed} patient(s)\n"
            f"- **Total Registered:** {len(all_patients)} patient(s)\n"
        )
        if waiting > 0:
            levels = {}
            for p in sorted_q:
                lvl = p.get("emergency_level", "UNKNOWN")
                levels[lvl] = levels.get(lvl, 0) + 1
            response += "\n**By Emergency Level:**\n"
            for lvl in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
                if lvl in levels:
                    response += f"- {lvl}: {levels[lvl]}\n"

    elif "heap" in query or "algorithm" in query or "how" in query:
        response = (
            "🏗️ **Algorithm: Binary Max Heap**\n\n"
            "The queue uses a custom Binary Max Heap stored in an array.\n\n"
            "**Key Operations:**\n"
            "- `insert()`: O(log n) — Add patient, sift up to maintain heap property\n"
            "- `extract_max()`: O(log n) — Remove highest priority, sift down\n"
            "- `peek()`: O(1) — View next patient without removal\n"
            "- `update_priority()`: O(log n) — Escalate and re-heapify\n\n"
            f"**Current Heap Size:** {heap.size} node(s)\n"
            f"**Heap Height:** {_heap_height(heap.size)} level(s)\n"
        )

    else:
        response = (
            "🤖 **ER Queue AI Assistant**\n\n"
            "I can help with:\n"
            "- \"Who should be treated next and why?\"\n"
            "- \"How many critical patients are waiting?\"\n"
            "- \"Which patient has been waiting the longest?\"\n"
            "- \"Suggest priority adjustment based on SpO2\"\n"
            "- \"Give me a queue status summary\"\n"
            "- \"How does the heap algorithm work?\"\n"
        )

    return {"response": response, "queue_size": heap.size}


def _heap_height(n):
    if n == 0:
        return 0
    h = 0
    while (1 << h) <= n:
        h += 1
    return h


# ═══════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════
@app.get("/api/health")
def health():
    return {"status": "ok", "queue_size": heap.size}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
