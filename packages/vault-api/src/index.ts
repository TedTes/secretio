


import { initializeAuth, validateAuthConfig } from './config/auth';
import app from './app';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Initialize auth before starting server
    validateAuthConfig();
    await initializeAuth();
    
    app.listen(PORT, () => {
      console.log(`🚀 Secretio Vault API running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();