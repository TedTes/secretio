import { Router } from 'express';
import scanRoutes from './scan';
import jobRoutes from './jobs';
import userRoutes from './users';
const router = Router();

// Mount scan routes
router.use('/scan', scanRoutes);
router.use('/jobs', jobRoutes);
router.use('/users', userRoutes);
// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Secretio Vault API',
    version: '0.1.0',
    endpoints: {
      scan: '/api/scan',
       jobs: '/api/jobs',
       users: '/api/users',
      health: '/health'
    }
  });
});

export default router;