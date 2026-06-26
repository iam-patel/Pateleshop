import express from 'express';
import Cart from '../models/cart.js';

const router = express.Router();

// GET cart for user (guest for now)
router.get('/cart', async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: 'guest' });
    if (!cart) cart = { items: [] };
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST update cart
router.post('/cart', async (req, res) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { userId: 'guest' },
      { items: req.body.items || [] },
      { new: true, upsert: true }
    );
    res.json(cart);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;