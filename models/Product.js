import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  blockchainId: { type: String, required: true },
  ingredients: [{ type: String, required: true }], 
  imageUrl: { type: String }, 
});

export default mongoose.model('Product', ProductSchema);