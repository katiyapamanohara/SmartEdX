"use client";
import React, { useState, useEffect } from "react";
import { CheckLineIcon, BoltIcon, ShootingStarIcon, BoxCubeIcon, ChevronLeftIcon } from "../../../icons";
import Link from "next/link";
import Image from "next/image";
import { useSubscription } from "@/hooks/useSubscription";
import { useSubscribe } from "@/hooks/useSubscription";
import { useAuth } from "@/context/AuthContext";

// Helper function to get plan icon based on name or type
const getPlanIcon = (planName: string) => {
  const name = planName.toLowerCase();
  if (name.includes('starter') || name.includes('basic')) {
    return <BoxCubeIcon className="w-10 h-10 text-gray-600 dark:text-gray-300" />;
  } else if (name.includes('smart') || name.includes('pro') || name.includes('business')) {
    return <BoltIcon className="w-10 h-10 text-blue-600" />;
  } else if (name.includes('enterprise') || name.includes('premium') || name.includes('sophisticated')) {
    return <ShootingStarIcon className="w-10 h-10 text-purple-600" />;
  }
  return <BoxCubeIcon className="w-10 h-10 text-brand-500" />;
};

// Helper function to get plan styling based on name or type
const getPlanStyling = (planName: string) => {
  const name = planName.toLowerCase();
  
  // For all paid plans (no free plans)
  if (name.includes('smarter') || name.includes('pro')) {
    return {
      highlight: true,
      buttonStyle: "bg-blue-600 text-white hover:bg-blue-700",
      buttonText: "Subscribe Now",
      buttonAction: "subscribe",
      popularText: "Most popular choice for SMBs"
    };
  } else {
    // Any other paid plan - give same treatment as popular plan
    return {
      highlight: true, // Changed to true to add blue border
      buttonStyle: "bg-blue-600 text-white hover:bg-blue-700", 
      buttonText: "Subscribe Now",
      buttonAction: "subscribe",
      popularText: "" // No text for popular choice
    };
  }
};

// Helper function to get plan description
const getPlanDescription = (planName: string) => {
  const name = planName.toLowerCase();
  if (name.includes('starter') || name.includes('free') || name.includes('basic')) {
    return "Perfect for individuals and small teams just getting started";
  } else if (name.includes('smart') || name.includes('pro')) {
    return "Perfect for growing businesses with more advanced needs";
  } else if (name.includes('sophisticated') || name.includes('premium') || name.includes('enterprise')) {
    return "For enterprise-level businesses with complex requirements";
  }
  return "Flexible plan for your needs";
};

// FAQ data
const faqItems = [
  {
    question: "Can I switch plans anytime?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes to billing will be prorated based on the remaining days in your billing cycle."
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 14-day money-back guarantee for all our paid plans. If you're not satisfied with our service, you can request a full refund within this period."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for annual plans. Cryptocurrency payments are coming soon."
  },
  {
    question: "Can I cancel my subscription?",
    answer: "Yes, you can cancel your subscription at any time from your account settings. You'll continue to have access to your paid features until the end of your billing period."
  },
  {
    question: "Are there any long-term commitments?",
    answer: "No, there are no long-term commitments with our monthly plans. Annual plans are billed for the full year but come with a 14-day refund policy."
  },
  {
    question: "Do you offer customized enterprise solutions?",
    answer: "Yes, for larger organizations with specific needs, we offer customized enterprise solutions. Please contact our sales team to discuss your requirements."
  }
];

