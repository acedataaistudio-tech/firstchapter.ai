import { InstitutionAdminDashboard } from '../../components/InstitutionAdminDashboard';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function InstitutionPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [institutionId, setInstitutionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    // Get institution ID from user metadata
    const userInstitutionId = user.unsafeMetadata?.institutionId as string;
    
    if (userInstitutionId) {
      setInstitutionId(userInstitutionId);
    } else {
      // If no institution ID in metadata, try to fetch from backend
      fetchInstitutionId();
    }
  }, [user, isLoaded, router]);

  const fetchInstitutionId = async () => {
    try {
      // TODO: Replace with your actual API endpoint
      // const response = await fetch(`/api/user/${user?.id}/institution`);
      // const data = await response.json();
      // setInstitutionId(data.institutionId);
      
      // For now, if user has institution role, we'll need an ID
      // You can set this during onboarding or admin setup
      console.warn('Institution ID not found in user metadata. Please set during onboarding.');
      
      // Temporary fallback - remove this in production
      setInstitutionId('temp-institution-id');
    } catch (error) {
      console.error('Failed to fetch institution ID:', error);
    }
  };

  if (!isLoaded || !institutionId) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#f9f9f7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: "3px solid #e5e4dc",
            borderTop: "3px solid #378ADD",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }} />
          <p style={{ fontSize: "14px", color: "#888780" }}>
            Loading dashboard...
          </p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f9f9f7",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: "white",
        borderBottom: "0.5px solid #e5e4dc",
        padding: "16px 32px",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "24px",
              color: "#2C2C2A",
              margin: 0,
            }}>
              First<span style={{ color: "#1D9E75" }}>chapter</span>
            </h1>
            <p style={{
              fontSize: "12px",
              color: "#378ADD",
              margin: "4px 0 0",
              fontWeight: "500",
            }}>
              Institution Portal
            </p>
          </div>

          {/* User info */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}>
            <div style={{ textAlign: "right" }}>
              <p style={{
                fontSize: "13px",
                fontWeight: "500",
                color: "#2C2C2A",
                margin: 0,
              }}>
                {user?.firstName || 'Admin'}
              </p>
              <p style={{
                fontSize: "11px",
                color: "#888780",
                margin: 0,
              }}>
                {user?.emailAddresses?.[0]?.emailAddress || 'admin@example.com'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Component */}
      <div style={{ padding: "24px" }}>
        <InstitutionAdminDashboard institutionId={institutionId} />
      </div>
    </div>
  );
}
