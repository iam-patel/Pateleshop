import express from 'express';
import jwt from 'jsonwebtoken';
import PaymentMethod from '../models/checkout.js';
import { SECRET } from '../config/jwt.js';

const router = express.Router();

// Helper to extract userId from JWT
function getUserIdFromToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[0] === 'Bearer' ? authHeader.split(' ')[1] : null;
  if (!token) return 'guest';
  try {
    const decoded = jwt.verify(token, SECRET);
    return decoded.id || 'guest';
  } catch (e) {
    return 'guest';
  }
}

// GET payment methods for user
router.get('/payment-methods', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const methods = await PaymentMethod.find({ userId });
    res.json(methods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST save payment method
router.post('/payment-methods', async (req, res) => {
  const userId = getUserIdFromToken(req);
  const method = new PaymentMethod({
    userId,
    type: req.body.type,
    details: req.body.details
  });
  try {
    const newMethod = await method.save();
    res.status(201).json(newMethod);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE payment method
router.delete('/payment-methods/:id', async (req, res) => {
  try {
    await PaymentMethod.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payment method deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST verify COD (Cash on Delivery) - just confirms order will be paid on delivery
router.post('/verify-cod', async (req, res) => {
  const { orderId } = req.body;
  const userId = getUserIdFromToken(req);
  
  if (!orderId) {
    return res.status(400).json({ message: 'Order ID required' });
  }
  
  try {
    // Log the COD verification
    console.log(`COD Order verified for user ${userId}: Order ID ${orderId}`);
    res.json({ 
      success: true, 
      message: 'Cash on Delivery order confirmed. Payment to be collected on delivery.',
      orderId 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST verify UPI payment
router.post('/verify-upi', async (req, res) => {
  const { upiId, orderId, amount, transactionId } = req.body;
  const userId = getUserIdFromToken(req);
  
  if (!upiId || !orderId || !amount) {
    return res.status(400).json({ message: 'UPI ID, Order ID, and Amount required' });
  }
  
  // Validate UPI ID format
  const upiPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/;
  if (!upiPattern.test(upiId)) {
    return res.status(400).json({ message: 'Invalid UPI ID format' });
  }
  
  try {
    console.log(`UPI Payment initiated for user ${userId}: UPI=${upiId}, Order=${orderId}, Amount=₹${amount}`);
    
    // In real implementation, you would verify the payment with UPI service provider
    // For now, we just log and confirm
    const verification = {
      status: 'pending',
      upiId,
      orderId,
      amount,
      transactionId: transactionId || `TXN${Date.now()}`,
      userId,
      timestamp: new Date(),
      message: 'UPI payment initiated. User will complete payment in their UPI app.'
    };
    
    res.json({ 
      success: true,
      message: 'UPI payment verification initiated',
      verification
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST verify Credit/Debit Card payment
router.post('/verify-card', async (req, res) => {
  const { cardNumber, orderId, amount, cardName } = req.body;
  const userId = getUserIdFromToken(req);
  
  if (!cardNumber || !orderId || !amount) {
    return res.status(400).json({ message: 'Card, Order ID, and Amount required' });
  }
  
  try {
    console.log(`Card Payment initiated for user ${userId}: Order=${orderId}, Amount=₹${amount}, Cardholder=${cardName}`);
    
    // In real implementation, you would process card with payment gateway (Razorpay, Stripe, etc)
    // For now, we just log and confirm
    const verification = {
      status: 'pending',
      cardLast4: cardNumber.slice(-4),
      orderId,
      amount,
      cardName,
      userId,
      timestamp: new Date(),
      message: 'Card payment verification initiated.'
    };
    
    res.json({ 
      success: true,
      message: 'Card payment verification initiated',
      verification
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;