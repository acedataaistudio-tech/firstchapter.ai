import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { Search, Building2, Package, User, Check, AlertCircle } from 'lucide-react';

export function InstitutionOnboarding() {
  const { user } = useUser();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search state
  const [collegeSearch, setCollegeSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    // Step 1: College selection
    selectedCollegeId: '',
    isOther: false,
    institutionName: '',
    institutionType: '',
    
    // Step 2: Contact details
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    contactEmail: user?.emailAddresses?.[0]?.emailAddress || '',
    contactPhone: '',
    contactPersonName: user?.fullName || '',
    contactPersonDesignation: '',
    
    // Step 3: Head of institution
    headName: '',
    headEmail: '',
    headPhone: '',
    headDesignation: 'Principal',
    
    // Step 4: Package selection
    packageId: '',
    packageName: '',
    estimatedStudents: 100,
  });
  
  const [colleges, setColleges] = useState<any>({});
  const [packages, setPackages] = useState<any[]>([]);
  
  // Load colleges and packages
  useEffect(() => {
    loadColleges();
    loadPackages();
  }, []);
  
  // Filter colleges
  const filterColleges = () => {
    if (!collegeSearch) return [];
    const results: any[] = [];
    Object.entries(colleges).forEach(([type, items]: [string, any]) => {
      items.forEach((c: any) => {
        if (c.display_name.toLowerCase().includes(collegeSearch.toLowerCase())) {
          results.push({ ...c, type });
        }
      });
    });
    return results.slice(0, 10);
  };
  
  const loadColleges = async () => {
    try {
      const res = await fetch('https://firstchapterai-production.up.railway.app/api/colleges/list');
      const data = await res.json();
      setColleges(data.colleges || {});
    } catch (err) {
      console.error('Failed to load colleges:', err);
    }
  };
  
  const loadPackages = async () => {
    try {
      const res = await fetch('https://firstchapterai-production.up.railway.app/api/packages?tier=institution');
      const data = await res.json();
      setPackages(data.packages || []);
    } catch (err) {
      console.error('Failed to load packages:', err);
    }
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('https://firstchapterai-production.up.railway.app/api/institution/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerk_user_id: user?.id,
          admin_name: formData.contactPersonName,
          admin_email: formData.contactEmail,
          college_id: formData.isOther ? null : formData.selectedCollegeId,
          is_other: formData.isOther,
          institution_name: formData.institutionName,
          institution_type: formData.institutionType,
          ...formData,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        // Log full error for debugging
        console.error('Application error:', data);
        throw new Error(data.detail || JSON.stringify(data) || 'Application failed');
      }
      
      // Redirect to status page
      router.push('/institution');
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9f9f7',
      padding: '24px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        {/* Progress Steps */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '40px',
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e5e4dc',
        }}>
          {[
            { num: 1, label: 'Institution', icon: Building2 },
            { num: 2, label: 'Contact', icon: User },
            { num: 3, label: 'Head Info', icon: User },
            { num: 4, label: 'Package', icon: Package },
          ].map((s) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: step >= s.num ? '#1D9E75' : '#e5e4dc',
                color: step >= s.num ? 'white' : '#888780',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
              }}>
                {s.num}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: step >= s.num ? '#1D9E75' : '#888780' }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '12px',
          border: '1px solid #e5e4dc',
        }}>
          
          {/* Error Display */}
          {error && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              background: '#FFF4E5',
              border: '1px solid #FFE0B2',
              borderRadius: '8px',
              display: 'flex',
              gap: '8px',
              alignItems: 'start',
            }}>
              <AlertCircle size={18} style={{ color: '#C00', flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '14px', color: '#800' }}>{error}</span>
            </div>
          )}
          
          {/* STEP 1: Institution Selection */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                Select Your Institution
              </h2>
              <p style={{ fontSize: '14px', color: '#888780', marginBottom: '24px' }}>
                Choose from our list or enter manually if not found
              </p>
              
              {/* College Search */}
              <div style={{ marginBottom: '24px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                  Select College/University
                </label>
                <input
                  type="text"
                  placeholder="Type to search 422 colleges..."
                  value={formData.isOther ? 'Other (Not in list)' : (selectedDisplay || collegeSearch)}
                  onChange={(e) => {
                    setCollegeSearch(e.target.value);
                    setShowResults(true);
                    setFormData({ ...formData, selectedCollegeId: '', isOther: false });
                    setSelectedDisplay('');
                  }}
                  onFocus={() => setShowResults(true)}
                  disabled={formData.isOther}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e4dc',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
                
                {showResults && !formData.isOther && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e5e4dc',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 100,
                  }}>
                    {collegeSearch && filterColleges().length > 0 ? (
                      <>
                        {filterColleges().map((c: any) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setFormData({ ...formData, selectedCollegeId: c.id, isOther: false });
                              setSelectedDisplay(c.display_name);
                              setCollegeSearch('');
                              setShowResults(false);
                            }}
                            style={{
                              padding: '12px',
                              borderBottom: '1px solid #f0efea',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9f9f7'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <div style={{ fontSize: '14px', fontWeight: '500' }}>{c.name}</div>
                            <div style={{ fontSize: '12px', color: '#888780' }}>{c.location}</div>
                            <div style={{ fontSize: '11px', color: '#1D9E75' }}>{c.type}</div>
                          </div>
                        ))}
                        <div
                          onClick={() => {
                            setFormData({ ...formData, selectedCollegeId: '', isOther: true });
                            setSelectedDisplay('');
                            setCollegeSearch('');
                            setShowResults(false);
                          }}
                          style={{
                            padding: '12px',
                            cursor: 'pointer',
                            borderTop: '2px solid #e5e4dc',
                            background: '#f9f9f7',
                          }}
                        >
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#378ADD' }}>
                            ➕ Other (Not in list)
                          </div>
                          <div style={{ fontSize: '12px', color: '#888780' }}>Enter manually</div>
                        </div>
                      </>
                    ) : collegeSearch ? (
                      <>
                        <div style={{ padding: '12px', textAlign: 'center', color: '#888780' }}>
                          No results for "{collegeSearch}"
                        </div>
                        <div
                          onClick={() => {
                            setFormData({ ...formData, selectedCollegeId: '', isOther: true });
                            setSelectedDisplay('');
                            setCollegeSearch('');
                            setShowResults(false);
                          }}
                          style={{
                            padding: '12px',
                            cursor: 'pointer',
                            borderTop: '1px solid #e5e4dc',
                            background: '#f9f9f7',
                          }}
                        >
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#378ADD' }}>
                            ➕ Other (Not in list)
                          </div>
                          <div style={{ fontSize: '12px', color: '#888780' }}>Enter manually</div>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#888780' }}>
                        Start typing to search...
                      </div>
                    )}
                  </div>
                )}
                
                {selectedDisplay && !formData.isOther && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: '#E1F5EE',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#0F6E56',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <span>✓ {selectedDisplay}</span>
                    <button
                      onClick={() => {
                        setFormData({ ...formData, selectedCollegeId: '', isOther: false });
                        setSelectedDisplay('');
                        setCollegeSearch('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0F6E56',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '0 4px',
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              
              {/* Manual Entry */}
              {formData.isOther && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                      Institution Name *
                    </label>
                    <input
                      type="text"
                      value={formData.institutionName}
                      onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                      placeholder="Enter your institution name"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e5e4dc',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                      Institution Type *
                    </label>
                    <select
                      value={formData.institutionType}
                      onChange={(e) => setFormData({ ...formData, institutionType: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e5e4dc',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="">-- Select Type --</option>
                      <option value="University">University</option>
                      <option value="College">College</option>
                      <option value="School">School</option>
                      <option value="Institute">Institute</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* STEP 2: Contact Details */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
                Contact Information
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    value={formData.contactPersonName}
                    onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Designation *
                  </label>
                  <input
                    type="text"
                    value={formData.contactPersonDesignation}
                    onChange={(e) => setFormData({ ...formData, contactPersonDesignation: e.target.value })}
                    placeholder="e.g., Dean, Librarian"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+91 XXXXXXXXXX"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Street address"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e4dc',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Apartment, suite, etc. (optional)"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e4dc',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f9f9f7',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* STEP 3: Head of Institution */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
                Head of Institution
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.headName}
                    onChange={(e) => setFormData({ ...formData, headName: e.target.value })}
                    placeholder="Full name"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Designation *
                  </label>
                  <select
                    value={formData.headDesignation}
                    onChange={(e) => setFormData({ ...formData, headDesignation: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="Principal">Principal</option>
                    <option value="Dean">Dean</option>
                    <option value="Director">Director</option>
                    <option value="Vice Chancellor">Vice Chancellor</option>
                    <option value="Head">Head</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.headEmail}
                    onChange={(e) => setFormData({ ...formData, headEmail: e.target.value })}
                    placeholder="official@institution.edu"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.headPhone}
                    onChange={(e) => setFormData({ ...formData, headPhone: e.target.value })}
                    placeholder="+91 XXXXXXXXXX"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* STEP 4: Package Selection */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                Choose Your Package
              </h2>
              <p style={{ fontSize: '14px', color: '#888780', marginBottom: '24px' }}>
                Select a subscription package for your institution
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {packages
                  .filter((pkg: any) => pkg.type === 'institution')
                  .map((pkg: any) => (
                  <div
                    key={pkg.id}
                    onClick={() => setFormData({ ...formData, packageId: pkg.id, packageName: pkg.name })}
                    style={{
                      padding: '20px',
                      border: formData.packageId === pkg.id ? '2px solid #1D9E75' : '1px solid #e5e4dc',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: formData.packageId === pkg.id ? '#E1F5EE' : 'white',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                      {pkg.name}
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1D9E75', marginBottom: '12px' }}>
                      ₹{(pkg.price_yearly / 100000).toFixed(2)}L/year
                    </div>
                    <div style={{ fontSize: '13px', color: '#888780', marginBottom: '4px' }}>
                      {pkg.features?.free_mau || 0} students included
                    </div>
                    {formData.packageId === pkg.id && (
                      <div style={{ marginTop: '12px', color: '#1D9E75', fontSize: '14px', fontWeight: '500' }}>
                        ✓ Selected
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                  Estimated Number of Students
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.estimatedStudents}
                  onChange={(e) => setFormData({ ...formData, estimatedStudents: parseInt(e.target.value) || 0 })}
                  style={{
                    width: '200px',
                    padding: '12px',
                    border: '1px solid #e5e4dc',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          )}
          
          {/* Navigation Buttons */}
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between' }}>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #e5e4dc',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#888780',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                ← Back
              </button>
            )}
            
            <button
              onClick={() => {
                if (step < 4) {
                  setStep(step + 1);
                } else {
                  handleSubmit();
                }
              }}
              disabled={
                loading ||
                (step === 1 && !formData.selectedCollegeId && !formData.isOther) ||
                (step === 1 && formData.isOther && (!formData.institutionName || !formData.institutionType)) ||
                (step === 4 && !formData.packageId)
              }
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                background: '#1D9E75',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                marginLeft: 'auto',
              }}
            >
              {loading ? 'Submitting...' : step === 4 ? 'Submit Application' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
