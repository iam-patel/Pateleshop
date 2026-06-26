import express from 'express';
import jwt from 'jsonwebtoken';
import Order from '../models/order.js';
import { SECRET } from '../config/jwt.js';

const router = express.Router();

// GET all orders for the current user
router.get('/orders', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);

    const orders = await Order.find({ userId: decoded.id });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new order
router.post('/orders', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);

    const orderData = {
      ...req.body,
      userId: decoded.id
    };

    const order = new Order(orderData);
    const newOrder = await order.save();

    res.status(201).json(newOrder);
  } catch (err) {
    console.error('Order error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// PUT update order status
router.put('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET all orders for admin
router.get('/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find({});
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

console.log('Loaded SECRET:', SECRET);

export default router;
