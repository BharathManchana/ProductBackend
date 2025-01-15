import mongoose from 'mongoose';

const DishSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  blockchainId: { type: String, required: true },
  ingredients: [{ type: String, required: true }], 
});

export default mongoose.model('Dish', DishSchema);
