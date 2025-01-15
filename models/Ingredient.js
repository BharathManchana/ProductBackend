import { Schema, model } from 'mongoose';

const IngredientSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  origin: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true },
  blockchainId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default model('Ingredient', IngredientSchema);