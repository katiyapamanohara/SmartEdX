export interface PricingPlan {
  planID: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  isPopular?: boolean;
  trialDays?: number;
  stripePriceId?: string;
}

export interface UserSubscription {
  subscriptionID: string;
  userID: string;
  planID: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'canceling' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  endDate?: string;
}

export interface StripeCheckoutResponse {
  checkoutUrl?: string;
  url?: string;
  sessionId?: string;
  [key: string]: unknown;
}