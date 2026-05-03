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
  
  // Search state for colleges
  const [collegeSearch, setCollegeSearch] = useState('');
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [selectedCollegeName, setSelectedCollegeName] = useState('');
  
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
  
  // Filter colleges based on search
  const getFilteredColleges = () => {
    if (!collegeSearch) return [];
    
    const filtered: any[] = [];
    Object.entries(colleges).forEach(([type, items]: [string, any]) => {
      items.forEach((college: any) => {
        if (college.display_name.toLowerCase().includes(collegeSearch.toLowerCase())) {
          filtered.push({ ...college, type });
        }
      });
    });
    
    return filtered.slice(0, 10); // Show max 10 results
  };
  
  const loadColleges = async () => {
    try {
      const res = await fetch('https://firstchapterai-production.up.railway.app/api/colleges/list');
      const data = await res.json();
      console.log('Loaded colleges:', data);
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
      
      if (!res.ok) throw new Error(data.detail || 'Application failed');
      
      // Redirect to status page
      router.push('/institution/application-submitted');
    } catch (err: any) {
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
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '0.5px solid #e5e4dc',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {[
              { num: 1, label: 'Institution' },
              { num: 2, label: 'Contact' },
              { num: 3, label: 'Head Info' },
              { num: 4, label: 'Package' },
            ].map((s) => (
              <div key={s.num} style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: step >= s.num ? '#1D9E75' : '#e5e4dc',
                  color: step >= s.num ? 'white' : '#888780',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                }}>
                  {step > s.num ? <Check size={16} /> : s.num}
                </div>
                <span style={{
                  fontSize: '13px',
                  color: step >= s.num ? '#2C2C2A' : '#888780',
                  fontWeight: step === s.num ? '600' : '400',
                }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Form Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          border: '0.5px solid #e5e4dc',
        }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#FEE',
              border: '1px solid #FCC',
              borderRadius: '8px',
              marginBottom: '24px',
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
              
              {/* College Dropdown */}
              <div style={{ marginBottom: '24px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                  Select College/University
                </label>
                
                {/* Searchable Input */}
                <input
                  type="text"
                  placeholder="Type to search colleges..."
                  value={formData.isOther ? 'Other (Not in list)' : (selectedCollegeName || collegeSearch)}
                  onChange={(e) => {
                    setCollegeSearch(e.target.value);
                    setShowCollegeDropdown(true);
                    setFormData({ ...formData, selectedCollegeId: '', isOther: false });
                    setSelectedCollegeName('');
                  }}
                  onFocus={() => setShowCollegeDropdown(true)}
                  disabled={formData.isOther}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e4dc',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
                
                {/* Dropdown Results */}
                {showCollegeDropdown && !formData.isOther && (
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
                    {collegeSearch && getFilteredColleges().length > 0 ? (
                      <>
                        {getFilteredColleges().map((college: any) => (
                          <div
                            key={college.id}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                selectedCollegeId: college.id,
                                isOther: false,
                              });
                              setSelectedCollegeName(college.display_name);
                              setCollegeSearch('');
                              setShowCollegeDropdown(false);
                            }}
                            style={{
                              padding: '12px',
                              borderBottom: '1px solid #f0efea',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9f9f7'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <div style={{ fontSize: '14px', fontWeight: '500' }}>{college.name}</div>
                            <div style={{ fontSize: '12px', color: '#888780' }}>{college.location}</div>
                            <div style={{ fontSize: '11px', color: '#1D9E75', marginTop: '2px' }}>{college.type}</div>
                          </div>
                        ))}
                        <div
                          onClick={() => {
                            setFormData({ ...formData, selectedCollegeId: '', isOther: true });
                            setSelectedCollegeName('');
                            setCollegeSearch('');
                            setShowCollegeDropdown(false);
                          }}
                          style={{
                            padding: '12px',
                            cursor: 'pointer',
                            borderTop: '2px solid #e5e4dc',
                            background: '#f9f9f7',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f0efea'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#f9f9f7'}
                        >
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#378ADD' }}>
                            ➕ Other (Not in list)
                          </div>
                          <div style={{ fontSize: '12px', color: '#888780' }}>Enter college name manually</div>
                        </div>
                      </>
                    ) : collegeSearch ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#888780' }}>
                        No colleges found. Try different search terms or select "Other".
                      </div>
                    ) : (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#888780' }}>
                        Start typing to search 422 colleges...
                      </div>
                    )}
                  </div>
                )}
                
                {/* Selected College Display */}
                {selectedCollegeName && !formData.isOther && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: '#E1F5EE',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#0F6E56',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span>✓ {selectedCollegeName}</span>
                    <button
                      onClick={() => {
                        setFormData({ ...formData, selectedCollegeId: '', isOther: false });
                        setSelectedCollegeName('');
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
              
              {/* Address, Email, Phone fields... (truncated for brevity) */}
              {/* Add all address fields similar to above */}
            </div>
          )}
          
          {/* STEP 3: Head of Institution */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
                Head of Institution Details
              </h2>
              {/* Similar input fields for head details */}
            </div>
          )}
          
          {/* STEP 4: Package Selection */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
                Choose Your Package
              </h2>
              
              <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => setFormData({
                      ...formData,
                      packageId: pkg.id,
                      packageName: pkg.name,
                    })}
                    style={{
                      padding: '20px',
                      border: formData.packageId === pkg.id ? '2px solid #1D9E75' : '1px solid #e5e4dc',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: formData.packageId === pkg.id ? '#E1F5EE' : 'white',
                    }}
                  >
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                      {pkg.name}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#888780', marginBottom: '12px' }}>
                      {pkg.description}
                    </p>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1D9E75' }}>
                      ₹{pkg.price_inr}/month
                    </div>
                  </div>
                ))}
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                  Estimated Number of Students
                </label>
                <input
                  type="number"
                  value={formData.estimatedStudents}
                  onChange={(e) => setFormData({ ...formData, estimatedStudents: parseInt(e.target.value) })}
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
          <div style={{
            marginTop: '32px',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #e5e4dc',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Back
              </button>
            )}
            
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !formData.selectedCollegeId) ||
                  (step === 1 && formData.isOther && (!formData.institutionName || !formData.institutionType))
                }
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#1D9E75',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginLeft: 'auto',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.packageId}
                style={{
                  padding: '12px 32px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#1D9E75',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginLeft: 'auto',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
