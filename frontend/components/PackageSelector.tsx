/**
 * Package Selection Component
 * 
 * Shows available subscription packages with pricing and features
 * Handles both individual and institution packages
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, Zap, Users, Building2, Sparkles } from 'lucide-react';

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
  onSelect: (pkg: Package) => void;
}

export function PackageSelector({ userType, onSelect }: PackageSelectorProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
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
                Save 20%
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
                    {userType === 'institution' && (
                      <p className="text-sm text-gray-600 mt-1">
                        Includes {pkg.features[0]}
                      </p>
                    )}
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
                      <span className="text-gray-700">{feature}</span>
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
                  onClick={() => onSelect(pkg)}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    isPopular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {pkg.name === 'Free' ? 'Get Started' : 'Choose Plan'}
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
            <p className="text-sm mt-1">Cancel anytime • No hidden fees</p>
          </>
        )}
      </div>

      {/* Comparison Table (Optional) */}
      {userType === 'individual' && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Compare Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left py-4 px-4">Feature</th>
                  {packages.map((pkg) => (
                    <th key={pkg.id} className="text-center py-4 px-4">
                      {pkg.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-4 px-4">Books Access</td>
                  {packages.map((pkg) => (
                    <td key={pkg.id} className="text-center py-4 px-4">
                      {pkg.name === 'Free' ? 'Basic' : 'All'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Monthly Queries</td>
                  {packages.map((pkg) => (
                    <td key={pkg.id} className="text-center py-4 px-4">
                      {pkg.query_limit || 'Unlimited'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Export (DOCX/PPTX)</td>
                  {packages.map((pkg) => (
                    <td key={pkg.id} className="text-center py-4 px-4">
                      {pkg.name !== 'Free' ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Usage Example:
//
// import { PackageSelector } from '@/components/PackageSelector';
//
// function PricingPage() {
//   const handleSelectPackage = (pkg) => {
//     console.log('Selected package:', pkg);
//     // Navigate to checkout or initiate subscription
//   };
//
//   return (
//     <PackageSelector 
//       userType="individual"  // or "institution"
//       onSelect={handleSelectPackage}
//     />
//   );
// }
