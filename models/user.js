import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  mobile: { type: String, required: true, unique: true },
  password: { type: String },
  photo: { type: String },
  otp: { type: String },
  otpExpires: { type: Date },
  refreshToken: { type: String }
});

// Store user's geolocation (GeoJSON Point) and a human-readable address
userSchema.add({
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] }
  },
  address: { type: String }
});

userSchema.index({ location: '2dsphere' });

export default mongoose.model('User', userSchema);
