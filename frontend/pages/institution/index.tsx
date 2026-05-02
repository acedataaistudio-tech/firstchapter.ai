import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { InstitutionOnboarding } from '../../components/InstitutionOnboarding';
import { InstitutionDashboard } from '../../components/InstitutionDashboard';
import { NotificationBell } from '../../components/NotificationBell';
import { Clock, XCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';

export default function InstitutionPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [applicationStatus, setApplicationStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push('/sign-in');
      return;
    }
    checkApplicationStatus();
  }, [user, isLoaded, router]);

  const checkApplicationStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/institution/status/${user?.id}`);
      const data = await res.json();
      setApplicationStatus(data);
    } catch (error) {
      console.error('Failed to check application status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#f9f9f7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!applicationStatus || !applicationStatus.has_application) {
    return <InstitutionOnboarding />;
  }

  if (applicationStatus.status === 'pending') {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#f9f9f7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          maxWidth: "500px",
          background: "white",
          borderRadius: "16px",
          padding: "40px",
          border: "1px solid #e5e4dc",
          textAlign: "center",
        }}>
          <Clock size={48} style={{ color: "#F39C12", marginBottom: "16px" }} />
          <h1 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "12px" }}>
            Application Under Review
          </h1>
          <p style={{ fontSize: "15px", color: "#888780" }}>
            Your application for <strong>{applicationStatus.institution_name}</strong> is being reviewed.
          </p>
        </div>
      </div>
    );
  }

  if (applicationStatus.status === 'rejected') {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#f9f9f7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          maxWidth: "500px",
          background: "white",
          borderRadius: "16px",
          padding: "40px",
          border: "1px solid #e5e4dc",
          textAlign: "center",
        }}>
          <XCircle size={48} style={{ color: "#E74C3C", marginBottom: "16px" }} />
          <h1 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "12px" }}>
            Application Not Approved
          </h1>
          {applicationStatus.rejection_reason && (
            <p style={{ fontSize: "14px", color: "#800", marginTop: "16px" }}>
              {applicationStatus.rejection_reason}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (applicationStatus.status === 'approved' && applicationStatus.is_active) {
    return (
      <div style={{ minHeight: "100vh", background: "#f9f9f7" }}>
        <div style={{
          background: "white",
          borderBottom: "0.5px solid #e5e4dc",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <h1 style={{ fontSize: "24px", margin: 0 }}>
              First<span style={{ color: "#1D9E75" }}>chapter</span>
            </h1>
            <p style={{ fontSize: "12px", color: "#378ADD", margin: "4px 0 0" }}>
              {applicationStatus.institution_name}
            </p>
          </div>
          <NotificationBell userId={user?.id || ''} userRole="institution" />
        </div>
        <InstitutionDashboard institutionId={applicationStatus.institution_id} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9f9f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <AlertCircle size={48} style={{ color: "#888780" }} />
      <p>Unable to load institution data.</p>
    </div>
  );
}
