import type { PricingPlan, UserSubscription, StripeCheckoutResponse } from '@/types/subscription';
import { TokenManager } from '@/utils/tokenManager';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface ApiPricingPlan {
  planID: string;
  price: string;
  currency: string;
  stripePriceID: string;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: null | string;
}

class SubscriptionService {
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    try {
      const token = TokenManager.getAccessToken();
      if (token && !TokenManager.isTokenExpired(token)) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      console.warn('Auth token not available or expired, proceeding without authentication');
    }

    return headers;
  }

  async fetchPricingPlans(): Promise<PricingPlan[]> {
    try {      
      const response = await fetch(`${API_BASE_URL}/pricing-plans`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pricing plans fetch failed:', response.status, response.statusText, errorText);
        throw new Error(`Failed to fetch pricing plans: ${response.status} ${response.statusText}`);
      }

      const apiPlans: ApiPricingPlan[] = await response.json();

      // Transform API response to match frontend types
      return apiPlans.map(plan => {
        // Extract interval from the planID (e.g., "starter-monthly" => "monthly")
        const interval = plan.planID.includes('-') ? plan.planID.split('-')[1] : 'monthly';

        // Extract name from the planID (e.g., "starter-monthly" => "Starter")
        const name = plan.planID.includes('-')
          ? plan.planID.split('-')[0].charAt(0).toUpperCase() + plan.planID.split('-')[0].slice(1)
          : plan.planID;

        return {
          planID: plan.planID,
          name: name,
          description: `${name} plan with ${interval} billing`,
          price: parseFloat(plan.price),
          currency: plan.currency,
          interval: interval,
          features: plan.features.filter(feature =>
            !feature.startsWith('Everything in') &&
            !feature.includes(' plus:')
          ),
          isPopular: false,
          trialDays: 0,
          stripePriceId: plan.stripePriceID
        };
      });
    } catch (error) {
      console.error('Error fetching pricing plans:', error);
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
      }
      
      // Check if API_BASE_URL is configured
      if (!API_BASE_URL) {
        throw new Error('API configuration error: API_BASE_URL is not configured.');
      }
      
      throw error;
    }
  }

  async createStripeCheckoutSession(planID: string): Promise<string> {
    try {
      // Set the success URL to the current dashboard
      const successUrl = window.location.origin;
      // Set the cancel URL to the pricing page
      const cancelUrl = `${window.location.origin}/pricing`;

      // Check for a valid token before making the request
      const token = TokenManager.getAccessToken();
      if (!token || TokenManager.isTokenExpired(token)) {
        throw new Error('Authentication required. Please log in to subscribe.');
      }

      const response = await fetch(`${API_BASE_URL}/subscriptions/stripe/create-session`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          planID,
          successUrl,
          cancelUrl
        })
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Failed to create checkout session: ${response.status} ${response.statusText}. Response: ${responseText}`);
      }

      // Try to parse the JSON response
      let data: StripeCheckoutResponse;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Invalid response format from server');
      }

      // Check for checkoutUrl or url in the response
      const checkoutUrl = data.checkoutUrl || data.url;
      if (!checkoutUrl) {
        console.error('Response data:', data);
        throw new Error('No checkout URL returned from server');
      }

      return checkoutUrl; // Return the Stripe checkout URL
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error);
      throw error;
    }
  }

  async createStripePortalSession(): Promise<string> {
    try {
      // Set the return URL to the current dashboard
      const returnUrl = window.location.origin;

      // Check for a valid token before making the request
      const token = TokenManager.getAccessToken();
      if (!token || TokenManager.isTokenExpired(token)) {
        throw new Error('Authentication required. Please log in to manage payment.');
      }

      const response = await fetch(`${API_BASE_URL}/subscriptions/stripe/create-portal-session`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          returnUrl
        })
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Failed to create portal session: ${response.status} ${response.statusText}. Response: ${responseText}`);
      }

      // Try to parse the JSON response
      let data: StripeCheckoutResponse;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Invalid response format from server');
      }

      // Check for checkoutUrl or url in the response
      const portalUrl = data.checkoutUrl || data.url;
      if (!portalUrl) {
        console.error('Response data:', data);
        throw new Error('No portal URL returned from server');
      }

      return portalUrl;
    } catch (error) {
      console.error('Error creating Stripe portal session:', error);
      throw error;
    }
  }

  async fetchActiveSubscription(): Promise<UserSubscription | null> {
    try {
      const token = TokenManager.getAccessToken();

      if (!token || TokenManager.isTokenExpired(token)) {
        console.warn('Authentication required to fetch active subscription - Token expired or missing');
        return null;
      }

      // Extract userID from the token
      let userID: string;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Check common properties where user ID might be stored
        userID = payload.id || payload.userId || payload.userID || payload.sub || payload.user_id;

        if (!userID) {
          for (const key in payload) {
            const value = payload[key];
            if (typeof value === 'string' &&
              (key.toLowerCase().includes('id') || key === 'sub') &&
              value.length > 8) { 
              userID = value;
              break;
            }
          }
        }

        if (!userID) {
          console.error('User ID not found in token, payload keys:', Object.keys(payload));
          return null;
        }
      } catch (e) {
        console.error('Failed to extract user ID from token:', e);
        return null;
      }

      const activeUrl = `${API_BASE_URL}/subscriptions/user/${userID}/active`;
      const headers = this.getAuthHeaders();

      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(activeUrl, {
          method: 'GET',
          headers: headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Handle different status codes
        if (response.status === 401) {
          console.error('Authentication failed when fetching subscription:', await response.text());
          return null;
        } else if (response.status === 403) {
          console.error('Forbidden: Permission denied when fetching subscription:', await response.text());
          return null;
        } else if (response.status === 404) {
          return null;
        } else if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch active subscription: ${response.status} ${response.statusText}. Response: ${errorText}`);
          return null;
        }

        // Parse the API response
        const responseText = await response.text();

        // Try to parse the JSON response
        const subscriptionData = JSON.parse(responseText);

        // Transform API response to the expected UserSubscription format
        const subscription: UserSubscription = {
          subscriptionID: subscriptionData.subscriptionID || subscriptionData.id || '',
          userID: subscriptionData.userID || subscriptionData.user_id || userID,
          planID: subscriptionData.planID || subscriptionData.plan_id || '',
          status: subscriptionData.status || 'active',
          currentPeriodStart: subscriptionData.currentPeriodStart || subscriptionData.current_period_start || new Date().toISOString(),
          currentPeriodEnd: subscriptionData.currentPeriodEnd || subscriptionData.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || subscriptionData.cancel_at_period_end || false
        };

        return subscription;
      } catch (fetchError: unknown) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('Fetch request timed out');
        } else {
          console.error('Error during fetch:', fetchError);
        }
        return null;
      }
    } catch (error) {
      console.error('Error fetching active subscription:', error);
      return null;
    }
  }

}

export const subscriptionService = new SubscriptionService();