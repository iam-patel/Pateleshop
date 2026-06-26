import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String },
  // support multiple images (stored as server-relative URLs)
  images: [{ type: String }],
  description: { type: String },
  sizes: [{ type: String }]
});

// Virtual for backward compatibility: first image
productSchema.virtual('image').get(function(){
  return (this.images && this.images.length) ? this.images[0] : undefined;
});

productSchema.set('toObject', { virtuals: true });
productSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Product', productSchema);
