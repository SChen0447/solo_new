import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Venue, Equipment, Reservation, TimeSlot } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const readJsonFile = <T>(filename: string): T => {
  const filePath = path.join(dataDir, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
};

const writeJsonFile = <T>(filename: string, data: T): void => {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const isTimeInSlot = (time: string, slot: string): boolean => {
  const [slotStart, slotEnd] = slot.split('-');
  return time >= slotStart && time < slotEnd;
};

const generateTimeSlots = (venue: Venue, date: string): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const reservations = readJsonFile<Reservation[]>('reservations.json');
  const venueReservations = reservations.filter(
    r => r.venueId === venue.id && r.date === date && r.status !== 'cancelled'
  );

  for (let hour = 0; hour < 24; hour++) {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    const nextHour = `${(hour + 1).toString().padStart(2, '0')}:00`;
    
    let status: TimeSlot['status'] = 'available';
    
    for (const maintenance of venue.maintenanceSlots) {
      if (isTimeInSlot(time, maintenance)) {
        status = 'maintenance';
        break;
      }
    }
    
    if (status === 'available') {
      for (const reservation of venueReservations) {
        if (time >= reservation.startTime && time < reservation.endTime) {
          status = 'booked';
          break;
        }
      }
    }
    
    slots.push({ time: `${time}-${nextHour}`, status });
  }
  
  return slots;
};

app.get('/api/venues', (req: Request, res: Response) => {
  const { type, search } = req.query;
  let venues = readJsonFile<Venue[]>('venues.json');
  
  if (type && type !== 'all') {
    venues = venues.filter(v => v.type === type);
  }
  
  if (search) {
    const keyword = (search as string).toLowerCase();
    venues = venues.filter(v => 
      v.name.toLowerCase().includes(keyword) || 
      v.location.toLowerCase().includes(keyword)
    );
  }
  
  res.json(venues.slice(0, 50));
});

app.get('/api/venues/:id', (req: Request, res: Response) => {
  const venues = readJsonFile<Venue[]>('venues.json');
  const venue = venues.find(v => v.id === req.params.id);
  
  if (!venue) {
    return res.status(404).json({ error: '场地不存在' });
  }
  
  res.json(venue);
});

app.get('/api/venues/:id/slots', (req: Request, res: Response) => {
  const { date } = req.query;
  const venues = readJsonFile<Venue[]>('venues.json');
  const venue = venues.find(v => v.id === req.params.id);
  
  if (!venue) {
    return res.status(404).json({ error: '场地不存在' });
  }
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  const slots = generateTimeSlots(venue, targetDate as string);
  
  res.json(slots);
});

app.get('/api/equipment', (req: Request, res: Response) => {
  const equipment = readJsonFile<Equipment[]>('equipment.json');
  res.json(equipment);
});

app.post('/api/reservations/check', (req: Request, res: Response) => {
  const { venueId, date, startTime, endTime } = req.body;
  const reservations = readJsonFile<Reservation[]>('reservations.json');
  
  const hasConflict = reservations.some(r => 
    r.venueId === venueId && 
    r.date === date && 
    r.status !== 'cancelled' &&
    !(endTime <= r.startTime || startTime >= r.endTime)
  );
  
  res.json({ hasConflict });
});

app.post('/api/reservations', (req: Request, res: Response) => {
  const { 
    userId, venueId, venueName, date, startTime, endTime, 
    contact, remark, equipment, totalPrice, totalDeposit 
  } = req.body;
  
  const reservations = readJsonFile<Reservation[]>('reservations.json');
  
  const hasConflict = reservations.some(r => 
    r.venueId === venueId && 
    r.date === date && 
    r.status !== 'cancelled' &&
    !(endTime <= r.startTime || startTime >= r.endTime)
  );
  
  if (hasConflict) {
    return res.status(409).json({ error: '该时段已被占用，请选择其他时段' });
  }
  
  const equipmentData = readJsonFile<Equipment[]>('equipment.json');
  for (const item of equipment) {
    const eq = equipmentData.find(e => e.id === item.equipmentId);
    if (!eq || eq.stock < item.quantity) {
      return res.status(400).json({ error: `器材 ${item.name} 库存不足` });
    }
    eq.stock -= item.quantity;
  }
  writeJsonFile('equipment.json', equipmentData);
  
  const reservation: Reservation = {
    id: uuidv4(),
    userId,
    venueId,
    venueName,
    date,
    startTime,
    endTime,
    contact,
    remark,
    equipment,
    totalPrice,
    totalDeposit,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };
  
  reservations.push(reservation);
  writeJsonFile('reservations.json', reservations);
  
  res.status(201).json(reservation);
});

app.get('/api/reservations/user/:userId', (req: Request, res: Response) => {
  const reservations = readJsonFile<Reservation[]>('reservations.json');
  const userReservations = reservations
    .filter(r => r.userId === req.params.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json(userReservations);
});

app.delete('/api/reservations/:id', (req: Request, res: Response) => {
  const reservations = readJsonFile<Reservation[]>('reservations.json');
  const index = reservations.findIndex(r => r.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: '预约不存在' });
  }
  
  const reservation = reservations[index];
  
  const startTime = new Date(`${reservation.date}T${reservation.startTime}`);
  const now = new Date();
  const hoursDiff = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursDiff < 24) {
    return res.status(400).json({ error: '预约开始前24小时内不可取消' });
  }
  
  const equipmentData = readJsonFile<Equipment[]>('equipment.json');
  for (const item of reservation.equipment) {
    const eq = equipmentData.find(e => e.id === item.equipmentId);
    if (eq) {
      eq.stock += item.quantity;
    }
  }
  writeJsonFile('equipment.json', equipmentData);
  
  reservation.status = 'cancelled';
  writeJsonFile('reservations.json', reservations);
  
  res.json({ message: '预约已取消，押金将原路退回' });
});

app.post('/api/reservations/:id/review', (req: Request, res: Response) => {
  const { rating, comment } = req.body;
  const reservations = readJsonFile<Reservation[]>('reservations.json');
  const reservation = reservations.find(r => r.id === req.params.id);
  
  if (!reservation) {
    return res.status(404).json({ error: '预约不存在' });
  }
  
  if (reservation.status !== 'completed' && reservation.status !== 'confirmed') {
    return res.status(400).json({ error: '只能对已完成的预约进行评价' });
  }
  
  reservation.review = {
    rating,
    comment,
    createdAt: new Date().toISOString()
  };
  
  writeJsonFile('reservations.json', reservations);
  res.json({ message: '评价成功' });
});

app.post('/api/calculate-deposit', (req: Request, res: Response) => {
  const { equipment, hours } = req.body;
  const equipmentData = readJsonFile<Equipment[]>('equipment.json');
  
  let totalDeposit = 0;
  let totalRental = 0;
  
  for (const item of equipment) {
    const eq = equipmentData.find(e => e.id === item.equipmentId);
    if (eq) {
      totalDeposit += eq.deposit * item.quantity;
      totalRental += eq.hourlyRate * item.quantity * hours;
    }
  }
  
  res.json({ totalDeposit, totalRental });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
