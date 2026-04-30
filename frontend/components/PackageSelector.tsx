/**
 * Package Selection Component with Razorpay Integration
 * 
 * Free package: Skip payment, create subscription directly
 * Paid packages: Razorpay payment → verify → create subscription
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { Check, Zap, Users, Building2, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Package {
  id: string;
  name: string;
  type: 'individual' | 'institution';
  price_monthly?: number;
  price_yearly?: number;
  query_limit?: number;
  token_limit?: number;
  features: string[];
  is_active: boolean;
  popular?: boolean;
}

interface PackageSelectorProps {
  userType: 'individual' | 'institution';
}

// Load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function PackageSelector({ userType }: PackageSelectorProps) {
  const router = useRouter();
  const { user } = useUser();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPackageId, setProcessingPackageId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  useEffect(() => {
    fetchPackages();
  }, [userType]);

  const fetchPackages = async () => {
    try {
      const response = await fetch(`/api/packages?type=${userType}`);
      const data = await response.json();
      setPackages(data.packages || []);
    } catch (error) {
      console.error('Failed to fetch packages:', error);
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (packageId: string, paymentId?: string) => {
    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          packageId,
          paymentId: paymentId || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Subscription creation error:', error);
      throw error;
    }
  };

  const handleFreePackage = async (pkg: Package) => {
    if (!user) {
      toast.error('Please sign in first');
      router.push('/sign-in');
      return;
    }

    setProcessingPackageId(pkg.id);

    try {
      toast.loading('Setting up your free account...', { id: 'free-setup' });

      // Create subscription directly (no payment)
      await createSubscription(pkg.id);

      toast.success('Free account activated!', { id: 'free-setup' });
      
      // Redirect to homepage (book search interface)
      setTimeout(() => {
        router.push('/');
      }, 1000);

    } catch (error) {
      console.error('Free package error:', error);
      toast.error('Failed to activate free account', { id: 'free-setup' });
    } finally {
      setProcessingPackageId(null);
    }
  };

  const handlePaidPackage = async (pkg: Package) => {
    if (!user) {
      toast.error('Please sign in first');
      router.push('/sign-in');
      return;
    }

    setProcessingPackageId(pkg.id);

    try {
      // Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Failed to load Razorpay');
      }

      const price = billingCycle === 'monthly' ? pkg.price_monthly : pkg.price_yearly;
      if (!price) {
        throw new Error('Package price not available');
      }

      toast.loading('Opening payment...', { id: 'payment' });

      // Create Razorpay order
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price,
          packageId: pkg.id,
          packageName: pkg.name,
          userId: user.id,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await orderResponse.json();
      toast.dismiss('payment');

      // Open Razorpay payment modal
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Firstchapter.ai',
        description: `${pkg.name} Subscription`,
        order_id: orderData.order_id,
        prefill: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.emailAddresses[0].emailAddress,
        },
        theme: {
          color: '#1D9E75',
        },
        handler: async function (response: any) {
          try {
            toast.loading('Verifying payment...', { id: 'verify' });

            // Verify payment
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            const verifyData = await verifyResponse.json();
            toast.success('Payment successful!', { id: 'verify' });

            // Create subscription
            toast.loading('Activating subscription...', { id: 'activate' });
            await createSubscription(pkg.id, verifyData.payment_id);
            toast.success('Subscription activated!', { id: 'activate' });

            // Redirect to homepage
            setTimeout(() => {
              router.push('/');
            }, 1500);

          } catch (error) {
            console.error('Payment handler error:', error);
            toast.error('Failed to complete subscription', { id: 'verify' });
          } finally {
            setProcessingPackageId(null);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessingPackageId(null);
            toast.dismiss();
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment', { id: 'payment' });
      setProcessingPackageId(null);
    }
  };

  const handleSelectPackage = async (pkg: Package) => {
    // Free package: Skip payment
    if (pkg.name === 'Free' || !pkg.price_yearly) {
      await handleFreePackage(pkg);
    } 
    // Paid package: Razorpay payment
    else {
      await handlePaidPackage(pkg);
    }
  };

  const formatPrice = (priceInPaisa: number) => {
    const rupees = priceInPaisa / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(rupees);
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000_000) {
      return `${(tokens / 1_000_000_000).toFixed(1)}B`;
    }
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`;
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(0)}k`;
    }
    return tokens.toString();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600">Loading packages...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {userType === 'individual' ? 'Choose Your Plan' : 'Institution Packages'}
        </h1>
        <p className="text-xl text-gray-600">
          {userType === 'individual'
            ? 'Get unlimited access to thousands of books'
            : 'Empower your entire institution with AI-powered learning'}
        </p>
      </div>

      {/* Billing Toggle (Individual only) */}
      {userType === 'individual' && (
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                Save 10%
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Package Cards */}
      <div className={`grid gap-8 ${
        userType === 'individual' ? 'md:grid-cols-4' : 'md:grid-cols-3'
      }`}>
        {packages.map((pkg) => {
          const price = billingCycle === 'monthly' ? pkg.price_monthly : pkg.price_yearly;
          const isPopular = pkg.popular || pkg.name.includes('Premium');
          const isProcessing = processingPackageId === pkg.id;

          return (
            <div
              key={pkg.id}
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                isPopular ? 'ring-2 ring-blue-600 scale-105' : ''
              }`}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  Popular
                </div>
              )}

              <div className="p-8">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  pkg.name === 'Free' ? 'bg-gray-100' :
                  userType === 'institution' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  {userType === 'institution' ? (
                    <Building2 className="w-6 h-6 text-blue-600" />
                  ) : pkg.name === 'Free' ? (
                    <Zap className="w-6 h-6 text-gray-600" />
                  ) : (
                    <Users className="w-6 h-6 text-purple-600" />
                  )}
                </div>

                {/* Name & Price */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                
                {price ? (
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(price)}
                      </span>
                      <span className="text-gray-600">
                        /{billingCycle === 'yearly' || userType === 'institution' ? 'year' : 'month'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">Free</span>
                  </div>
                )}

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {pkg.features.slice(userType === 'institution' ? 1 : 0).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Token Info */}
                {pkg.token_limit && (
                  <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Token Allocation</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatTokens(pkg.token_limit)} tokens
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPackage(pkg)}
                  disabled={isProcessing}
                  className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    isProcessing
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : isPopular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : pkg.name === 'Free' ? (
                    'Get Started Free'
                  ) : (
                    'Choose Plan'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="mt-12 text-center text-gray-600">
        {userType === 'institution' ? (
          <>
            <p className="mb-2">Need a custom plan for your institution?</p>
            <button className="text-blue-600 hover:text-blue-700 font-semibold">
              Contact Sales →
            </button>
          </>
        ) : (
          <>
            <p>All plans include access to our full library</p>
            <p className="text-sm mt-1">Cancel anytime • No hidden fees • Secure payments</p>
          </>
        )}
      </div>
    </div>
  );
}
