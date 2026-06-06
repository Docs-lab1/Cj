const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const http = require('http');
const socketIO = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Mock database for demo (no PostgreSQL required)
const mockDB = {
  users: [
    { id: 1, user_id: 'CUST001', full_name: 'John Mwila', phone: '+260977123456', password: 'password123', role: 'customer', rating: 4.8 },
    { id: 2, user_id: 'DRV001', full_name: 'Kelvin Banda', phone: '+260977123457', password: 'password123', role: 'driver', rating: 4.9 },
    { id: 3, user_id: 'ADMIN001', full_name: 'Admin Kasama', phone: '+260970000001', password: 'admin123', role: 'admin' }
  ],
  vehicles: [
    { id: 1, registration_number: 'BCA 101', vehicle_type: 'bike', driver_name: 'Kelvin Banda', driver_phone: '+260977123456', lat: -10.2100, lng: 31.1800, status: 'available', rating: 4.9, distance: 0.4 },
    { id: 2, registration_number: 'BCA 202', vehicle_type: 'bike', driver_name: 'Grace Phiri', driver_phone: '+260977234567', lat: -10.2085, lng: 31.1825, status: 'available', rating: 4.8, distance: 0.6 },
    { id: 3, registration_number: 'ULENDO 001', vehicle_type: 'car', driver_name: 'Peter Zulu', driver_phone: '+260977345678', lat: -10.2120, lng: 31.1780, status: 'available', rating: 4.9, distance: 0.8 },
    { id: 4, registration_number: 'BCA 303', vehicle_type: 'bike', driver_name: 'Michael Banda', driver_phone: '+260977456789', lat: -10.2140, lng: 31.1795, status: 'available', rating: 4.7, distance: 0.9 }
  ]
};

// ============ AUTH ROUTES ============
app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  
  const user = mockDB.users.find(u => u.phone === phone && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { id: user.id, userId: user.user_id, role: user.role, name: user.full_name },
    'kasama_secret_key_2024',
    { expiresIn: '30d' }
  );
  
  res.json({
    token,
    user: {
      id: user.user_id,
      name: user.full_name,
      phone: user.phone,
      role: user.role,
      rating: user.rating || 5.0
    }
  });
});

// ============ VEHICLE ROUTES ============
app.get('/api/bikes/nearby', (req, res) => {
  const { lat, lng, vehicle_type } = req.query;
  
  let vehicles = [...mockDB.vehicles];
  
  if (vehicle_type && vehicle_type !== 'all') {
    vehicles = vehicles.filter(v => v.vehicle_type === vehicle_type);
  }
  
  const vehiclesWithDistance = vehicles.map(v => ({
    ...v,
    distance_km: v.distance.toFixed(1),
    eta_minutes: Math.ceil(v.distance * 3)
  }));
  
  res.json({ vehicles: vehiclesWithDistance });
});

// ============ RIDE ROUTES ============
app.post('/api/rides/request', (req, res) => {
  const { pickup_address, dropoff_address, estimated_fare } = req.body;
  const rideNumber = `KSM${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  res.status(201).json({
    message: 'Ride requested successfully',
    ride: {
      id: Date.now(),
      rideNumber: rideNumber,
      status: 'pending',
      estimated_fare: estimated_fare || 25
    }
  });
});

app.post('/api/rides/:rideId/pay', (req, res) => {
  const { rideId } = req.params;
  const { mtn_momo_number } = req.body;
  const transactionId = `MTN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  res.json({
    message: 'Payment successful! Driver is on the way',
    transaction_id: transactionId,
    amount: 25
  });
});

app.get('/api/rides/history', (req, res) => {
  const rides = [
    {
      id: 1,
      ride_number: 'KSM17052024001',
      pickup_address: 'Kasama Town Centre',
      dropoff_address: 'Chinsali Road',
      estimated_fare: 22,
      actual_fare: 22,
      status: 'completed',
      requested_at: new Date().toISOString()
    },
    {
      id: 2,
      ride_number: 'KSM16052024002',
      pickup_address: 'East Park Mall',
      dropoff_address: 'Airport',
      estimated_fare: 35,
      actual_fare: 35,
      status: 'completed',
      requested_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];
  
  res.json({ rides });
});

// ============ ADMIN ROUTES ============
app.post('/api/admin/register-bike', (req, res) => {
  const { registration_number, driver_name, driver_phone, vehicle_type } = req.body;
  
  const newBike = {
    id: mockDB.vehicles.length + 1,
    registration_number,
    vehicle_type,
    driver_name,
    driver_phone,
    lat: -10.2125,
    lng: 31.1800,
    status: 'available',
    rating: 5.0,
    distance: 0.5
  };
  
  mockDB.vehicles.push(newBike);
  
  res.json({
    message: 'Bike registered successfully',
    bike: newBike
  });
});

app.get('/api/admin/bikes', (req, res) => {
  const bikes = mockDB.vehicles.map(v => ({
    id: v.id,
    registration: v.registration_number,
    driverName: v.driver_name,
    driverPhone: v.driver_phone,
    status: v.status,
    type: v.vehicle_type
  }));
  
  res.json({ bikes });
});

app.get('/api/admin/stats', (req, res) => {
  res.json({
    stats: {
      total_customers: 156,
      total_drivers: 23,
      total_vehicles: mockDB.vehicles.length,
      completed_rides: 1247,
      total_revenue: 45280
    }
  });
});

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Kasama Rides API is running!',
    timestamp: new Date().toISOString(),
    port: 5000,
    endpoints: [
      'POST /api/auth/login',
      'GET /api/bikes/nearby',
      'POST /api/rides/request',
      'POST /api/rides/:rideId/pay',
      'GET /api/rides/history',
      'GET /api/admin/bikes',
      'POST /api/admin/register-bike',
      'GET /api/admin/stats'
    ]
  });
});

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
  console.log('🟢 Client connected:', socket.id);
  
  socket.on('customer_online', (data) => {
    console.log('Customer online:', data);
    socket.join(`customer_${data.customerId}`);
  });
  
  socket.on('driver_location', (data) => {
    socket.broadcast.emit(`driver_location_${data.driverId}`, data);
  });
  
  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);
  });
});

// ============ START SERVER ON PORT 5000 ============
const PORT = 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║     🚀  KASAMA RIDES BACKEND IS RUNNING SUCCESSFULLY!       ║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  📍 Local API:    http://localhost:${PORT}                    ║`);
  console.log(`║  📍 Network API:  http://${HOST}:${PORT}                       ║`);
  console.log(`║  🔌 WebSocket:    ws://localhost:${PORT}                      ║`);
  console.log(`║  ✅ Health Check: http://localhost:${PORT}/api/health         ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  📱 Test Credentials:                                        ║');
  console.log('║     Customer: +260977123456 / password123                    ║');
  console.log('║     Admin:    +260970000001 / admin123                       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  🎯 API is ready to accept connections!                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');
});
