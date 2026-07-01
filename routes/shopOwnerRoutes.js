import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import StoreOwner from '../models/shopOwner.js';
import authenticateToken from '../middleware/authMiddleware.js';
import { SECRET, REFRESH_SECRET } from '../config/jwt.js';
import ShopProduct from '../models/shopProduct.js';

const router = express.Router();

router.post('/shop-signup', async (req, res) => {
  try {
    const { name, mobile, password, shopName, shopDescription, shopAddress, shopCity } = req.body;
    if (!name || !mobile || !password || !shopName) {
      return res.status(400).json({ message: 'Name, mobile, password, and shop name are required' });
    }

    const exists = await StoreOwner.findOne({ mobile });
    if (exists) {
      return res.status(409).json({ message: 'Store owner already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const owner = await StoreOwner.create({
      name,
      mobile,
      password: hashedPassword,
      shopName,
      shopDescription,
      shopAddress,
      shopCity
    });

    res.status(201).json({ message: 'Store owner created', ownerId: owner._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const owner = await StoreOwner.findOne({ mobile });
    if (!owner) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, owner.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken = jwt.sign({ id: owner._id, role: 'shopkeeper', shopName: owner.shopName }, SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: owner._id, role: 'shopkeeper' }, REFRESH_SECRET, { expiresIn: '7d' });

    owner.refreshToken = refreshToken;
    await owner.save();

    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/shopOwner/refresh-token' });
    res.json({ success: true, token: accessToken, user: { id: owner._id, name: owner.name, shopName: owner.shopName, role: 'shopkeeper' } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/products', authenticateToken, async (req, res) => {
  try {
    const products = await ShopProduct.find({ ownerId: req.user.id, isActive: true }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'shopkeeper') {
      return res.status(403).json({ message: 'Only shop owners can add products' });
    }

    const owner = await StoreOwner.findById(req.user.id);
    if (!owner) return res.status(404).json({ message: 'Store owner not found' });

    const product = await ShopProduct.create({
      name: req.body.name,
      price: req.body.price,
      category: req.body.category || '',
      images: req.body.images || (req.body.image ? [req.body.image] : []),
      description: req.body.description || '',
      sizes: req.body.sizes || [],
      ownerId: owner._id,
      shopName: owner.shopName,
      shopAddress: owner.shopAddress,
      shopCity: owner.shopCity
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/products/:id', authenticateToken, async (req, res) => {
  try {
    const product = await ShopProduct.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    Object.assign(product, {
      name: req.body.name || product.name,
      price: req.body.price || product.price,
      category: req.body.category !== undefined ? req.body.category : product.category,
      images: req.body.images || (req.body.image ? [req.body.image] : product.images),
      description: req.body.description !== undefined ? req.body.description : product.description,
      sizes: req.body.sizes || product.sizes
    });

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/products/:id', authenticateToken, async (req, res) => {
  try {
    const product = await ShopProduct.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.isActive = false;
    await product.save();
    res.json({ message: 'Product deleted' });
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
    const owner = await StoreOwner.findById(payload.id);

    if (!owner || owner.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const newAccessToken = jwt.sign(
      { id: owner._id, role: 'shopkeeper', shopName: owner.shopName },
      SECRET,
      { expiresIn: '15m' }
    );
    res.json({ success: true, token: newAccessToken });
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
});

export default router;