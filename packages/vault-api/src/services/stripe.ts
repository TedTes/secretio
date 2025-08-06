import Stripe from 'stripe';
import { createError } from '../middleware/errorHandler';
import { DatabaseService } from './database';
import { supabase } from '../config/database';
import { DbUserSubscription } from 'src/types';
import { Subscription } from '@supabase/supabase-js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

interface IStripeInvoice extends Stripe.Invoice {
  subscription: string;
}

export class StripeService {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = new DatabaseService(supabase);
  }
  
  /**
   * Create a checkout session for vault subscription
   */
  async createCheckoutSession(
    userId: string, 
    userEmail: string, 
    priceId: string = process.env.VAULT_PRICE_ID!
  ): Promise<{ sessionId: string; url: string }> {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        customer_email: userEmail,
        client_reference_id: userId,
        success_url: `${process.env.FRONTEND_URL}/vault/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/vault/upgrade?cancelled=true`,
        metadata: {
          userId,
          plan: 'vault_monthly'
        },
        subscription_data: {
          metadata: {
            userId,
            plan: 'vault_monthly'
          }
        }
      });

      if (!session.id || !session.url) {
        throw createError('Failed to create checkout session', 500);
      }

      return {
        sessionId: session.id,
        url: session.url
      };

    } catch (error) {
      console.error('Stripe checkout session creation failed:', error);
      throw createError('Payment session creation failed', 500);
    }
  }

  /**
   * Create a customer portal session for subscription management
   */
  async createPortalSession(customerId: string): Promise<{ url: string }> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.FRONTEND_URL}/vault`,
      });

      return { url: session.url };

    } catch (error) {
      console.error('Stripe portal session creation failed:', error);
      throw createError('Portal session creation failed', 500);
    }
  }

  /**
   * Handle webhook events from Stripe
   */
  async handleWebhook(payload: string, signature: string): Promise<void> {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      console.log('Processing Stripe webhook:', event.type);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
          break;
        
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as IStripeInvoice);
          break;
        
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as IStripeInvoice);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw createError('Webhook processing failed', 400);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.client_reference_id || session.metadata?.userId;
    
    if (!userId) {
      console.error('No user ID in checkout session:', session.id);
      return;
    }

    console.log(`Checkout completed for user ${userId}, session ${session.id}`);
    
    try {
      // Get the customer and subscription details
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (subscriptionId) {
        // Get full subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Store in database
        await this.dbService.createOrUpdateSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          status: subscription.status,
          planId: subscription.items.data[0]?.price.id || 'vault_monthly',
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000)
        });

        // Update user tier
        await this.dbService.updateUserSubscriptionTier(userId, 'pro');
        
        console.log(`✅ Subscription stored for user ${userId}`);
      }
    } catch (error) {
      console.error('Failed to handle checkout completion:', error);
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    
    if (!userId) {
      console.error('No user ID in subscription:', subscription.id);
      return;
    }

    console.log(`Subscription created for user ${userId}: ${subscription.id}`);
    
    try {
      await this.dbService.createOrUpdateSubscription({
        userId,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        planId: subscription.items.data[0]?.price.id || 'vault_monthly',
        currentPeriodStart: new Date((subscription as any).current_period_end * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000)
      });

      // Enable vault access
      await this.dbService.updateUserSubscriptionTier(userId, 'pro');
      
    } catch (error) {
      console.error('Failed to handle subscription creation:', error);
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    
    if (!userId) {
      // Try to find user by subscription ID
      const dbSubscription = await this.dbService.getSubscriptionByStripeId(subscription.id);
      if (!dbSubscription) {
        console.error('No user found for subscription:', subscription.id);
        return;
      }
    }

    console.log(`Subscription updated for user ${userId}: ${subscription.status}`);
    
    try {
      await this.dbService.createOrUpdateSubscription({
        userId: userId || subscription.metadata?.userId!,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        planId: subscription.items.data[0]?.price.id || 'vault_monthly',
        currentPeriodStart: new Date((subscription as any).current_period_end * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000)
      });

      // Update user tier based on status
      const tier = subscription.status === 'active' ? 'pro' : 'free';
      await this.dbService.updateUserSubscriptionTier(userId || subscription.metadata?.userId!, tier);
      
    } catch (error) {
      console.error('Failed to handle subscription update:', error);
    }
  }

  private async handleSubscriptionCancelled(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    
    if (!userId) {
      const dbSubscription = await this.dbService.getSubscriptionByStripeId(subscription.id);
      if (!dbSubscription) {
        console.error('No user found for subscription:', subscription.id);
        return;
      }
    }

    console.log(`Subscription cancelled for user ${userId}: ${subscription.id}`);
    
    try {
      // Update subscription status
      await this.dbService.updateSubscriptionStatus(userId || subscription.metadata?.userId!, 'cancelled');
      
      // Disable vault access
      await this.dbService.updateUserSubscriptionTier(userId || subscription.metadata?.userId!, 'free');
      
    } catch (error) {
      console.error('Failed to handle subscription cancellation:', error);
    }
  }

  private async handlePaymentSucceeded(invoice: IStripeInvoice) {
    console.log(`Payment succeeded for subscription: ${invoice?.subscription}`);
    
    try {
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = subscription.metadata?.userId;
        
        if (userId) {
          // Ensure subscription is active and user has pro access
          await this.dbService.updateSubscriptionStatus(userId, 'active');
          await this.dbService.updateUserSubscriptionTier(userId, 'pro');
        }
      }
    } catch (error) {
      console.error('Failed to handle payment success:', error);
    }
  }

  private async handlePaymentFailed(invoice: IStripeInvoice) {
    console.log(`Payment failed for subscription: ${invoice.subscription}`);
    
    try {
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = subscription.metadata?.userId;
        
        if (userId) {
          // Update status but don't immediately downgrade - give grace period
          await this.dbService.updateSubscriptionStatus(userId, 'past_due');
          // TODO: send an email notification here
        }
      }
    } catch (error) {
      console.error('Failed to handle payment failure:', error);
    }
  }

  /**
   * Get subscription details by customer ID
   */
  async getSubscription(customerId: string): Promise<Stripe.Subscription | null> {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      });

      return subscriptions.data[0] || null;

    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * Get user subscription from database
   */
  async getUserSubscription(userId: string): Promise<DbUserSubscription | null> {
    try {
      return await this.dbService.getUserSubscription(userId);
    } catch (error) {
      console.error('Failed to get user subscription:', error);
      return null;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });

    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw createError('Subscription cancellation failed', 500);
    }
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.dbService.getUserSubscription(userId);
      return subscription?.status === 'active' || subscription?.status === 'trialing';
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }
}