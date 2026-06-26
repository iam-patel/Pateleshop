import mongoose from 'mongoose';

const checkoutSchema = new mongoose.Schema({
  userId: { type: String, default: 'guest' },
  type: { type: String, required: true },
  details: { type: Object, required: true }
});

export default mongoose.model('Checkout', checkoutSchema);