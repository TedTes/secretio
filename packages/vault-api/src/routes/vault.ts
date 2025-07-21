import { Router,Response } from 'express';
import { requireAuth, injectUserContext } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { createError } from '../middleware/errorHandler';
import { getUserId,SnippetGenerator } from '../utils';
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

// GET /api/vault/retrieve/:keyName - Public API for applications to get keys
vaultRoutes.get('/retrieve/:keyName',
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

    try {
      const keyData = await vaultService.getKeyValue(userId, keyName, environment, supabase);

      res.json({
        success: true,
        data: {
          value: keyData.value,
          service: keyData.service,
          retrieved_at: new Date().toISOString()
        }
      });

    } catch (error) {
      // Return consistent error format for API consumers
      res.status(error instanceof Error && error.message === 'Key not found' ? 404 : 500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve key',
        key_name: keyName,
        environment
      });
    }
  })
);
// POST /api/vault/verify - Verify API access and return available keys
vaultRoutes.post('/verify',
  requireAuth,
  injectUserContext,
  asyncHandler(async (req: AuthenticatedRequest, res:Response) => {
    const supabase = req.supabaseClient;
    const userId = getUserId(req);
    const environment = (req.body.environment as string) || 'production';
    
    if (!userId) {
      throw createError('User ID required', 401);
    }

    try {
      const keys = await vaultService.getUserKeys(userId, environment, supabase);
      
      res.json({
        success: true,
        data: {
          user_id: userId,
          environment,
          available_keys: keys.map(key => ({
            name: key.keyName,
            service: key.service,
            created_at: key.createdAt
          })),
          count: keys.length,
          verified_at: new Date().toISOString()
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      });
    }
  })
);

// GET /api/vault/snippet/:keyName - Generate integration code snippets
vaultRoutes.get('/snippet/:keyName',
  requireAuth,
  injectUserContext,
  asyncHandler(async (req: AuthenticatedRequest, res:Response) => {
    const supabase = req.supabaseClient;
    const userId = getUserId(req);
    const { keyName } = req.params;
    const environment = (req.query.environment as string) || 'production';
    const language = (req.query.language as string) || 'all';
    
    if (!userId) {
      throw createError('User ID required', 401);
    }

    try {
      // Verify user owns this key
      const keys = await vaultService.getUserKeys(userId, environment, supabase);
      const key = keys.find(k => k.keyName === keyName);
      
      if (!key) {
        throw createError('Key not found or access denied', 404);
      }

      const snippetGenerator = new SnippetGenerator();
      
      if (language === 'all') {
        // Return all language snippets
        const snippets = snippetGenerator.generateMultipleSnippets(
          keyName, 
          key.service, 
          environment
        );
        
        res.json({
          success: true,
          data: {
            keyName,
            service: key.service,
            environment,
            snippets,
            instructions: {
              setup: [
                '1. Install the Secretio Vault Client',
                '2. Set your VAULT_TOKEN environment variable',
                '3. Replace hardcoded keys with vault calls',
                '4. Deploy your application'
              ],
              security: [
                'Never commit VAULT_TOKEN to version control',
                'Use environment-specific tokens',
                'Rotate tokens regularly',
                'Monitor vault access logs'
              ]
            }
          }
        });
      } else {
        // Return single language snippet
        const snippet = snippetGenerator.generateSnippet({
          keyName,
          service: key.service,
          language: language as any,
          environment
        });
        
        res.json({
          success: true,
          data: {
            keyName,
            service: key.service,
            environment,
            language,
            snippet
          }
        });
      }

    } catch (error) {
      throw createError(
        error instanceof Error ? error.message : 'Failed to generate snippet',
        500
      );
    }
  })
);
// GET /api/vault/health - Simple health check for vault service
vaultRoutes.get('/health',
  asyncHandler(async (req:Request, res:Response) => {
    res.json({
      success: true,
      data: {
        service: 'vault-api',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  })
);
export { vaultRoutes };