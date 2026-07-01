import mongoose from 'mongoose';

const storeOwnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  mobile: { type: String, required: true, unique: true },
  password: { type: String },
  photo: { type: String },
  otp: { type: String },
  otpExpires: { type: Date },
  role: { type: String, default: 'shopkeeper' },
  shopName: { type: String, required: true },
  shopDescription: { type: String },
  shopAddress: { type: String },
  shopImage: { type: String },
  shopLatitude: { type: Number },
  shopLongitude: { type: Number },
  isActive: { type: Boolean, default: true },
  refreshToken: { type: String }
}, { timestamps: true });

export default mongoose.model('StoreOwner', storeOwnerSchema);