import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { Search, ChevronDown, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';

export function InstitutionOnboarding() {
  const { user } = useUser();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [colleges, setColleges] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<any>(null);
  const dropdownRef = useRef<any>(null);
  
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
      console.log('Loaded colleges:', data);
      setColleges(data.colleges || {});
    } catch (err) {
      console.error('Failed to load colleges:', err);
      setError('Failed to load colleges list');
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
  };
  
  const handleSubmit = async () => {
    if (!selectedCollege) {
      setError('Please select a college');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Parse location into city and state
      const locationParts = selectedCollege.location?.split(',') || ['', ''];
      const city = locationParts[0]?.trim() || 'Unknown';
      const state = locationParts[1]?.trim() || 'Unknown';
      
      // Send ALL required fields
      const payload = {
        // Admin details
        clerk_user_id: user?.id || '',
        admin_name: user?.fullName || 'Admin',
        admin_email: user?.emailAddresses?.[0]?.emailAddress || '',
        
        // College selection
        college_id: selectedCollege.id,
        is_other: false,
        
        // Institution details
        institution_name: selectedCollege.name,
        institution_type: null,
        
        // Address (using college location)
        address_line1: selectedCollege.name,
        address_line2: null,
        city: city,
        state: state,
        postal_code: '000000',
        country: 'India',
        
        // Primary contact (using admin details)
        contact_email: user?.emailAddresses?.[0]?.emailAddress || '',
        contact_phone: '0000000000',
        contact_person_name: user?.fullName || 'Admin',
        contact_person_designation: 'Administrator',
        
        // Head of institution (using admin details for now)
        head_name: user?.fullName || 'Admin',
        head_email: user?.emailAddresses?.[0]?.emailAddress || '',
        head_phone: '0000000000',
        head_designation: 'Principal',
        
        // Package selection (default values)
        package_id: 'basic',
        package_name: 'Basic Plan',
        estimated_students: 100,
      };
      
      console.log('Submitting payload:', payload);
      
      const res = await fetch(`${API_BASE_URL}/api/institution/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      console.log('Response:', data);
      
      if (!res.ok) {
        throw new Error(data.detail || JSON.stringify(data));
      }
      
      alert('Application submitted successfully! You will be notified once reviewed.');
      router.reload();
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };
  
  const filteredColleges = getFilteredColleges();
  const totalResults = Object.values(filteredColleges).flat().length;
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9f9f7',
      padding: '24px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          border: '0.5px solid #e5e4dc',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            Select Your Institution
          </h2>
          <p style={{ fontSize: '14px', color: '#888780', marginBottom: '24px' }}>
            Search from 422 colleges across India
          </p>
          
          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#FEE',
              border: '1px solid #FCC',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}>
              <AlertCircle size={18} style={{ color: '#C00' }} />
              <span style={{ fontSize: '14px', color: '#800' }}>{error}</span>
            </div>
          )}
          
          {/* Searchable Dropdown */}
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
                placeholder="Search colleges by name, location, or type..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                  setSelectedCollege(null);
                }}
                onFocus={() => setShowDropdown(true)}
                style={{
                  width: '100%',
                  padding: '14px 40px 14px 40px',
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
                  fontWeight: '500',
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
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
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
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#2C2C2A', marginBottom: '2px' }}>
                          {college.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#888780' }}>
                          {college.location}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                
                {totalResults === 0 && (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#888780',
                    fontSize: '14px',
                  }}>
                    No colleges found matching "{searchTerm}"
                  </div>
                )}
              </div>
            )}
          </div>
          
          {selectedCollege && (
            <div style={{
              padding: '16px',
              background: '#E1F5EE',
              border: '1px solid #1D9E75',
              borderRadius: '8px',
              marginBottom: '24px',
            }}>
              <div style={{ fontSize: '13px', color: '#0F6B4F', fontWeight: '600', marginBottom: '4px' }}>
                ✓ Selected Institution
              </div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#2C2C2A' }}>
                {selectedCollege.name}
              </div>
              <div style={{ fontSize: '13px', color: '#888780' }}>
                {selectedCollege.location}
              </div>
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedCollege}
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '8px',
              background: selectedCollege ? '#1D9E75' : '#e5e4dc',
              color: 'white',
              cursor: loading || !selectedCollege ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Submitting Application...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
}
