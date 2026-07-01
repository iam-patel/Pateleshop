import mongoose from 'mongoose';

const shopProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, default: 0 },
  category: { type: String, default: '' },
  images: [{ type: String }],
  description: { type: String, default: '' },
  sizes: [{ type: String }],
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'shopOwner', required: true },
  shopName: { type: String, default: '' },
  shopAddress: { type: String, default: '' },
  shopCity: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('ShopProduct', shopProductSchema);
