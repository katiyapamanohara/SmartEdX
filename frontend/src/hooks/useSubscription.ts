import { useState, useEffect, useRef } from 'react';
import { subscriptionService } from '@/services/subscriptionService';
import { TokenManager } from '@/utils/tokenManager';
import type { PricingPlan, UserSubscription } from '@/types/subscription';
import { useAuth } from '@/context/AuthContext';
import posthog from 'posthog-js';

interface UseSubscriptionReturn {
  plans: PricingPlan[];
  monthlyPlans: PricingPlan[];
  currentSubscription: UserSubscription | null;
  loading: boolean;
  error: string | null;
}

// Helper function to compare subscription states
const getSubscriptionState = (subscription: UserSubscription | null) => {
  if (!subscription) return { type: 'none', planID: null, status: null };
  return {
    type: 'subscription',
    planID: subscription.planID,
    status: subscription.status,
    subscriptionID: subscription.subscriptionID
  };
};

// Helper function to get consistent storage key
const getSubscriptionStateKey = (userID?: string) => {
  return userID ? `subscription_state_${userID}` : 'subscription_state';
};

export const useSubscription = (): UseSubscriptionReturn => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [monthlyPlans, setMonthlyPlans] = useState<PricingPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        setLoading(true);
        setError(null);

        const pricingPlans = await subscriptionService.fetchPricingPlans();
        setPlans(pricingPlans);

        // Filter monthly plans
        const monthlyPlans = pricingPlans.filter((plan: PricingPlan) =>
          plan.interval === 'monthly' ||
          plan.planID.toLowerCase().includes('monthly')
        );
        setMonthlyPlans(monthlyPlans);

        // Fetch current subscription
        const token = TokenManager.getAccessToken();
        const isTokenValid = token && !TokenManager.isTokenExpired(token);

        if (user?.userID || isTokenValid) {
          try {
            const subscription = await subscriptionService.fetchActiveSubscription();
            setCurrentSubscription(subscription);

            // Only identify user for analytics (no event tracking here)
            if (subscription?.status === 'active') {
              posthog.identify(user?.userID, {
                plan: subscription.planID,
                isSubscriber: true,
                subscriptionId: subscription.subscriptionID
              });
            }

          } catch (subscriptionError) {
            console.error('Error fetching active subscription:', subscriptionError);
            setCurrentSubscription(null);
          }
        } else {
          setCurrentSubscription(null);
        }
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subscription data');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [user?.userID]);

  return {
    plans,
    monthlyPlans,
    currentSubscription,
    loading,
    error
  };
};

// Global subscription tracking hook that can be used anywhere
export const useSubscriptionTracker = () => {
  const { user } = useAuth();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    // Always reset tracking when user changes (login/logout)
    hasTrackedRef.current = false;

    //Reset previous subscription state when user logs out
    if (!user?.userID) {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith('subscription_state_')) {
          localStorage.removeItem(key);
        }
      });
    }

    const checkForSubscriptionChanges = async () => {
      // Only run once per page load/user change
      if (hasTrackedRef.current) return;
      hasTrackedRef.current = true;

      const token = TokenManager.getAccessToken();
      const isTokenValid = token && !TokenManager.isTokenExpired(token);

      if (user?.userID || isTokenValid) {
        try {
          const storageKey = getSubscriptionStateKey(user?.userID);
          const storedPreviousState = localStorage.getItem(storageKey);
          const previousState = storedPreviousState ? JSON.parse(storedPreviousState) : null;

          await new Promise(resolve => setTimeout(resolve, 1000)); // wait for webhook sync

          const subscription = await subscriptionService.fetchActiveSubscription();
          const currentState = getSubscriptionState(subscription);

          // Track events based on state changes
          if (previousState) {
            if (
              previousState.type === 'none' &&
              currentState.type === 'subscription' &&
              currentState.status === 'active'
            ) {
              posthog.capture('subscription_completed', {
                planId: currentState.planID,
                subscriptionId: currentState.subscriptionID,
                timestamp: new Date().toISOString(),
                source: 'checkout_return',
                scenario: 'new_subscription'
              });
            } else if (
              previousState.type === 'subscription' &&
              currentState.type === 'subscription' &&
              (previousState.status === 'active' || previousState.status === 'canceling') &&
              currentState.status === 'active' &&
              previousState.subscriptionID !== currentState.subscriptionID
            ) {
              posthog.capture('subscription_plan_changed', {
                oldPlanId: previousState.planID,
                newPlanId: currentState.planID,
                subscriptionId: currentState.subscriptionID,
                timestamp: new Date().toISOString(),
                source: 'portal_return'
              });
            } else if (
              previousState.type === 'subscription' &&
              currentState.type === 'subscription' &&
              previousState.status === 'active' &&
              (currentState.status === 'canceling' || currentState.status === 'canceled')
            ) {
              posthog.capture('subscription_cancelled', {
                planId: currentState.planID,
                subscriptionId: currentState.subscriptionID,
                previousStatus: previousState.status,
                newStatus: currentState.status,
                timestamp: new Date().toISOString(),
                source: 'portal_return'
              });
            } else if (
              previousState.type === 'subscription' &&
              currentState.type === 'subscription' &&
              (previousState.status === 'canceling' || previousState.status === 'canceled') &&
              currentState.status === 'active' &&
              previousState.planID === currentState.planID &&
              previousState.subscriptionID === currentState.subscriptionID
            ) {
              posthog.capture('subscription_reactivated', {
                planId: currentState.planID,
                subscriptionId: currentState.subscriptionID,
                previousStatus: previousState.status,
                timestamp: new Date().toISOString(),
                source: 'portal_return'
              });
            } else {
            }
          } else {
            // No previous state: check if came from checkout
            const urlParams = new URLSearchParams(window.location.search);
            const isFromCheckout = urlParams.has('success') ||
              urlParams.has('session_id') ||
              document.referrer.includes('checkout.stripe.com');

            if (currentState.type === 'subscription' && currentState.status === 'active') {
              if (isFromCheckout) {
                posthog.capture('subscription_completed', {
                  planId: currentState.planID,
                  subscriptionId: currentState.subscriptionID,
                  timestamp: new Date().toISOString(),
                  source: 'checkout_return',
                  scenario: 'new_subscription_no_previous_state'
                });

              }
            }
          }

          // Identify user and set subscription properties
          if (subscription?.status === 'active') {
            posthog.identify(user?.userID, {
              plan: subscription.planID,
              isSubscriber: true,
              subscriptionId: subscription.subscriptionID
            });
          } else {
            posthog.identify(user?.userID, {
              isSubscriber: false
            });
          }

          // Store new state
          localStorage.setItem(storageKey, JSON.stringify(currentState));

        } catch (error) {
          console.error('Error checking subscription changes:', error);
        }
      }
    };

    const timer = setTimeout(checkForSubscriptionChanges, 100);
    return () => clearTimeout(timer);
  }, [user?.userID]);

  //Optional (recommended): Clean the URL after Stripe return
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('success') || url.searchParams.has('session_id')) {
      url.searchParams.delete('success');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, document.title, url.pathname);
    }
  }, []);
};


