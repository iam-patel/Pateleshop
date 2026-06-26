import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  date: { type: Date, default: Date.now },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    payment: {
      method: String,
      upiId: String,
      cardNumber: String,
      cardName: String
    }
  },
  items: [
    {
      id: String,
      name: String,
      price: Number,
      qty: Number,
      img: String
    }
  ],
  delivery: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, default: 'placed' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Order', orderSchema);