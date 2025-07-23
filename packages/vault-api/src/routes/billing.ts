import { Router, Request, Response } from 'express';
import { requireAuth, injectUserContext } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { getUserId } from '../utils';
import { AuthenticatedRequest } from '../types/auth';
import { StripeService } from '../services/stripe';

const billingRoutes = Router();
const stripeService = new StripeService();

// POST /api/billing/create-checkout-session
billingRoutes.post('/create-checkout-session',
  requireAuth,
  injectUserContext,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = getUserId(req);
    const user = req.user;

    if (!userId || !user?.email) {
      throw createError('User information required', 401);
    }

    const { priceId } = req.body;

    try {
      const session = await stripeService.createCheckoutSession(
        userId,
        user.email,
        priceId
      );

      res.json({
        success: true,
        data: {
          sessionId: session.sessionId,
          url: session.url
        }
      });

    } catch (error) {
      console.error('Checkout session creation failed:', error);
      throw createError('Failed to create payment session', 500);
    }
  })
);

// POST /api/billing/create-portal-session
billingRoutes.post('/create-portal-session',
    requireAuth,
    injectUserContext,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = getUserId(req);
  
      if (!userId) {
        throw createError('User ID required', 401);
      }
  
      const { customerId } = req.body;
  
      if (!customerId) {
        throw createError('Customer ID required', 400);
      }
  
      try {
        const session = await stripeService.createPortalSession(customerId);
  
        res.json({
          success: true,
          data: {
            url: session.url
          }
        });
  
      } catch (error) {
        console.error('Portal session creation failed:', error);
        throw createError('Failed to create portal session', 500);
      }
    })
  );
  // POST /api/billing/webhook
  billingRoutes.post('/webhook',
    asyncHandler(async (req: Request, res: Response) => {
      const signature = req.headers['stripe-signature'] as string;
  
      if (!signature) {
        throw createError('Missing Stripe signature', 400);
      }
  
      try {
        await stripeService.handleWebhook(req.body, signature);
  
        res.json({ received: true });
  
      } catch (error) {
        console.error('Webhook processing failed:', error);
        throw createError('Webhook processing failed', 400);
      }
    })
  );

  export default billingRoutes;