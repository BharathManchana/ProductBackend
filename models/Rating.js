import mongoose from 'mongoose';

const RatingSchema = new mongoose.Schema({
  dishId: { type: String, required: true },
  foodQuality: { type: Number, required: true },
  taste: { type: Number, required: true },
  ingredientQuality: { type: Number, required: true },
}, { timestamps: true });

const Rating = mongoose.model('Rating', RatingSchema);

export default Rating;