interface UseSubscribeReturn {
  subscribe: (planID: string) => Promise<void>;
  managePayment: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const useSubscribe = (): UseSubscribeReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const subscribe = async (planID: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Store current subscription state before redirecting
      const token = TokenManager.getAccessToken();
      const isTokenValid = token && !TokenManager.isTokenExpired(token);

      if (isTokenValid) {
        try {
          const currentSubscription = await subscriptionService.fetchActiveSubscription();
          const currentState = getSubscriptionState(currentSubscription);

          // FIXED: Use consistent storage key
          const storageKey = getSubscriptionStateKey(user?.userID);
          localStorage.setItem(storageKey, JSON.stringify(currentState));

        } catch (error) {
          console.error('Error storing subscription state:', error);
        }
      }

      // Track subscription attempt (when user clicks subscribe)
      posthog.capture('subscription_initiated', {
        planId: planID,
        timestamp: new Date().toISOString(),
        source: 'subscription_page'
      });

      const checkoutUrl = await subscriptionService.createStripeCheckoutSession(planID);

      if (checkoutUrl) {
        // Track checkout redirect
        posthog.capture('checkout_redirect', {
          planId: planID,
          timestamp: new Date().toISOString(),
          destination: 'stripe_checkout'
        });

        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (err) {
      console.error('Error creating subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to create subscription');

      // Track subscription failure
      posthog.capture('subscription_failed', {
        planId: planID,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        stage: 'checkout_creation'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const managePayment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Store current subscription state before redirecting to portal
      const token = TokenManager.getAccessToken();
      const isTokenValid = token && !TokenManager.isTokenExpired(token);

      if (isTokenValid) {
        try {
          const currentSubscription = await subscriptionService.fetchActiveSubscription();
          const currentState = getSubscriptionState(currentSubscription);

          // FIXED: Use consistent storage key
          const storageKey = getSubscriptionStateKey(user?.userID);
          localStorage.setItem(storageKey, JSON.stringify(currentState));

        } catch (error) {
          console.error('Error storing subscription state:', error);
        }
      }

      // Track portal access attempt
      posthog.capture('billing_portal_initiated', {
        timestamp: new Date().toISOString(),
        source: 'manage_subscription'
      });

      const portalUrl = await subscriptionService.createStripePortalSession();

      if (portalUrl) {
        // Track portal redirect
        posthog.capture('portal_redirect', {
          timestamp: new Date().toISOString(),
          destination: 'stripe_portal'
        });

        window.location.href = portalUrl;
      } else {
        throw new Error('No portal URL received from server');
      }
    } catch (err) {
      console.error('Error creating portal session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create portal session');

      // Track portal failure
      posthog.capture('billing_portal_failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        stage: 'portal_creation'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    subscribe,
    managePayment,
    isLoading,
    error
  };
};