export default function PricingPage() {
  const [isMonthly, setIsMonthly] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isClientSide, setIsClientSide] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  
  // Get authentication state
  const { isAuthenticated } = useAuth();
  
  // Fetch pricing plans using the useSubscription hook
  const { plans, loading, error } = useSubscription();
  
  // Use the subscription hook
  const { subscribe, error: subscribeError } = useSubscribe();
  
  // Only show client-side rendered content after hydration is complete
  useEffect(() => {
    setIsClientSide(true);
  }, []);
  
  // Filter plans based on billing interval (monthly/yearly)
  const monthlyPlans = plans.filter(plan => 
    plan.interval === 'monthly' || 
    plan.planID.toLowerCase().includes('monthly')
  );
  
  const yearlyPlans = plans.filter(plan => 
    plan.interval === 'yearly' || 
    plan.planID.toLowerCase().includes('yearly')
  );
  
  // Select plans to display based on the selected tab
  const displayPlans = isMonthly ? monthlyPlans : yearlyPlans;
  
  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };
  
  // Handle subscription button click
  const handleSubscribe = async (planID: string) => {
    try {      
      setLoadingPlanId(planID);
      await subscribe(planID);      
    } catch (error) {
      console.error("Subscription error:", error);
    } finally {
      setLoadingPlanId(null);
    }
  };
  
  return (
    
    <div className="relative overflow-hidden bg-white dark:bg-gray-900">
        <div className="absolute top-5 left-5 sm:top-10 sm:left-8 z-10">
        <Link
          href="/subscription"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          Back to Subscription
        </Link>
      </div>
      <div className="absolute top-5 right-5 sm:top-10 sm:right-8 z-10">
        <Link href="/">
          <Image
            width={120}
            height={30}
            className="dark:hidden"
            src="/images/logo/articom-light-logo.svg"
            alt="Articom Logo"
          />
          <Image
            width={120}
            height={30}
            className="hidden dark:block"
            src="/images/logo/articom-dark-logo.svg"
            alt="Articom Logo"
          />
        </Link>
      </div>
      {/* Background Elements */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-900/10 dark:to-transparent"></div>
      <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-purple-100 dark:bg-purple-900/20 blur-3xl opacity-70"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-100 dark:bg-blue-900/20 blur-3xl opacity-70"></div>
      
      <div className="relative py-16 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <div className="mx-auto w-full max-w-[700px] text-center mb-16">
          <h1 className="font-bold text-gray-800 mb-4 text-4xl md:text-5xl dark:text-white/90">
            Simple, Transparent Pricing
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">
            Choose the perfect plan for your business needs with no hidden fees
          </p>
          
          {/* Billing Toggle */}
          <div className="mb-8 text-center">
            <div className="relative inline-flex p-1 mx-auto bg-gray-200 rounded-full z-1 dark:bg-gray-800">
              <span
                className={`absolute top-1/2 -z-1 flex h-11 w-[120px] -translate-y-1/2 rounded-full bg-white shadow-theme-xs duration-200 ease-linear dark:bg-white/10 ${
                  isMonthly ? "translate-x-0" : "translate-x-full"
                }`}
              ></span>
              <button
                onClick={() => setIsMonthly(true)}
                className={`flex h-11 w-[120px] items-center justify-center text-base font-medium ${
                  isMonthly
                    ? "text-gray-800 dark:text-white/90"
                    : "text-gray-600 dark:text-white/50"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsMonthly(false)}
                className={`flex h-11 w-[120px] items-center justify-center text-base font-medium ${
                  isMonthly
                    ? "text-gray-600 dark:text-white/50"
                    : "text-gray-800 dark:text-white/90"
                }`}
              >
                Yearly
              </button>
            </div>
            {!isMonthly && (
              <div className="mt-3">
                <span className="inline-block rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Save 20% with annual billing
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {loading ? (
            // Loading state
            <>
              {[1, 2, 3].map((_, index) => (
                <div key={index} className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 p-8 animate-pulse">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded mr-4"></div>
                    <div>
                      <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-40"></div>
                    </div>
                  </div>
                  <div className="my-8">
                    <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-28"></div>
                  </div>
                  <div className="space-y-4 mb-8">
                    {[1, 2, 3, 4, 5].map((_, idx) => (
                      <div key={idx} className="flex items-start">
                        <div className="w-5 h-5 bg-gray-200 dark:bg-gray-800 rounded-full mr-3"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                      </div>
                    ))}
                  </div>
                  <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-lg w-full"></div>
                </div>
              ))}
            </>
          ) : error ? (
            // Error state
            <div className="col-span-3 p-8 text-center">
              <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Try Again
              </button>
            </div>
          ) : displayPlans.length === 0 ? (
            // No plans found
            <div className="col-span-3 p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No {isMonthly ? 'monthly' : 'yearly'} pricing plans available at this time.
              </p>
            </div>
          ) : (
            // Display plans
            displayPlans.map((plan) => {
              const styling = getPlanStyling(plan.name || plan.planID);
              return (
                <div 
                  key={plan.planID} 
                  className={`relative rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl h-full flex flex-col ${
                    styling.highlight 
                      ? 'border-2 border-blue-500 dark:border-blue-400 shadow-lg transform hover:-translate-y-1'
                      : 'border border-gray-200 dark:border-gray-700 transform hover:-translate-y-1'
                  }`}
                >
                  {styling.highlight && (
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-blue-500"></div>
                  )}
                  
                  <div className="p-8 flex flex-col h-full">
                    <div className="flex items-center mb-4">
                      <div className="mr-4">
                        {getPlanIcon(plan.name || plan.planID)}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-gray-800 dark:text-white">{plan.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {getPlanDescription(plan.name)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="my-8">
                      <p className="text-4xl font-bold text-gray-800 dark:text-white inline-flex items-baseline">
                        {plan.currency === 'USD' ? '$' : plan.currency}{plan.price}
                        <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-2">
                          /{plan.interval}
                        </span>
                      </p>
                    </div>
                    
                    <div className="space-y-4 mb-8 flex-grow">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start">
                          <CheckLineIcon className="w-5 h-5 mr-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-auto">
                      {styling.highlight && styling.popularText && (
                        <p className="text-center text-sm mb-4 text-gray-500 dark:text-gray-400">
                          {styling.popularText}
                        </p>
                      )}
                      
                      <button 
                        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${styling.buttonStyle} ${loadingPlanId === plan.planID ? 'opacity-70 cursor-not-allowed' : ''}`}
                        onClick={() => handleSubscribe(plan.planID)}
                        disabled={loadingPlanId === plan.planID || !isClientSide}
                      >
                        {loadingPlanId === plan.planID
                          ? 'Processing...' 
                          : (isClientSide && !isAuthenticated && styling.buttonAction === 'subscribe')
                            ? 'Login to Subscribe'
                            : styling.buttonText
                        }
                      </button>
                      
                      {subscribeError && (
                        <p className="text-center text-sm mt-2 text-red-500">
                          {subscribeError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Comparison Table for Mobile - Shows when screen is small */}
        {!loading && !error && displayPlans.length > 0 && (
          <div className="lg:hidden mb-16">
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-800 dark:text-white">
              Compare Plans
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Feature
                    </th>
                    {displayPlans.map((plan) => (
                      <th 
                        key={plan.planID} 
                        className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                          plan.price > 0 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      Price
                    </td>
                    {displayPlans.map((plan) => (
                      <td 
                        key={plan.planID} 
                        className={`px-6 py-4 whitespace-nowrap text-center text-sm ${
                          plan.price > 0 
                            ? 'font-medium text-blue-600 dark:text-blue-400' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {plan.currency === 'USD' ? '$' : plan.currency}{plan.price}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      Storage
                    </td>
                    {displayPlans.map((plan) => {
                      // Extract storage info from features
                      const storageFeature = plan.features.find(feature => 
                        feature.toLowerCase().includes('storage') || 
                        feature.toLowerCase().includes('gb')
                      );
                      
                      const storageText = storageFeature 
                        ? storageFeature.includes('Unlimited') 
                          ? 'Unlimited' 
                          : storageFeature.match(/\d+\s*GB/i)?.[0] || '1GB'
                        : '1GB';
                      
                      return (
                        <td 
                          key={plan.planID} 
                          className={`px-6 py-4 whitespace-nowrap text-center text-sm ${
                            plan.price > 0 
                              ? 'font-medium text-blue-600 dark:text-blue-400' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {storageText}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      Team Members
                    </td>
                    {displayPlans.map((plan) => {
                      // Extract team members info from features
                      const teamFeature = plan.features.find(feature => 
                        feature.toLowerCase().includes('team') || 
                        feature.toLowerCase().includes('member')
                      );
                      
                      const teamText = teamFeature 
                        ? teamFeature.includes('Unlimited') 
                          ? 'Unlimited' 
                          : teamFeature.match(/\d+/)?.[0] || '1'
                        : '1';
                      
                      return (
                        <td 
                          key={plan.planID} 
                          className={`px-6 py-4 whitespace-nowrap text-center text-sm ${
                            plan.price > 0 
                              ? 'font-medium text-blue-600 dark:text-blue-400' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {teamText}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-3xl font-bold mb-10 text-gray-800 dark:text-white">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div 
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <button
                  className="flex justify-between items-center w-full px-6 py-4 text-left"
                  onClick={() => toggleFaq(index)}
                >
                  <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                    {item.question}
                  </h3>
                  <div className={`transform transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    openFaq === index ? 'max-h-40' : 'max-h-0'
                  }`}
                >
                  <p className="px-6 pb-4 text-gray-600 dark:text-gray-300">
                    {item.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
            Ready to get started?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto mb-6">
            Join thousands of businesses that use our platform to streamline their operations
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/subscription"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
            >
              Get Started
            </Link>
            <button 
              onClick={() => window.location.href = 'mailto:sales@articom.io'}
              className="px-8 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
