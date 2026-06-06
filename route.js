const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Generate unique user ID
const generateUserId = () => {
  return `USR${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

// Login endpoint
router.post('/login', async (req, res) => {
  const db = req.app.get('db');
  const { phone, password } = req.body;
  
  try {
    const result = await db.query(
      `SELECT u.*, d.id as driver_db_id, d.vehicle_type, d.is_online,
       v.id as vehicle_id, v.registration_number
       FROM users u
       LEFT JOIN drivers d ON u.id = d.user_id
       LEFT JOIN vehicles v ON d.id = v.driver_id
       WHERE u.phone = $1 AND u.is_active = true`,
      [phone]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      token,
      user: {
        id: user.user_id,
        name: user.full_name,
        phone: user.phone,
        role: user.role,
        email: user.email,
        rating: user.rating,
        total_rides: user.total_rides
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;