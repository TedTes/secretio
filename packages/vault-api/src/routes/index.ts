import { Router } from 'express';
import scanRoutes from './scan';
import jobRoutes from './jobs';
import userRoutes from './users';
import authRoutes from './auth';
import githubRoutes from './github';
const router = Router();

// Mount scan routes
router.use('/scan', scanRoutes);
router.use('/jobs', jobRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/github', githubRoutes);
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
      health: '/health'
    }
  });
});

export default router;