import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { Search, ChevronDown, AlertCircle, Check } from 'lucide-react';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';

export function InstitutionOnboarding() {
  const { user } = useUser();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [colleges, setColleges] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<any>(null);
  const dropdownRef = useRef<any>(null);
  
  const [formData, setFormData] = useState({
    // Step 2: Contact Details
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    contactPhone: '',
    contactPersonName: user?.fullName || '',
    contactPersonDesignation: '',
    
    // Step 3: Head of Institution
    headName: '',
    headEmail: '',
    headPhone: '',
    headDesignation: 'Principal',
    
    // Step 4: Package
    estimatedStudents: 100,
  });
  
  useEffect(() => {
    loadColleges();
    
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const loadColleges = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/colleges/list`);
      const data = await res.json();
      setColleges(data.colleges || {});
    } catch (err) {
      console.error('Failed to load colleges:', err);
    }
  };

  const getFilteredColleges = () => {
    const filtered: any = {};
    const search = searchTerm.toLowerCase();
    
    Object.entries(colleges).forEach(([type, items]: [string, any]) => {
      const matchingItems = items.filter((college: any) => 
        college.name?.toLowerCase().includes(search) ||
        college.location?.toLowerCase().includes(search) ||
        type.toLowerCase().includes(search)
      );
      if (matchingItems.length > 0) {
        filtered[type] = matchingItems;
      }
    });
    
    return filtered;
  };
  
  const handleSelectCollege = (college: any) => {
    setSelectedCollege(college);
    setSearchTerm(college.display_name);
    setShowDropdown(false);
    
    // Auto-populate city and state from location
    const locationParts = college.location?.split(',') || ['', ''];
    setFormData({
      ...formData,
      city: locationParts[0]?.trim() || '',
      state: locationParts[1]?.trim() || '',
    });
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const locationParts = selectedCollege.location?.split(',') || ['', ''];
      
      const payload = {
        clerk_user_id: user?.id || '',
        admin_name: user?.fullName || 'Admin',
        admin_email: user?.emailAddresses?.[0]?.emailAddress || '',
        college_id: selectedCollege.id,
        is_other: false,
        institution_name: selectedCollege.name,
        institution_type: null,
        
        // Address
        address_line1: formData.addressLine1 || selectedCollege.name,
        address_line2: formData.addressLine2 || null,
        city: formData.city || locationParts[0]?.trim(),
        state: formData.state || locationParts[1]?.trim(),
        postal_code: formData.postalCode || '000000',
        country: 'India',
        
        // Contact
        contact_email: user?.emailAddresses?.[0]?.emailAddress || '',
        contact_phone: formData.contactPhone,
        contact_person_name: formData.contactPersonName,
        contact_person_designation: formData.contactPersonDesignation,
        
        // Head
        head_name: formData.headName,
        head_email: formData.headEmail,
        head_phone: formData.headPhone,
        head_designation: formData.headDesignation,
        
        // Package
        package_id: 'basic',
        package_name: 'Basic Plan',
        estimated_students: formData.estimatedStudents,
      };
      
      const res = await fetch(`${API_BASE_URL}/api/institution/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || JSON.stringify(data));
      }
      
      alert('Application submitted successfully!');
      router.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };
  
  const filteredColleges = getFilteredColleges();
  const totalResults = Object.values(filteredColleges).flat().length;
  
  const canContinue = () => {
    if (step === 1) return selectedCollege !== null;
    if (step === 2) return formData.contactPhone && formData.contactPersonName && formData.contactPersonDesignation;
    if (step === 3) return formData.headName && formData.headEmail && formData.headPhone;
    return true;
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9f9f7',
      padding: '24px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
              { num: 4, label: 'Review' },
            ].map((s) => (
              <div key={s.num} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              marginBottom: '20px',
              display: 'flex',
              gap: '8px',
            }}>
              <AlertCircle size={18} style={{ color: '#C00' }} />
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
                Search from 422 colleges across India
              </p>
              
              <div ref={dropdownRef} style={{ position: 'relative', marginBottom: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#888780',
                  }} />
                  <input
                    type="text"
                    placeholder="Search colleges..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                      setSelectedCollege(null);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    style={{
                      width: '100%',
                      padding: '14px 40px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: showDropdown ? '2px solid #1D9E75' : 'none',
                    }}
                  />
                  <ChevronDown size={18} style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#888780',
                    cursor: 'pointer',
                  }} onClick={() => setShowDropdown(!showDropdown)} />
                </div>
                
                {showDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid #e5e4dc',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                  }}>
                    <div style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f5f5f3',
                      fontSize: '13px',
                      color: '#888780',
                    }}>
                      {totalResults} colleges found
                    </div>
                    
                    {Object.entries(filteredColleges).map(([type, items]: [string, any]) => (
                      <div key={type}>
                        <div style={{
                          padding: '8px 16px',
                          background: '#f9f9f7',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#2C2C2A',
                        }}>
                          {type} ({items.length})
                        </div>
                        {items.map((college: any) => (
                          <div
                            key={college.id}
                            onClick={() => handleSelectCollege(college)}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f5f5f3',
                              background: selectedCollege?.id === college.id ? '#E1F5EE' : 'transparent',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#E1F5EE'}
                            onMouseLeave={(e) => {
                              if (selectedCollege?.id !== college.id) {
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}
                          >
                            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '2px' }}>
                              {college.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#888780' }}>
                              {college.location}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedCollege && (
                <div style={{
                  padding: '16px',
                  background: '#E1F5EE',
                  border: '1px solid #1D9E75',
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '13px', color: '#0F6B4F', fontWeight: '600', marginBottom: '4px' }}>
                    ✓ Selected
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '600' }}>
                    {selectedCollege.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#888780' }}>
                    {selectedCollege.location}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* STEP 2: Contact Details */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
                Contact Details
              </h2>
              
              <div style={{ display: 'grid', gap: '16px' }}>
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
                    placeholder="e.g., Administrator, Coordinator"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="10-digit phone number"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Address Line 1
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
                    }}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                      Postal Code
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
                      }}
                    />
                  </div>
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
              
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.headName}
                    onChange={(e) => setFormData({ ...formData, headName: e.target.value })}
                    placeholder="Principal/Director name"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.headEmail}
                    onChange={(e) => setFormData({ ...formData, headEmail: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
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
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Designation
                  </label>
                  <select
                    value={formData.headDesignation}
                    onChange={(e) => setFormData({ ...formData, headDesignation: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                    }}
                  >
                    <option value="Principal">Principal</option>
                    <option value="Director">Director</option>
                    <option value="Dean">Dean</option>
                    <option value="Vice Principal">Vice Principal</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {/* STEP 4: Review */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
                Review & Submit
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#888780', marginBottom: '4px' }}>Institution</div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>{selectedCollege?.name}</div>
                </div>
                
                <div>
                  <div style={{ fontSize: '13px', color: '#888780', marginBottom: '4px' }}>Contact Person</div>
                  <div style={{ fontSize: '15px' }}>{formData.contactPersonName} - {formData.contactPersonDesignation}</div>
                  <div style={{ fontSize: '14px', color: '#888780' }}>{formData.contactPhone}</div>
                </div>
                
                <div>
                  <div style={{ fontSize: '13px', color: '#888780', marginBottom: '4px' }}>Head of Institution</div>
                  <div style={{ fontSize: '15px' }}>{formData.headName} - {formData.headDesignation}</div>
                  <div style={{ fontSize: '14px', color: '#888780' }}>{formData.headEmail}</div>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Estimated Number of Students
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedStudents}
                    onChange={(e) => setFormData({ ...formData, estimatedStudents: parseInt(e.target.value) })}
                    min="10"
                    max="10000"
                    style={{
                      width: '200px',
                      padding: '12px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '8px',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation */}
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between' }}>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #e5e4dc',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canContinue()}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: canContinue() ? '#1D9E75' : '#e5e4dc',
                  color: 'white',
                  cursor: canContinue() ? 'pointer' : 'not-allowed',
                  marginLeft: 'auto',
                }}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  padding: '12px 32px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#1D9E75',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
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
