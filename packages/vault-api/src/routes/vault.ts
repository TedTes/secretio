import { Router,Response } from 'express';
import { requireAuth, injectUserContext } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { createError } from '../middleware/errorHandler';
import { getUserId } from '../utils/auth';
import { AuthenticatedRequest } from '../types/auth';
import { VaultService } from '../services/vault';

const vaultRoutes = Router();
const vaultService = new VaultService();

// POST /api/vault/keys - Store a key in vault
vaultRoutes.post('/keys', 
  requireAuth, 
  injectUserContext,
  asyncHandler(async (req: AuthenticatedRequest, res:Response) => {
    const supabase = req.supabaseClient;
    const userId = getUserId(req);
    
    if (!userId) {
      throw createError('User ID required', 401);
    }

    const { keyName, service, value, environment = 'production' } = req.body;

    if (!keyName || !service || !value) {
      throw createError('keyName, service, and value are required', 400);
    }

    const storedKey = await vaultService.storeKey(userId, {
      keyName,
      service, 
      value,
      environment
    }, supabase);

    res.json({
      success: true,
      data: {
        ...storedKey,
        message: 'API key stored securely in vault'
      }
    });
  })
);

// GET /api/vault/keys - List user's vault keys (masked)
vaultRoutes.get('/keys',
  requireAuth,
  injectUserContext, 
  asyncHandler(async (req: AuthenticatedRequest, res:Response) => {
    const supabase = req.supabaseClient;
    const userId = getUserId(req);
    
    if (!userId) {
      throw createError('User ID required', 401);
    }

    const environment = (req.query.environment as string) || 'production';
    const keys = await vaultService.getUserKeys(userId, environment, supabase);

    res.json({
      success: true,
      data: {
        keys,
        environment,
        count: keys.length
      }
    });
  })
);

// GET /api/vault/keys/:keyName - Get specific key value
vaultRoutes.get('/keys/:keyName',
  requireAuth,
  injectUserContext,
  asyncHandler(async (req: AuthenticatedRequest, res:Response) => {
    const supabase = req.supabaseClient;
    const userId = getUserId(req);
    const { keyName } = req.params;
    const environment = (req.query.environment as string) || 'production';
    
    if (!userId) {
      throw createError('User ID required', 401);
    }

    const keyData = await vaultService.getKeyValue(userId, keyName, environment, supabase);

    res.json({
      success: true,
      data: {
        keyName,
        value: keyData.value,
        service: keyData.service,
        environment,
        accessed: new Date().toISOString()
      }
    });
  })
);

// DELETE /api/vault/keys/:keyName - Delete a key
vaultRoutes.delete('/keys/:keyName',
  requireAuth,
  injectUserContext,
  asyncHandler(async (req: AuthenticatedRequest, res:Response) => {
    const supabase = req.supabaseClient;
    const userId = getUserId(req);
    const { keyName } = req.params;
    const environment = (req.query.environment as string) || 'production';
    
    if (!userId) {
      throw createError('User ID required', 401);
    }

    await vaultService.deleteKey(userId, keyName, environment, supabase);

    res.json({
      success: true,
      data: {
        message: `Key '${keyName}' deleted successfully`,
        keyName,
        environment
      }
    });
  })
);

export { vaultRoutes };