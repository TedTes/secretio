import Stripe from 'stripe';
import { createError } from '../middleware/errorHandler';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

interface IStripeInvoice extends Stripe.Invoice {
 subscription:string;
}
export class StripeService {
  
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
    
    // Update user subscription status in database
    // This will be implemented when we have the subscription table
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    
    if (!userId) {
      console.error('No user ID in subscription:', subscription.id);
      return;
    }

    console.log(`Subscription created for user ${userId}: ${subscription.id}`);
    
    // Store subscription details in database
    // Enable vault access for user
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    console.log(`Subscription updated for user ${userId}: ${subscription.status}`);
    
    // Update subscription status in database
  }

  private async handleSubscriptionCancelled(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    console.log(`Subscription cancelled for user ${userId}: ${subscription.id}`);
    
    // Disable vault access
    // Update user status
  }

  private async handlePaymentSucceeded(invoice: IStripeInvoice) {
    console.log(`Payment succeeded for subscription: ${invoice?.subscription}`);
    // Log successful payment
  }

  private async handlePaymentFailed(invoice: IStripeInvoice) {
    console.log(`Payment failed for subscription: ${invoice.subscription}`);
    // Handle failed payment (email user, grace period, etc.)
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
}