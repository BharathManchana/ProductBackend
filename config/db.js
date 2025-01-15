import { connect } from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectDB = async () => {
  try {
    await connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000, 
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error(`Error in file ${__filename}: ${err.message}`);
    process.exit(1);
  }
};

export default connectDB;
