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
  
  // Form state
  const [formData, setFormData] = useState({
    // Step 1: College selection
    selectedCollegeId: '',
    selectedCollegeName: '',
    selectedCollegeLocation: '',
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
  const [searchTerm, setSearchTerm] = useState('');
  
  // Load colleges and packages
  useEffect(() => {
    loadColleges();
    loadPackages();
  }, []);
  
  const loadColleges = async () => {
    try {
      const res = await fetch('/api/colleges/list');
      const data = await res.json();
      setColleges(data.colleges || {});
    } catch (err) {
      console.error('Failed to load colleges:', err);
    }
  };
  
  const loadPackages = async () => {
    try {
      const res = await fetch('/api/packages?tier=institution');
      const data = await res.json();
      setPackages(data.packages || []);
    } catch (err) {
      console.error('Failed to load packages:', err);
    }
  };

  // Filter colleges by search term
  const filteredColleges: any = {};
  if (searchTerm) {
    Object.entries(colleges).forEach(([type, items]: [string, any]) => {
      const filtered = items.filter((college: any) => 
        college.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        college.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        filteredColleges[type] = filtered;
      }
    });
  } else {
    Object.assign(filteredColleges, colleges);
  }
  
  const handleCollegeSelect = (e: any) => {
    const value = e.target.value;
    
    if (value === 'other') {
      setFormData({
        ...formData,
        selectedCollegeId: '',
        selectedCollegeName: '',
        selectedCollegeLocation: '',
        isOther: true,
      });
      return;
    }
    
    // Find the selected college
    let selectedCollege: any = null;
    Object.values(colleges).forEach((items: any) => {
      const found = items.find((c: any) => c.id === value);
      if (found) selectedCollege = found;
    });
    
    if (selectedCollege) {
      setFormData({
        ...formData,
        selectedCollegeId: value,
        selectedCollegeName: selectedCollege.name,
        selectedCollegeLocation: selectedCollege.location,
        isOther: false,
      });
    }
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/institution/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerk_user_id: user?.id,
          admin_name: formData.contactPersonName,
          admin_email: formData.contactEmail,
          college_id: formData.isOther ? null : formData.selectedCollegeId,
          is_other: formData.isOther,
          institution_name: formData.isOther ? formData.institutionName : formData.selectedCollegeName,
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
                Choose from our list of 422 colleges or enter manually
              </p>
              
              {/* Search Box */}
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#888780',
                }} />
                <input
                  type="text"
                  placeholder="Search colleges by name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    border: '1px solid #e5e4dc',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>
              
              {/* College Dropdown */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                  Select College/University *
                </label>
                <select
                  value={formData.selectedCollegeId || (formData.isOther ? 'other' : '')}
                  onChange={handleCollegeSelect}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e4dc',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">-- Select Institution --</option>
                  {Object.entries(filteredColleges).map(([type, items]: [string, any]) => (
                    <optgroup key={type} label={type}>
                      {items.map((college: any) => (
                        <option key={college.id} value={college.id}>
                          {college.display_name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="other">Other (Not in list)</option>
                </select>
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
                      placeholder="Enter institution name"
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
                      <option value="IIT">IIT</option>
                      <option value="NIT">NIT</option>
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
                  (step === 1 && !formData.selectedCollegeId && !formData.isOther) ||
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
