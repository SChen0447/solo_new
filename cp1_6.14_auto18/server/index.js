import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, '..', 'data', 'appointments.json');

app.use(cors());
app.use(express.json());

const readData = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const checkTimeConflict = (appointments, date, time, excludeId = null) => {
  return appointments.some(
    (apt) =>
      apt.id !== excludeId &&
      apt.status !== 'cancelled' &&
      apt.date === date &&
      apt.time === time
  );
};

app.get('/api/appointments', (req, res) => {
  const appointments = readData();
  res.json(appointments);
});

app.get('/api/appointments/:id', (req, res) => {
  const appointments = readData();
  const appointment = appointments.find((apt) => apt.id === req.params.id);
  if (!appointment) {
    return res.status(404).json({ error: '预约不存在' });
  }
  res.json(appointment);
});

app.get('/api/appointments/customer/:phone', (req, res) => {
  const appointments = readData();
  const customerAppointments = appointments
    .filter((apt) => apt.phone === req.params.phone)
    .sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime())
    .slice(0, 3);
  res.json(customerAppointments);
});

app.post('/api/appointments', (req, res) => {
  const { name, phone, service, date, time } = req.body;

  if (!name || !phone || !service || !date || !time) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }

  const appointments = readData();

  if (checkTimeConflict(appointments, date, time)) {
    return res.status(409).json({ error: '该时间段已被预约，请选择其他时间' });
  }

  const newAppointment = {
    id: uuidv4(),
    name,
    phone,
    service,
    date,
    time,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  appointments.push(newAppointment);
  writeData(appointments);

  res.status(201).json(newAppointment);
});

app.put('/api/appointments/:id', (req, res) => {
  const appointments = readData();
  const index = appointments.findIndex((apt) => apt.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '预约不存在' });
  }

  const { date, time } = req.body;
  if (date && time) {
    if (checkTimeConflict(appointments, date, time, req.params.id)) {
      return res.status(409).json({ error: '该时间段已被预约，请选择其他时间' });
    }
  }

  appointments[index] = { ...appointments[index], ...req.body };
  writeData(appointments);

  res.json(appointments[index]);
});

app.put('/api/appointments/:id/cancel', (req, res) => {
  const appointments = readData();
  const index = appointments.findIndex((apt) => apt.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '预约不存在' });
  }

  appointments[index].status = 'cancelled';
  writeData(appointments);

  res.json(appointments[index]);
});

app.delete('/api/appointments/:id', (req, res) => {
  const appointments = readData();
  const filtered = appointments.filter((apt) => apt.id !== req.params.id);

  if (filtered.length === appointments.length) {
    return res.status(404).json({ error: '预约不存在' });
  }

  writeData(filtered);
  res.json({ message: '预约已删除' });
});

app.get('/api/statistics', (req, res) => {
  const appointments = readData();
  const serviceStats = {
    剪发: 0,
    染发: 0,
    护理: 0,
    造型: 0
  };

  const statusStats = {
    pending: 0,
    completed: 0,
    cancelled: 0
  };

  appointments.forEach((apt) => {
    if (apt.status !== 'cancelled' && serviceStats.hasOwnProperty(apt.service)) {
      serviceStats[apt.service]++;
    }
    if (statusStats.hasOwnProperty(apt.status)) {
      statusStats[apt.status]++;
    }
  });

  res.json({ serviceStats, statusStats, total: appointments.length });
});

app.get('/api/check-conflict', (req, res) => {
  const { date, time, excludeId } = req.query;
  const appointments = readData();
  const conflict = checkTimeConflict(appointments, date, time, excludeId);
  res.json({ conflict });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
