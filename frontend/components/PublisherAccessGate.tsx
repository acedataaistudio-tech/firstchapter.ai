/**
 * PublisherAccessGate — wraps the publisher dashboard with an approval guard.
 *
 * Calls /api/publisher/access-state on mount and renders one of:
 *   - children (state = 'approved')          : full dashboard
 *   - <PendingScreen>  (state = 'pending')   : awaiting review
 *   - <RejectedScreen> (state = 'rejected')  : application not approved
 *   - <NoApplicationScreen> (state = 'no_application') : redirect to onboarding
 *
 * Same pattern as AccessStateBanner — refetches on tab focus so newly
 * approved publishers see the dashboard without manual reload.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@clerk/nextjs";
import { Clock, AlertCircle, ArrowRight, RotateCw } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type PublisherAccessState = {
  state: "approved" | "pending" | "rejected" | "no_application";
  publisher_name: string | null;
  rejection_reason: string | null;
  can_reapply: boolean;
};

interface PublisherAccessGateProps {
  children: React.ReactNode;
}

export function PublisherAccessGate({ children }: PublisherAccessGateProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [accessState, setAccessState] = useState<PublisherAccessState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) return;

    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/publisher/access-state?user_id=${encodeURIComponent(user.id)}`
        );
        if (!res.ok) {
          // Fail safe — show pending screen rather than the dashboard
          if (!cancelled) {
            setAccessState({
              state: "pending",
              publisher_name: null,
              rejection_reason: null,
              can_reapply: false,
            });
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) setAccessState(data);
      } catch {
        if (!cancelled) {
          setAccessState({
            state: "pending",
            publisher_name: null,
            rejection_reason: null,
            can_reapply: false,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // Refetch on tab focus so admin approvals reflect without manual reload
    const onFocus = () => { if (!cancelled) load(); };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [isLoaded, user]);

  // Wait for Clerk + initial fetch
  if (!isLoaded || loading || !accessState) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#f9f9f7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <p style={{ fontSize: "14px", color: "#888780" }}>Loading...</p>
      </div>
    );
  }

  // No application yet — they shouldn't be here. Send them to onboarding.
  if (accessState.state === "no_application") {
    if (typeof window !== "undefined") {
      router.replace("/publisher-onboarding");
    }
    return null;
  }

  if (accessState.state === "approved") {
    return <>{children}</>;
  }

  if (accessState.state === "rejected") {
    return <RejectedScreen accessState={accessState} />;
  }

  // 'pending' (or any unexpected value) → pending screen
  return <PendingScreen accessState={accessState} />;
}

// ──────────────────────────────────────────────────────────────────
// PendingScreen
// ──────────────────────────────────────────────────────────────────
function PendingScreen({ accessState }: { accessState: PublisherAccessState }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f9f9f7",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 16px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        background: "white",
        border: "1px solid #e5e4dc",
        borderRadius: "16px",
        padding: "44px 40px",
        maxWidth: "560px",
        width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
      }}>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "26px",
          color: "#2C2C2A",
          margin: "0 0 8px 0",
        }}>
          First<span style={{ color: "#1D9E75" }}>chapter</span>
        </h1>

        <div style={{
          width: "60px",
          height: "60px",
          margin: "24px auto 18px",
          borderRadius: "50%",
          background: "#EEEDFE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Clock size={28} style={{ color: "#7F77DD" }} />
        </div>

        <h2 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "24px",
          color: "#2C2C2A",
          margin: "0 0 12px 0",
        }}>
          Your application is under review
        </h2>

        <p style={{
          fontSize: "15px",
          lineHeight: 1.6,
          color: "#3D3D3A",
          margin: "0 0 20px 0",
        }}>
          {accessState.publisher_name
            ? <>Thank you for applying as <strong>{accessState.publisher_name}</strong>. </>
            : "Thank you for applying. "}
          Our team is reviewing your details. Once approved, you will receive an email
          and your publisher dashboard will become available here.
        </p>

        <div style={{
          background: "#f9f9f7",
          border: "1px solid #e5e4dc",
          borderRadius: "10px",
          padding: "16px 18px",
          textAlign: "left",
          fontSize: "13px",
          color: "#3D3D3A",
          marginBottom: "24px",
        }}>
          <div style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#888780",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "8px",
          }}>
            What happens next
          </div>
          <ol style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.8 }}>
            <li>We verify your publisher and payout details</li>
            <li>We may reach out if any clarification is needed</li>
            <li>Once approved, your dashboard unlocks here automatically</li>
          </ol>
        </div>

        <p style={{
          fontSize: "12px",
          color: "#888780",
          margin: 0,
        }}>
          Questions?{" "}
          <a href="mailto:support@firstchapter.ai" style={{ color: "#1D9E75", textDecoration: "none" }}>
            support@firstchapter.ai
          </a>
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// RejectedScreen
// ──────────────────────────────────────────────────────────────────
function RejectedScreen({ accessState }: { accessState: PublisherAccessState }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f9f9f7",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 16px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        background: "white",
        border: "1px solid #e5e4dc",
        borderRadius: "16px",
        padding: "44px 40px",
        maxWidth: "560px",
        width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
      }}>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "26px",
          color: "#2C2C2A",
          margin: "0 0 8px 0",
        }}>
          First<span style={{ color: "#1D9E75" }}>chapter</span>
        </h1>

        <div style={{
          width: "60px",
          height: "60px",
          margin: "24px auto 18px",
          borderRadius: "50%",
          background: "#FDEDEC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <AlertCircle size={28} style={{ color: "#C0392B" }} />
        </div>

        <h2 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "24px",
          color: "#2C2C2A",
          margin: "0 0 12px 0",
        }}>
          Application not approved
        </h2>

        <p style={{
          fontSize: "15px",
          lineHeight: 1.6,
          color: "#3D3D3A",
          margin: "0 0 20px 0",
        }}>
          {accessState.publisher_name
            ? <>Thank you for your interest in publishing on Firstchapter as <strong>{accessState.publisher_name}</strong>. </>
            : "Thank you for your interest in publishing on Firstchapter. "}
          After review, we are unable to approve this application at this time.
        </p>

        {accessState.rejection_reason && (
          <div style={{
            background: "#f9f9f7",
            border: "1px solid #e5e4dc",
            borderLeft: "3px solid #C0392B",
            borderRadius: "8px",
            padding: "14px 16px",
            margin: "0 0 20px 0",
            textAlign: "left",
          }}>
            <div style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#888780",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "6px",
            }}>
              Reason
            </div>
            <div style={{ fontSize: "14px", color: "#3D3D3A", lineHeight: 1.6 }}>
              {accessState.rejection_reason}
            </div>
          </div>
        )}

        <p style={{
          fontSize: "13px",
          color: "#888780",
          margin: "0 0 24px 0",
          lineHeight: 1.6,
        }}>
          If you believe this was made in error, or if circumstances change,
          please reach out to us. We are happy to revisit applications when
          new information is available.
        </p>

        <a
          href="mailto:support@firstchapter.ai"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "#1D9E75",
            color: "white",
            textDecoration: "none",
            borderRadius: "100px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Contact support
        </a>
      </div>
    </div>
  );
}
