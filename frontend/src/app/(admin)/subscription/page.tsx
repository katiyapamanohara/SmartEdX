"use client";
import React, { useState, useEffect } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { CheckLineIcon, BoltIcon, ShootingStarIcon, BoxCubeIcon, ArrowRightIcon } from "../../../icons";
import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";
import { useSubscribe } from "@/hooks/useSubscription";
import type { PricingPlan } from "@/types/subscription";

// Helper function to get plan icon based on name or type
const getPlanIcon = (planName: string) => {
  const name = planName.toLowerCase();
  if (name.includes('starter') || name.includes('basic')) {
    return <BoxCubeIcon className="w-6 h-6 text-gray-500" />;
  } else if (name.includes('smart') || name.includes('pro') || name.includes('business')) {
    return <BoltIcon className="w-6 h-6 text-blue-500" />;
  } else if (name.includes('enterprise') || name.includes('premium') || name.includes('sophisticated')) {
    return <ShootingStarIcon className="w-6 h-6 text-purple-500" />;
  }
  return <BoxCubeIcon className="w-6 h-6 text-brand-500" />;
};

// Helper function to get plan styling based on name or type
const getPlanStyling = (planName: string, index: number) => {
  const name = planName.toLowerCase();
  if (name.includes('starter') || name.includes('basic')) {
    return {
      bgGradient: "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900",
      borderColor: "border-gray-200 dark:border-gray-700"
    };
  } else if (name.includes('smart') || name.includes('pro') || name.includes('business')) {
    return {
      bgGradient: "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30",
      borderColor: "border-blue-200 dark:border-blue-800"
    };
  } else if (name.includes('enterprise') || name.includes('premium') || name.includes('sophisticated')) {
    return {
      bgGradient: "bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30",
      borderColor: "border-purple-200 dark:border-purple-800"
    };
  }

  // Default styling for unknown plans
  const colors = [
    { bgGradient: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30", borderColor: "border-green-200 dark:border-green-800" },
    { bgGradient: "bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/30 dark:to-red-900/30", borderColor: "border-orange-200 dark:border-orange-800" },
    { bgGradient: "bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30", borderColor: "border-teal-200 dark:border-teal-800" }
  ];
  return colors[index % colors.length];
};

const SubscriptionPage = () => {
  const [animateIndex, setAnimateIndex] = useState<number | null>(null);
  const [scope, animate] = useAnimate();

  // Fetch pricing plans and user subscription
  const { plans, monthlyPlans, currentSubscription, loading, error } = useSubscription();

  // Use the subscription hook for Stripe checkout
  const { managePayment, isLoading: isSubscribing } = useSubscribe();

  //only show the monthly plans in the subscriptions page 
  const displayPlans = monthlyPlans.slice(0, 3);

  // Find current plan
  const currentPlan = currentSubscription ? plans.find((plan: PricingPlan) => plan.planID === currentSubscription.planID) : null;

  useEffect(() => {
    // Animate subscription components on mount - matching Assistant component style
    const sequence = async () => {
      try {
        // Check if elements exist before animating
        if (scope.current) {
          // First animate borders
          const borders = scope.current.querySelectorAll(".animated-border");
          if (borders.length > 0) {
            await animate([
              [".animated-border", { borderColor: "rgba(156, 163, 175, 0.3)" }, { duration: 0.35, delay: stagger(0.02) }]
            ]);
          }

          // Then animate cards with spring physics
          const cards = scope.current.querySelectorAll(".animated-card");
          if (cards.length > 0) {
            await animate([
              [".animated-card",
                { opacity: 1, y: 0 },
                {
                  type: "spring" as const,
                  stiffness: 500,
                  damping: 28,
                  mass: 0.6,
                  delay: stagger(0.02)
                }
              ]
            ]);
          }

          // Finally animate content
          const content = scope.current.querySelectorAll(".animated-content");
          if (content.length > 0) {
            await animate([
              [".animated-content",
                { opacity: 1, y: 0 },
                {
                  type: "spring" as const,
                  stiffness: 600,
                  damping: 30,
                  mass: 0.5,
                  delay: stagger(0.01)
                }
              ]
            ]);
          }
        }
      } catch (error) {
        console.error("Animation error:", error);
      }
    };

    // Add a small delay to ensure DOM elements are rendered
    const timeoutId = setTimeout(() => {
      sequence();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [animate, scope]);

  // Define animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25,
        mass: 0.7
      }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 500,
        damping: 30,
        mass: 0.5
      }
    }
  };

  const handleHoverIn = (index: number) => {
    setAnimateIndex(index);
  };

  const handleHoverOut = () => {
    setAnimateIndex(null);
  };

  // Handle loading and error states
  if (loading || !plans) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  // Show error but only if we don't have any plans data
  if (error && plans.length === 0) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }


  return (
    <motion.div ref={scope} className="p-4" initial="hidden" animate="visible">
      
      <motion.div
        className="mb-8 text-center animated-content"
        initial={{ opacity: 0, y: 20 }}
        variants={contentVariants}
      >
        <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
          {currentSubscription && currentPlan ? 'Your Subscription' : 'Subscribe to Get Started'}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {currentSubscription && currentPlan 
            ? 'Manage your current subscription and explore other plans' 
            : 'Choose a plan that works best for your business needs'}
        </p>
      </motion.div>

      {/* Current Plan - Featured Card - Only showing if user has an active subscription */}
      {currentSubscription && currentPlan && (
        <motion.div
          className="mb-12 relative animated-card"
          initial={{ opacity: 0, y: 30 }}
          variants={cardVariants}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl blur-xl opacity-30 dark:opacity-40"></div>
          <motion.div
            className="relative p-1 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 animated-border"
          >
            <div className="w-full bg-white dark:bg-gray-900 rounded-lg p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between">
                <div className="flex items-start">
                  <motion.div
                    className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 mr-4 animated-content"
                    initial={{ opacity: 0, scale: 0.8 }}
                    variants={contentVariants}
                  >
                    {getPlanIcon(currentPlan.name || currentPlan.planID)}
                  </motion.div>
                  <motion.div className="animated-content" initial={{ opacity: 0, y: 20 }} variants={contentVariants}>
                    <div className="flex items-center">
                      <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                        {currentPlan.name || currentPlan.planID} Plan
                      </h2>
                      <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 rounded-full">
                        CURRENT
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {currentSubscription?.currentPeriodEnd
                        ? `Your plan ${currentSubscription.cancelAtPeriodEnd ? 'expires' : 'renews'} on ${new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}`
                        : 'Active subscription'
                      }
                    </p>
                  </motion.div>
                </div>
                <motion.div
                  className="mt-4 lg:mt-0 animated-content"
                  initial={{ opacity: 0, y: 20 }}
                  variants={contentVariants}
                >
                  <div className="text-center lg:text-right">
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                      {currentPlan.currency === 'USD' ? '$' : currentPlan.currency}{currentPlan.price}
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        /{currentPlan.interval === 'yearly' ? 'year' : 'month'}
                      </span>
                    </p>
                    <motion.button
                      className="mt-2 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      onClick={() => managePayment()}
                      disabled={isSubscribing}
                    >
                      {isSubscribing ? 'Processing...' : 'Manage Payment'}
                    </motion.button>
                  </div>
                </motion.div>
              </div>

              <motion.div
                className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4 animated-content"
                initial={{ opacity: 0, y: 20 }}
                variants={contentVariants}
              >
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Features included:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentPlan.features.map((feature: string, index: number) => (
                    <motion.div
                      key={index}
                      className="flex items-center animated-content"
                      initial={{ opacity: 0, x: -10 }}
                      variants={contentVariants}
                    >
                      <CheckLineIcon className="w-4 h-4 mr-2 text-green-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-300">{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Available Plans */}
      <motion.div
        className="mb-6 animated-content"
        initial={{ opacity: 0, y: 20 }}
        variants={contentVariants}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 sm:mb-0">
            {currentSubscription && currentPlan ? 'Available Plans' : 'Choose Your Plan'}
          </h2>
          <Link
            href="/pricing"
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
          >
            See all pricing options
            <div className="flex items-center justify-center ml-1 w-4 h-4">
              <ArrowRightIcon className="w-6 h-4" />
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayPlans && displayPlans.length > 0 && displayPlans
            .filter((plan: PricingPlan) => !currentPlan || plan.planID !== currentPlan.planID) // Don't show current plan in available plans if user has one
            .map((plan: PricingPlan, index: number) => {
              const styling = getPlanStyling(plan.name || plan.planID, index);
              return (
                <motion.div
                  key={plan.planID}
                  className={`relative overflow-hidden rounded-xl border ${styling.borderColor} transition-all duration-300 hover:shadow-xl animated-card animated-border h-full`}
                  initial={{ opacity: 0, y: 30 }}
                  variants={cardVariants}
                  onMouseEnter={() => handleHoverIn(index)}
                  onMouseLeave={handleHoverOut}
                >
                  <div className={`${styling.bgGradient} p-4 h-full flex flex-col`}>
                    <motion.div
                      className="flex items-center mb-2 animated-content"
                      initial={{ opacity: 0, y: 10 }}
                      variants={contentVariants}
                    >
                      <motion.div
                        className="p-1.5 rounded-lg bg-white/80 dark:bg-gray-800/50 mr-2 flex items-center justify-center"
                      >
                        {getPlanIcon(plan.name || plan.planID)}
                      </motion.div>
                      <h3 className="font-bold text-sm text-gray-800 dark:text-white">
                        {plan.name || plan.planID}
                      </h3>
                    </motion.div>

                    <motion.p
                      className="text-xs text-gray-600 dark:text-gray-300 mb-2 animated-content"
                      initial={{ opacity: 0, y: 10 }}
                      variants={contentVariants}
                    >
                      {plan.description || `${plan.name || plan.planID} plan with ${plan.interval || 'monthly'} billing`}
                    </motion.p>

                    <motion.div
                      className="mb-3 animated-content"
                      initial={{ opacity: 0, y: 10 }}
                      variants={contentVariants}
                    >
                      <p className="text-xl font-bold text-gray-800 dark:text-white">
                        {plan.currency === 'USD' ? '$' : plan.currency}{plan.price}
                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                          /{plan.interval === 'yearly' ? 'year' : 'month'}
                        </span>
                      </p>
                    </motion.div>

                    <motion.div
                      className="space-y-2 mb-4 flex-grow animated-content"
                      initial={{ opacity: 0, y: 10 }}
                      variants={contentVariants}
                    >
                      {/* Display available features */}
                      {plan.features.map((feature: string, idx: number) => (
                        <motion.div
                          key={`feature-${idx}`}
                          className="flex items-center"
                          initial={{ opacity: 0, x: -10 }}
                          variants={contentVariants}
                        >
                          <CheckLineIcon className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                          <span className="text-xs text-gray-600 dark:text-gray-300">{feature}</span>
                        </motion.div>
                      ))}
                    </motion.div>

                    <div className="flex flex-col space-y-2 mt-auto">
                      <Link href="/pricing">
                        <motion.div
                          className="group flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all animated-content"
                          initial={{ opacity: 0, y: 10 }}
                          variants={contentVariants}
                        >
                          <span className="text-sm font-medium text-gray-800 dark:text-white">View more details</span>
                          <div className="flex items-center justify-center w-5 h-5">
                            <motion.div
                              animate={{ x: animateIndex === index ? 4 : 0 }}
                              transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
                            >
                              <ArrowRightIcon className={`w-4 h-4 ${index === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`} />
                            </motion.div>
                          </div>
                        </motion.div>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </motion.div>

      {/* Additional Information */}
      <motion.div
        className="mt-16 text-center animated-content"
        initial={{ opacity: 0, y: 20 }}
        variants={contentVariants}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Need help choosing the right plan? Contact our sales team.
        </p>
        <motion.button
          onClick={() => window.location.href = 'mailto:sales@articom.io'}
          className="px-5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          Contact Sales
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default SubscriptionPage;
