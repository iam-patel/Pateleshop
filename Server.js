import dotenv from 'dotenv';
dotenv.config();

import express, { json } from 'express';
import cors from 'cors';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import checkoutRoutes from './routes/checkoutRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import webhooks from './webhooks.js';
import profileRoutes from './routes/profileRoutes.js';
import path from 'path';
import connectDB from './config/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('Frontend'));

// serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', orderRoutes);
app.use('/api', cartRoutes);
app.use('/api', checkoutRoutes);
app.use('/api', chatRoutes);
app.use('/api/webhooks', webhooks);
app.use('/api', profileRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

console.log('API KEY:', process.env.FAST2SMS_API_KEY);
console.log('API KEY:', process.env.GROQ_API_KEY);





