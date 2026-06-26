import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authenticateToken from '../middleware/authMiddleware.js';
import User from '../models/user.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '..', 'uploads', 'profiles');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

const router = express.Router();

// Get current user's profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp -otpExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update profile (name/email/photo/address/location)
router.post('/profile', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { name, email, address, lat, lng } = req.body;
    const update = {};
    if (name) update.name = name;
    if (email) update.email = email;
    if (address) update.address = address;
    const latNum = lat !== undefined ? parseFloat(lat) : undefined;
    const lngNum = lng !== undefined ? parseFloat(lng) : undefined;
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      update.location = { type: 'Point', coordinates: [lngNum, latNum] };
    }
    if (req.file) {
      const relPath = `/uploads/profiles/${req.file.filename}`;
      update.photo = relPath;
    }
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-password -otp -otpExpires');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
