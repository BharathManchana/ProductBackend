import express from 'express';  
import connectDB from './config/db.js';  
import productComponentRoutesRoutes from './routes/productComponentRoutes.js';  
import userRoutes from './routes/userRoutes.js';  
import dotenv from 'dotenv';  
import productRoutes from './routes/productRoutes.js';
import transcation from "./routes/trascationroutes.js";
import cors from 'cors';

const app = express();

dotenv.config();  
console.log('Connecting to database...');
connectDB().then(() => {
  console.log('Database connected');
}).catch((err) => {
  console.error('Database connection failed:', err);
});

app.use(express.json());
app.use(cors({ origin: '*' }));
 
app.use('/api/components', productComponentRoutesRoutes); 
app.use('/api/users', userRoutes);  
app.use('/api/products', productRoutes);
app.use('/api/transaction', transcation);

console.log('App configured successfully');

export default app;
