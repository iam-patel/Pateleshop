import express from 'express';
import Product from '../models/product.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB per file

const router = express.Router();

// GET all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new product (for admin)
// Accepts multipart/form-data with files in 'images' or JSON body with image URLs
router.post('/products', upload.array('images', 10), async (req, res) => {
  try {
    const body = req.body || {};
    const images = [];
    // files uploaded
    if (req.files && req.files.length) {
      req.files.forEach(f => images.push(`/uploads/products/${f.filename}`));
    }
    // image URLs passed in 'image' or 'images' (comma-separated)
    if (body.image) images.push(body.image);
    if (body.images) {
      const extra = Array.isArray(body.images) ? body.images : (String(body.images).split(',').map(s=>s.trim()).filter(Boolean));
      images.push(...extra);
    }

    // Validate total images do not exceed 10
    if (images.length > 10) {
      return res.status(400).json({ message: 'Maximum 10 images allowed per product' });
    }
    if (images.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    const sizes = body.sizes ? (Array.isArray(body.sizes) ? body.sizes : String(body.sizes).split(',').map(s=>s.trim()).filter(Boolean)) : [];

    const product = new Product({
      name: body.name,
      price: parseFloat(body.price) || 0,
      category: body.category || '',
      images,
      description: body.description || '',
      sizes
    });

    const newProduct = await product.save();
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('product create error', err);
    res.status(400).json({ message: err.message });
  }
});

// PUT update product (supports file uploads)
router.put('/products/:id', upload.array('images', 10), async (req, res) => {
  try {
    const body = req.body || {};
    const update = { ...body };
    // handle sizes
    if (body.sizes) update.sizes = Array.isArray(body.sizes) ? body.sizes : String(body.sizes).split(',').map(s=>s.trim()).filter(Boolean);
    // handle uploaded files and image URLs
    let newImages = (update.images || []).concat(req.files ? req.files.map(f=>`/uploads/products/${f.filename}`) : []);
    if (body.image && (!newImages || newImages.length===0)) newImages = [body.image];
    if (newImages.length > 10) {
      return res.status(400).json({ message: 'Maximum 10 images allowed per product' });
    }
    if (newImages.length > 0) update.images = newImages;

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(product);
  } catch (err) {
    console.error('product update error', err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE product
router.delete('/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
