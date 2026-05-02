import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { Search, Check, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';

export function InstitutionOnboarding() {
  const { user } = useUser();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    selectedCollegeId: '',
    selectedCollegeName: '',
    isOther: false,
    institutionName: '',
    institutionType: '',
    contactEmail: user?.emailAddresses?.[0]?.emailAddress || '',
    contactPersonName: user?.fullName || '',
    packageId: '',
    estimatedStudents: 100,
  });
  
  const [colleges, setColleges] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    loadColleges();
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
      setFormData({ ...formData, selectedCollegeId: '', isOther: true });
      return;
    }
    
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
        isOther: false,
      });
    }
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/institution/apply`, {
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
          estimated_students: formData.estimatedStudents,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Application failed');
      
      router.push('/institution');
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
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
            }}>
              <AlertCircle size={18} style={{ color: '#C00' }} />
              <span style={{ fontSize: '14px', color: '#800', marginLeft: '8px' }}>{error}</span>
            </div>
          )}
          
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            Select Your Institution
          </h2>
          <p style={{ fontSize: '14px', color: '#888780', marginBottom: '24px' }}>
            Choose from 422 colleges or enter manually
          </p>
          
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
              placeholder="Search colleges..."
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
          
          <div style={{ marginBottom: '24px' }}>
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
              <option value="">-- Select Institution ({Object.values(colleges).flat().length} colleges) --</option>
              {Object.entries(filteredColleges).map(([type, items]: [string, any]) => (
                <optgroup key={type} label={`${type} (${items.length})`}>
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
          
          {formData.isOther && (
            <div style={{ marginBottom: '16px' }}>
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
          )}
          
          <button
            onClick={handleSubmit}
            disabled={loading || (!formData.selectedCollegeId && !formData.institutionName)}
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '8px',
              background: '#1D9E75',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
}
