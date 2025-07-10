import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';


const app = express();

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiRoutes);
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'secretio-vault-api',
    version: '0.1.0'
  });
});


// 404 handler
app.use('*', notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;