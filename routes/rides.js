const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Request a ride
router.post('/request', auth, async (req, res) => {
  const db = req.app.get('db');
  const { pickup_address, pickup_lat, pickup_lng, dropoff_address, vehicle_type, estimated_fare } = req.body;
  const rideNumber = `KSM${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  try {
    const result = await db.query(`
      INSERT INTO rides (
        ride_number, customer_id, pickup_address, pickup_latitude, pickup_longitude,
        dropoff_address, estimated_fare, status, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [rideNumber, req.user.id, pickup_address, pickup_lat, pickup_lng, dropoff_address, estimated_fare, 'pending', 'pending']);
    
    res.status(201).json({ message: 'Ride requested', ride: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to request ride' });
  }
});

// Process payment
router.post('/:rideId/pay', auth, async (req, res) => {
  const db = req.app.get('db');
  const { rideId } = req.params;
  const { payment_method, mtn_momo_number } = req.body;
  const transactionId = `MTN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  try {
    await db.query('BEGIN');
    
    await db.query(`
      INSERT INTO payments (ride_id, user_id, amount, payment_method, transaction_id, mtn_momo_number, status)
      VALUES ($1, $2, (SELECT estimated_fare FROM rides WHERE id = $1), $3, $4, $5, 'completed')
    `, [rideId, req.user.id, payment_method, transactionId, mtn_momo_number]);
    
    await db.query('UPDATE rides SET payment_status = $1, status = $2 WHERE id = $3', ['completed', 'paid', rideId]);
    
    await db.query('COMMIT');
    
    res.json({ message: 'Payment successful', transaction_id: transactionId });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Payment failed' });
  }
});

// Get ride history
router.get('/history', auth, async (req, res) => {
  const db = req.app.get('db');
  
  try {
    const result = await db.query(`
      SELECT r.*, u.full_name as driver_name
      FROM rides r
      LEFT JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE r.customer_id = $1
      ORDER BY r.requested_at DESC
      LIMIT 20
    `, [req.user.id]);
    
    res.json({ rides: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ride history' });
  }
});

module.exports = router;
