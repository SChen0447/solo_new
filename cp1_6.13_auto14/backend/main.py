from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
SHOPS_FILE = os.path.join(DATA_DIR, "shops.json")
APPOINTMENTS_FILE = os.path.join(DATA_DIR, "appointments.json")


def read_json(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(file_path, data):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class Service(BaseModel):
    id: str
    name: str
    price: float


class Shop(BaseModel):
    id: int
    name: str
    rating: float
    address: str
    services: List[Service]


class AppointmentCreate(BaseModel):
    shop_id: int
    shop_name: str
    service_id: str
    service_name: str
    date: str
    time: str
    pet_name: str
    pet_id: Optional[int] = None


class Appointment(BaseModel):
    id: int
    shop_id: int
    shop_name: str
    service_id: str
    service_name: str
    date: str
    time: str
    pet_name: str
    pet_id: Optional[int] = None
    created_at: str


@app.get("/shops", response_model=List[Shop])
async def get_shops():
    return read_json(SHOPS_FILE)


@app.get("/shops/{shop_id}", response_model=Shop)
async def get_shop(shop_id: int):
    shops = read_json(SHOPS_FILE)
    shop = next((s for s in shops if s["id"] == shop_id), None)
    if not shop:
        raise HTTPException(status_code=404, detail="店铺未找到")
    return shop


@app.get("/slots/{shop_id}")
async def get_slots(shop_id: int, date: str):
    appointments = read_json(APPOINTMENTS_FILE)
    booked_slots = [
        a["time"] for a in appointments
        if a["shop_id"] == shop_id and a["date"] == date
    ]

    slots = []
    for hour in range(9, 18):
        time_str = f"{hour:02d}:00"
        slots.append({
            "time": time_str,
            "available": time_str not in booked_slots
        })

    return {"slots": slots}


@app.post("/appointments", response_model=Appointment)
async def create_appointment(appointment: AppointmentCreate):
    appointments = read_json(APPOINTMENTS_FILE)

    for a in appointments:
        if (a["shop_id"] == appointment.shop_id and
                a["date"] == appointment.date and
                a["time"] == appointment.time):
            raise HTTPException(status_code=400, detail="该时段已被预约")

    new_id = max([a["id"] for a in appointments], default=0) + 1
    new_appointment = {
        "id": new_id,
        "shop_id": appointment.shop_id,
        "shop_name": appointment.shop_name,
        "service_id": appointment.service_id,
        "service_name": appointment.service_name,
        "date": appointment.date,
        "time": appointment.time,
        "pet_name": appointment.pet_name,
        "pet_id": appointment.pet_id,
        "created_at": datetime.now().isoformat()
    }

    appointments.append(new_appointment)
    write_json(APPOINTMENTS_FILE, appointments)

    return new_appointment


@app.get("/appointments", response_model=List[Appointment])
async def get_appointments():
    appointments = read_json(APPOINTMENTS_FILE)
    sorted_appointments = sorted(
        appointments,
        key=lambda a: f"{a['date']} {a['time']}",
        reverse=True
    )
    return sorted_appointments


@app.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: int):
    appointments = read_json(APPOINTMENTS_FILE)
    appointment = next((a for a in appointments if a["id"] == appointment_id), None)

    if not appointment:
        raise HTTPException(status_code=404, detail="预约未找到")

    appointments = [a for a in appointments if a["id"] != appointment_id]
    write_json(APPOINTMENTS_FILE, appointments)

    return {"message": "预约已取消"}
