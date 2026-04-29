/**
 * College Selector Component
 * 
 * Searchable dropdown with 500+ colleges for reader onboarding
 * Shows during sign-up to link users to their institution
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Building2, Check } from 'lucide-react';

interface College {
  id: string;
  name: string;
  location: string;
  state: string;
  type: 'government' | 'private' | 'deemed';
  has_subscription: boolean;
}

interface CollegeSelectorProps {
  onSelect: (college: College | null) => void;
  selectedCollege?: College | null;
}

export function CollegeSelector({ onSelect, selectedCollege }: CollegeSelectorProps) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch colleges from API
  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const response = await fetch('/api/colleges');
      const data = await response.json();
      setColleges(data.colleges || []);
    } catch (error) {
      console.error('Failed to fetch colleges:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter colleges based on search
  const filteredColleges = useMemo(() => {
    if (!search.trim()) return colleges;

    const searchLower = search.toLowerCase();
    return colleges.filter(
      (college) =>
        college.name.toLowerCase().includes(searchLower) ||
        college.location.toLowerCase().includes(searchLower) ||
        college.state.toLowerCase().includes(searchLower)
    );
  }, [colleges, search]);

  // Group by state
  const groupedColleges = useMemo(() => {
    const groups: Record<string, College[]> = {};
    
    filteredColleges.forEach((college) => {
      if (!groups[college.state]) {
        groups[college.state] = [];
      }
      groups[college.state].push(college);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredColleges]);

  const handleSelect = (college: College) => {
    onSelect(college);
    setIsOpen(false);
    setSearch('');
  };

  const handleSkip = () => {
    onSelect(null);
    setIsOpen(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Selected College Display */}
      {selectedCollege ? (
        <div className="bg-white border-2 border-blue-500 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedCollege.name}</h3>
                <p className="text-sm text-gray-600">
                  {selectedCollege.location}, {selectedCollege.state}
                </p>
                {selectedCollege.has_subscription && (
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    <Check className="w-3 h-3" />
                    Active Subscription
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <button
            onClick={() => setIsOpen(true)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-left hover:border-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
          >
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500">
                {loading ? 'Loading colleges...' : 'Search for your college...'}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Dropdown Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold text-gray-900">Select Your College</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, location, or state..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading colleges...</div>
              ) : filteredColleges.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No colleges found</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Try a different search term
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedColleges.map(([state, stateColleges]) => (
                    <div key={state}>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {state}
                      </h3>
                      <div className="space-y-1">
                        {stateColleges.map((college) => (
                          <button
                            key={college.id}
                            onClick={() => handleSelect(college)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 group-hover:text-blue-600">
                                  {college.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {college.location}
                                </div>
                              </div>
                              {college.has_subscription && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                                  <Check className="w-3 h-3" />
                                  Active
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={handleSkip}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Skip for now (Individual subscription)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Text */}
      <p className="mt-2 text-sm text-gray-600">
        {selectedCollege ? (
          selectedCollege.has_subscription ? (
            <>✅ Your college has an active subscription. You'll get access to all books!</>
          ) : (
            <>⚠️ Your college doesn't have a subscription yet. You'll need an individual plan.</>
          )
        ) : (
          <>Select your college to check if it has an active subscription</>
        )}
      </p>
    </div>
  );
}

// Usage Example:
// 
// import { CollegeSelector } from '@/components/CollegeSelector';
// 
// function OnboardingPage() {
//   const [selectedCollege, setSelectedCollege] = useState(null);
// 
//   return (
//     <div className="min-h-screen flex items-center justify-center p-4">
//       <div className="w-full max-w-2xl">
//         <h1 className="text-3xl font-bold text-center mb-8">
//           Welcome to Firstchapter.ai
//         </h1>
//         <CollegeSelector 
//           onSelect={setSelectedCollege}
//           selectedCollege={selectedCollege}
//         />
//       </div>
//     </div>
//   );
// }
