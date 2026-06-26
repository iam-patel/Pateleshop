import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  userId: { type: String, default: 'guest' },
  items: [{
    id: String,
    name: String,
    price: Number,
    qty: Number,
    img: String,
    size: String
  }]
});

export default mongoose.model('Cart', cartSchema);
