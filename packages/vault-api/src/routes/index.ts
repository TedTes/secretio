import { Router } from 'express';
import scanRoutes from './scan';

const router = Router();

// Mount scan routes
router.use('/scan', scanRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Secretio Vault API',
    version: '0.1.0',
    endpoints: {
      scan: '/api/scan',
      health: '/health'
    }
  });
});

export default router;