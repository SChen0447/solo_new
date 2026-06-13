import json
import os
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

app = FastAPI(title="问诊小助手 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")


def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class Department(BaseModel):
    id: str
    name: str
    color: str
    icon: str
    description: str


class Doctor(BaseModel):
    id: str
    departmentId: str
    name: str
    title: str
    avatar: str
    slots: List[str]


class AppointmentCreate(BaseModel):
    doctorId: str
    departmentId: str
    patientName: str = Field(..., min_length=1, max_length=50)
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$")
    slot: str
    note: Optional[str] = Field(None, max_length=100)


class AppointmentStatusUpdate(BaseModel):
    status: str


class Appointment(BaseModel):
    id: str
    doctorId: str
    departmentId: str
    patientName: str
    phone: str
    slot: str
    note: Optional[str]
    status: str
    createdAt: str


@app.get("/departments")
async def get_departments():
    data = load_data()
    return {"departments": data["departments"]}


@app.get("/doctors")
async def get_doctors(departmentId: Optional[str] = None):
    data = load_data()
    doctors = data["doctors"]
    if departmentId:
        doctors = [d for d in doctors if d["departmentId"] == departmentId]
    return {"doctors": doctors}


@app.post("/appointments", status_code=201)
async def create_appointment(appointment: AppointmentCreate):
    data = load_data()

    doctor = next((d for d in data["doctors"] if d["id"] == appointment.doctorId), None)
    if not doctor:
        raise HTTPException(status_code=404, detail="医生不存在")

    if appointment.slot not in doctor["slots"]:
        raise HTTPException(status_code=400, detail="该时段不可预约")

    for existing in data["appointments"]:
        if (
            existing["doctorId"] == appointment.doctorId
            and existing["slot"] == appointment.slot
            and existing["status"] not in ["已取消"]
        ):
            raise HTTPException(status_code=409, detail="该时段已被预约")

    new_appointment = {
        "id": f"apt{int(datetime.now().timestamp() * 1000)}",
        "doctorId": appointment.doctorId,
        "departmentId": appointment.departmentId,
        "patientName": appointment.patientName,
        "phone": appointment.phone,
        "slot": appointment.slot,
        "note": appointment.note,
        "status": "待确认",
        "createdAt": datetime.now().isoformat(),
    }

    data["appointments"].append(new_appointment)
    save_data(data)

    return {"appointment": new_appointment}


@app.get("/appointments")
async def get_appointments(doctorId: Optional[str] = None, status: Optional[str] = None):
    data = load_data()
    appointments = data["appointments"]

    if doctorId:
        appointments = [a for a in appointments if a["doctorId"] == doctorId]
    if status:
        status_list = status.split(",")
        appointments = [a for a in appointments if a["status"] in status_list]

    appointments.sort(key=lambda x: x["createdAt"], reverse=True)

    doctors_map = {d["id"]: d for d in data["doctors"]}
    depts_map = {d["id"]: d for d in data["departments"]}

    result = []
    for apt in appointments:
        doctor = doctors_map.get(apt["doctorId"], {})
        dept = depts_map.get(apt["departmentId"], {})
        result.append({
            **apt,
            "doctorName": doctor.get("name", ""),
            "doctorTitle": doctor.get("title", ""),
            "departmentName": dept.get("name", ""),
        })

    return {"appointments": result}


@app.get("/appointments/stats")
async def get_appointment_stats():
    data = load_data()
    appointments = data["appointments"]
    today = datetime.now().strftime("%Y-%m-%d")

    today_count = 0
    pending_count = 0
    confirmed_count = 0
    cancelled_count = 0

    for apt in appointments:
        created_date = apt["createdAt"][:10]
        if created_date == today:
            today_count += 1
        if apt["status"] == "待确认":
            pending_count += 1
        elif apt["status"] in ["已确认", "已完成"]:
            confirmed_count += 1
        elif apt["status"] == "已取消":
            cancelled_count += 1

    return {
        "stats": {
            "today": today_count,
            "pending": pending_count,
            "confirmed": confirmed_count,
            "cancelled": cancelled_count,
            "total": len(appointments),
        }
    }


@app.patch("/appointments/{appointment_id}/status")
async def update_appointment_status(appointment_id: str, update: AppointmentStatusUpdate):
    valid_statuses = ["待确认", "已确认", "已完成", "已取消"]
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"无效状态，有效值为: {valid_statuses}")

    data = load_data()
    appointment = None
    for apt in data["appointments"]:
        if apt["id"] == appointment_id:
            appointment = apt
            break

    if not appointment:
        raise HTTPException(status_code=404, detail="预约记录不存在")

    appointment["status"] = update.status
    save_data(data)

    return {"appointment": appointment}


@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
