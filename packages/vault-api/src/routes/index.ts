import { Router } from 'express';
import scanRoutes from './scan';
import jobRoutes from './jobs';
import userRoutes from './users';
import authRoutes from './auth';
import githubRoutes from './github';
import { vaultRoutes } from './vault';
import billingRoutes from "./billing";
const router = Router();

// Mount scan routes
router.use('/scan', scanRoutes);
router.use('/jobs', jobRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/github', githubRoutes);
router.use('/vault', vaultRoutes);
router.use('/billing', billingRoutes);
// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Secretio Vault API',
    version: '0.1.0',
    endpoints: {
      scan: '/api/scan',
       jobs: '/api/jobs',
       users: '/api/users',
       github:'/api/github',
       auth: '/api/auth',
       vault: '/api/vault',
       billing: '/api/billing',
      health: '/health'
    }
  });
});

export default router;