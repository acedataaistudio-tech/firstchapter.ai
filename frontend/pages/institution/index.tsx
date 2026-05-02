import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { InstitutionOnboarding } from '../../components/InstitutionOnboarding';
import { InstitutionDashboard } from '../../components/InstitutionDashboard';
import { NotificationBell } from '../../components/NotificationBell';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
      const res = await fetch(`/api/institution/status/${user?.id}`);
      const data = await res.json();
      setApplicationStatus(data);
    } catch (error) {
      console.error('Failed to check application status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (!isLoaded || loading) {
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
            Loading...
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

  // Render different views based on application status
  const renderContent = () => {
    // No application yet - show onboarding
    if (!applicationStatus || !applicationStatus.has_application) {
      return <InstitutionOnboarding />;
    }

    // Application pending - show pending status
    if (applicationStatus.status === 'pending') {
      return (
        <div style={{
          minHeight: "100vh",
          background: "#f9f9f7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
          padding: "24px",
        }}>
          <div style={{
            maxWidth: "500px",
            width: "100%",
            background: "white",
            borderRadius: "16px",
            padding: "40px",
            border: "1px solid #e5e4dc",
            textAlign: "center",
          }}>
            <Clock size={48} style={{ color: "#F39C12", marginBottom: "16px" }} />
            <h1 style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#2C2C2A",
              marginBottom: "12px",
            }}>
              Application Under Review
            </h1>
            <p style={{
              fontSize: "15px",
              color: "#888780",
              lineHeight: "1.6",
              marginBottom: "24px",
            }}>
              Your institution application for <strong>{applicationStatus.institution_name}</strong> is currently being reviewed by our team.
            </p>
            <div style={{
              background: "#FFF4E5",
              border: "1px solid #FFE0B2",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px",
            }}>
              <p style={{
                fontSize: "13px",
                color: "#8B5A00",
                margin: 0,
              }}>
                📧 You will receive an email notification once your application is processed.
                This typically takes 1-2 business days.
              </p>
            </div>
            <div style={{
              fontSize: "12px",
              color: "#AAA9A0",
            }}>
              Submitted on {new Date(applicationStatus.submitted_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      );
    }

    // Application rejected - show rejection message
    if (applicationStatus.status === 'rejected') {
      return (
        <div style={{
          minHeight: "100vh",
          background: "#f9f9f7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
          padding: "24px",
        }}>
          <div style={{
            maxWidth: "500px",
            width: "100%",
            background: "white",
            borderRadius: "16px",
            padding: "40px",
            border: "1px solid #e5e4dc",
            textAlign: "center",
          }}>
            <XCircle size={48} style={{ color: "#E74C3C", marginBottom: "16px" }} />
            <h1 style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#2C2C2A",
              marginBottom: "12px",
            }}>
              Application Not Approved
            </h1>
            <p style={{
              fontSize: "15px",
              color: "#888780",
              lineHeight: "1.6",
              marginBottom: "24px",
            }}>
              Unfortunately, your application for <strong>{applicationStatus.institution_name}</strong> was not approved.
            </p>
            {applicationStatus.rejection_reason && (
              <div style={{
                background: "#FEE",
                border: "1px solid #FCC",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "24px",
                textAlign: "left",
              }}>
                <div style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#C00",
                  marginBottom: "8px",
                }}>
                  Reason:
                </div>
                <p style={{
                  fontSize: "14px",
                  color: "#800",
                  margin: 0,
                }}>
                  {applicationStatus.rejection_reason}
                </p>
              </div>
            )}
            <button
              onClick={() => router.push('/contact')}
              style={{
                padding: "12px 24px",
                background: "#378ADD",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Contact Support
            </button>
          </div>
        </div>
      );
    }

    // Application approved - show dashboard
    if (applicationStatus.status === 'approved' && applicationStatus.is_active) {
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
                  {applicationStatus.institution_name}
                </p>
              </div>

              {/* User info & notifications */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}>
                {/* Notification Bell */}
                <NotificationBell userId={user?.id || ''} userRole="institution" />

                {/* User Info */}
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

          {/* Dashboard */}
          <InstitutionDashboard institutionId={applicationStatus.institution_id} />
        </div>
      );
    }

    // Fallback - something went wrong
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
          <AlertCircle size={48} style={{ color: "#888780", marginBottom: "16px" }} />
          <p style={{ fontSize: "14px", color: "#888780" }}>
            Unable to load institution data. Please try again.
          </p>
        </div>
      </div>
    );
  };

  return renderContent();
}
