import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type InviteDetails = {
  invite_token: string;
  institution_id: string;
  institution_name: string;
  student_name: string;
  student_email: string;
  student_roll_number: string;
  validity_period_years: number;
  status: string;
};

export default function InvitePage() {
  const router = useRouter();
  const { token } = router.query;
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!token || Array.isArray(token)) return;
    const tokenStr = token;

    const fetchInvite = async () => {
      try {
        const r = await fetch(`${API_URL}/api/institution/invites/${tokenStr}`);
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          setError(typeof data.detail === "string" ? data.detail : "This invite link is invalid or has expired.");
          setLoading(false);
          return;
        }
        const data = await r.json();
        setInvite(data);
      } catch {
        setError("Could not verify your invite. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [token]);

  // If user is signed in and matches the invited email, push them straight to finalize
  useEffect(() => {
    if (!isLoaded || !user || !invite) return;
    const userEmail = (
      user.primaryEmailAddress?.emailAddress
      || user.emailAddresses?.[0]?.emailAddress
      || ""
    ).toLowerCase();
    if (userEmail === invite.student_email.toLowerCase()) {
      router.push(`/invite/${invite.invite_token}/finalize`);
    }
  }, [isLoaded, user, invite, router]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <p style={{ fontSize: "14px", color: "#888780" }}>Verifying your invite...</p>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <Branding />
          <div style={iconCircleStyle("#FDEDEC")}>⚠️</div>
          <h2 style={titleStyle}>Invite not valid</h2>
          <p style={bodyStyle}>{error || "This link could not be verified."}</p>
          <p style={subtleStyle}>If you believe this is a mistake, please ask your institution to send a fresh invite.</p>
        </div>
      </div>
    );
  }

  const userEmail = (
    user?.primaryEmailAddress?.emailAddress
    || user?.emailAddresses?.[0]?.emailAddress
    || ""
  ).toLowerCase();
  const emailMismatch = isLoaded && user && userEmail !== invite.student_email.toLowerCase();

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <Branding />

        <div style={iconCircleStyle("#EEEDFE")}>✉️</div>

        <h2 style={titleStyle}>You're invited to Firstchapter</h2>

        <p style={bodyStyle}>
          <strong>{invite.institution_name}</strong> has invited you to access
          their licensed Firstchapter library as a student.
        </p>

        <div style={{
          background: "#f9f9f7", border: "0.5px solid #e5e4dc",
          borderRadius: "10px", padding: "16px 18px", margin: "20px 0",
          textAlign: "left", fontSize: "13px", color: "#3D3D3A",
        }}>
          <div style={{ fontSize: "11px", color: "#888780", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
            Invite details
          </div>
          <div style={{ display: "grid", gap: "6px" }}>
            <div><strong>Name:</strong> {invite.student_name}</div>
            <div><strong>Admission number:</strong> {invite.student_roll_number}</div>
            <div><strong>Email:</strong> {invite.student_email}</div>
            <div><strong>Access duration:</strong> {invite.validity_period_years} {invite.validity_period_years === 1 ? "year" : "years"}</div>
          </div>
        </div>

        {emailMismatch ? (
          <>
            <div style={{
              background: "#FDEDEC", border: "1px solid #F5B7B1",
              borderRadius: "8px", padding: "12px 14px", margin: "0 0 16px",
              fontSize: "12px", color: "#922B21", lineHeight: 1.5,
            }}>
              You are signed in as <strong>{userEmail}</strong>, but this invite is for{" "}
              <strong>{invite.student_email}</strong>. Please sign out and sign back in with
              the invited email to accept.
            </div>
            <button
              onClick={() => signOut(() => router.reload())}
              style={primaryButtonStyle}
            >
              Sign out and try again
            </button>
          </>
        ) : (
          <>
            <p style={subtleStyle}>
              Click below to verify your email and complete signup. We use your email to confirm your identity — it cannot be changed during this step.
            </p>
            <button
              onClick={() => router.push(`/sign-up?invite=${invite.invite_token}&email=${encodeURIComponent(invite.student_email)}`)}
              style={primaryButtonStyle}
            >
              Sign up to accept →
            </button>
            <p style={{ fontSize: "12px", color: "#888780", margin: "16px 0 0" }}>
              Already have a Firstchapter account?{" "}
              <a
                href={`/sign-in?redirect_url=${encodeURIComponent(`/invite/${invite.invite_token}`)}`}
                style={{ color: "#1D9E75", textDecoration: "none" }}
              >
                Sign in
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const pageStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#f9f9f7",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "32px 16px", fontFamily: "'DM Sans', sans-serif",
};

const cardStyle: React.CSSProperties = {
  background: "white", border: "1px solid #e5e4dc", borderRadius: "16px",
  padding: "44px 40px", maxWidth: "560px", width: "100%",
  textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: "24px", color: "#2C2C2A", margin: "0 0 12px",
};

const bodyStyle: React.CSSProperties = {
  fontSize: "15px", lineHeight: 1.6, color: "#3D3D3A", margin: "0 0 20px",
};

const subtleStyle: React.CSSProperties = {
  fontSize: "12px", color: "#888780", margin: "0 0 20px", lineHeight: 1.6,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "12px 28px", background: "#1D9E75", color: "white",
  border: "none", borderRadius: "100px", fontSize: "14px", fontWeight: 500,
  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};

function iconCircleStyle(bg: string): React.CSSProperties {
  return {
    width: "60px", height: "60px", margin: "0 auto 20px",
    borderRadius: "50%", background: bg,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "26px",
  };
}

function Branding() {
  return (
    <h1 style={{
      fontFamily: "'DM Serif Display', serif",
      fontSize: "26px", color: "#2C2C2A", margin: "0 0 24px",
    }}>
      First<span style={{ color: "#1D9E75" }}>chapter</span>
    </h1>
  );
}
