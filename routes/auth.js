const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const generateUserId = () => {
  const prefix = 'USR';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

// Register
router.post('/register', [
  body('full_name').notEmpty().trim(),
  body('phone').isMobilePhone().withMessage('Invalid phone number'),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['customer', 'driver'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const db = req.app.get('db');
  const { full_name, email, phone, password, role, vehicle_type, driver_license } = req.body;
  
  try {
    const existingUser = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = generateUserId();
    
    const result = await db.query(
      `INSERT INTO users (user_id, full_name, email, phone, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, full_name, phone, role`,
      [userId, full_name, email || null, phone, hashedPassword, role]
    );
    
    const user = result.rows[0];
    
    // If driver, create driver record
    if (role === 'driver') {
      await db.query(
        `INSERT INTO drivers (user_id, driver_license, vehicle_type) 
         VALUES ($1, $2, $3)`,
        [user.id, driver_license, vehicle_type || 'bike']
      );
    }
    
    const token = jwt.sign(
      { id: user.id, userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.user_id,
        name: user.full_name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('phone').notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  const { phone, password } = req.body;
  const db = req.app.get('db');
  
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
    
    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    
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
        total_rides: user.total_rides,
        ...(user.role === 'driver' && {
          driverId: user.driver_db_id,
          vehicleType: user.vehicle_type,
          isOnline: user.is_online,
          vehicleReg: user.registration_number
        })
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
