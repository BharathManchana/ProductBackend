import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema({
  index: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  data: { type: Array, required: true },
  previousHash: { type: String, required: true },
  hash: { type: String, required: true },
});

const Blockchain = mongoose.model('Blockchain', blockSchema);

export default Blockchain;
