export interface DbUserSubscription {
    id: string;
    user_id: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    status: string;
    plan_id: string;
    current_period_start?: string;
    current_period_end?: string;
    created_at: string;
    updated_at: string;
  }