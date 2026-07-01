import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import User from '../models/user.js'; 
import { SECRET, REFRESH_SECRET } from '../config/jwt.js';

async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const payload = jwt.verify(token, SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

const router = express.Router();

router.post('/send-otp', async (req, res) => {
  const { mobile } = req.body;
  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({ message: 'Invalid mobile number' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  try {
    let user = await User.findOne({ mobile });
    if (!user) {
      user = new User({ mobile, otp, otpExpires });
    } else {
      user.otp = otp;
      user.otpExpires = otpExpires;
    }

    await user.save();

    await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'q',
      message: `Your Patel Shop OTP is ${otp}`,
      language: 'english',
      numbers: mobile
    }, {
      headers: {
        authorization: process.env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { mobile, otp } = req.body;
  try {
    const user = await User.findOne({ mobile, otp, otpExpires: { $gt: new Date() } });
    if (!user) return res.json({ success: false });
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/send-reset-otp', async (req, res) => {
  const { mobile } = req.body;
  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({ message: 'Invalid mobile number' });
  }
  try {
    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ message: 'No account found for this mobile number' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    let smsSent = false;
    try {
      await axios.post('https://www.fast2sms.com/dev/bulkV2', {
        route: 'q',
        message: `Your Patel Shop OTP is ${otp}`,
        language: 'english',
        numbers: mobile
      }, {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      smsSent = true;
    } catch (smsError) {
      console.error('Fast2SMS send-reset-otp error:', smsError.response?.data || smsError.message);
    }

    const message = smsSent ? 'OTP sent successfully. Enter it below to reset your password.' : 'OTP generated successfully. Enter it below to reset your password.';
    res.json({ message });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { mobile, otp, password } = req.body;
  if (!mobile || !otp || !password) return res.status(400).json({ message: 'Mobile, OTP, and new password are required' });
  if (!/^[0-9]{10}$/.test(mobile)) return res.status(400).json({ message: 'Invalid mobile number' });
  if (!/^[0-9]{6}$/.test(otp)) return res.status(400).json({ message: 'Invalid OTP' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  try {
    const user = await User.findOne({ mobile, otp, otpExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/signup', async (req, res) => {
  const { mobile, name, password, address, lat, lng, role, shopName, shopDescription } = req.body;
  try {
    const existingUser = await User.findOne({ mobile });
    if (!existingUser || existingUser.otp || existingUser.otpExpires) return res.status(400).json({ message: 'Verify OTP first' });
    if (existingUser.password) return res.status(400).json({ message: 'Account already created' });

    const hashedPassword = await bcrypt.hash(password, 10);
    existingUser.password = hashedPassword;
    existingUser.name = name || '';
    existingUser.role = role === 'shopkeeper' ? 'shopkeeper' : 'customer';
    if (shopName) existingUser.shopName = shopName;
    if (shopDescription) existingUser.shopDescription = shopDescription;

    const latNum = lat !== undefined ? parseFloat(lat) : undefined;
    const lngNum = lng !== undefined ? parseFloat(lng) : undefined;
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      existingUser.location = { type: 'Point', coordinates: [lngNum, latNum] };
    }
    if (address) existingUser.address = address;

    await existingUser.save();
    res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) return res.status(400).json({ message: 'Mobile and password required' });
  try {
    const user = await User.findOne({ mobile });
    if (!user || !user.password) return res.status(400).json({ message: 'Invalid mobile or password' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid mobile or password' });
    const payload = {
      id: user._id,
      mobile: user.mobile,
      name: user.name,
      email: user.email,
      role: user.role || 'customer',
      shopName: user.shopName || '',
      shopDescription: user.shopDescription || '',
      shopAddress: user.shopAddress || '',
      shopCity: user.shopCity || '',
      shopImage: user.shopImage || '',
      shopLatitude: user.shopLatitude,
      shopLongitude: user.shopLongitude
    };
    const accessToken = jwt.sign(payload, SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id, mobile: user.mobile }, REFRESH_SECRET, { expiresIn: '7d' });

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth/refresh-token' });

    res.json({ success: true, token: accessToken, user: payload });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/update-location', requireAuth, async (req, res) => {
  const { lat, lng, address } = req.body;
  try {
    const latNum = lat !== undefined ? parseFloat(lat) : undefined;
    const lngNum = lng !== undefined ? parseFloat(lng) : undefined;
    if (latNum === undefined || lngNum === undefined || isNaN(latNum) || isNaN(lngNum)) return res.status(400).json({ message: 'Invalid coordinates' });
    req.user.location = { type: 'Point', coordinates: [lngNum, latNum] };
    if (address) req.user.address = address;
    await req.user.save();
    res.json({ message: 'Location updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/refresh-token', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token not found' });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await User.findById(payload.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const userPayload = {
      id: user._id,
      mobile: user.mobile,
      name: user.name,
      email: user.email,
      role: user.role || 'customer',
    };

    const newAccessToken = jwt.sign(userPayload, SECRET, { expiresIn: '15m' });
    res.json({ success: true, token: newAccessToken, user: userPayload });

  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
});


export default router;
