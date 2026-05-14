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

export default function FinalizeInvitePage() {
  const router = useRouter();
  const { token } = router.query;
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  // Optional extra fields the student fills
  const [year, setYear] = useState("");
  const [department, setDepartment] = useState("");
  const [course, setCourse] = useState("");

  // Load the invite
  useEffect(() => {
    if (!token || Array.isArray(token)) return;
    const fetchInvite = async () => {
      try {
        const r = await fetch(`${API_URL}/api/institution/invites/${token}`);
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          setError(typeof data.detail === "string" ? data.detail : "This invite link is invalid or has expired.");
          setLoading(false);
          return;
        }
        setInvite(await r.json());
      } catch {
        setError("Could not verify your invite.");
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [token]);

  // If not signed in, redirect to invite page
  useEffect(() => {
    if (isLoaded && !user && token) {
      router.push(`/invite/${token}`);
    }
  }, [isLoaded, user, token, router]);

  const userEmail = (
    user?.primaryEmailAddress?.emailAddress
    || user?.emailAddresses?.[0]?.emailAddress
    || ""
  ).toLowerCase();
  const emailMismatch = invite && userEmail && userEmail !== invite.student_email.toLowerCase();

  const handleClaim = async () => {
    if (!invite || !user) return;
    setClaiming(true);
    setError("");
    try {
      const r = await fetch(`${API_URL}/api/institution/students/claim-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({
          invite_token: invite.invite_token,
          clerk_email: userEmail,
          student_year: year.trim() || null,
          student_department: department.trim() || null,
          student_course: course.trim() || null,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(typeof data.detail === "string" ? data.detail : "Could not complete your signup.");
        setClaiming(false);
        return;
      }
      // Update Clerk metadata so the home page redirects work
      try {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            role: "student",
            onboarded: true,
            collegeId: invite.institution_id,
            collegeName: invite.institution_name,
            hasSubscription: true,
          },
        });
      } catch (e) {
        console.warn("Clerk metadata update failed (non-fatal):", e);
      }
      setSuccess(true);
      // Redirect after a moment so user sees confirmation
      setTimeout(() => router.push("/"), 1800);
    } catch {
      setError("Network error — please try again.");
      setClaiming(false);
    }
  };

  if (loading || !isLoaded) {
    return <div style={pageStyle}><p style={{ fontSize: "14px", color: "#888780" }}>Loading...</p></div>;
  }

  if (error && !invite) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <Branding />
          <h2 style={titleStyle}>Could not verify invite</h2>
          <p style={bodyStyle}>{error}</p>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <Branding />
          <div style={iconCircleStyle("#E1F5EE")}>✓</div>
          <h2 style={titleStyle}>You're in!</h2>
          <p style={bodyStyle}>
            Welcome to <strong>{invite.institution_name}</strong>. Redirecting you to your library...
          </p>
        </div>
      </div>
    );
  }

  if (emailMismatch) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <Branding />
          <div style={iconCircleStyle("#FDEDEC")}>⚠️</div>
          <h2 style={titleStyle}>Email mismatch</h2>
          <p style={bodyStyle}>
            You signed up as <strong>{userEmail}</strong>, but this invite is for{" "}
            <strong>{invite.student_email}</strong>.
          </p>
          <p style={subtleStyle}>
            Please sign out and sign up again with the invited email address to accept this invite.
          </p>
          <button onClick={() => signOut(() => router.push(`/invite/${invite.invite_token}`))} style={primaryButtonStyle}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <Branding />

        <h2 style={titleStyle}>Almost done, {invite.student_name.split(" ")[0]}</h2>
        <p style={bodyStyle}>
          You're joining <strong>{invite.institution_name}</strong>. Confirm your details below to activate your access.
        </p>

        {/* Locked fields */}
        <div style={{
          background: "#f9f9f7", border: "0.5px solid #e5e4dc",
          borderRadius: "10px", padding: "16px", margin: "0 0 18px",
          textAlign: "left",
        }}>
          <div style={{ fontSize: "11px", color: "#888780", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Set by your institution
          </div>
          <div style={{ display: "grid", gap: "6px", fontSize: "13px", color: "#3D3D3A" }}>
            <div><strong>Name:</strong> {invite.student_name}</div>
            <div><strong>Admission number:</strong> {invite.student_roll_number}</div>
            <div><strong>Email:</strong> {invite.student_email}</div>
          </div>
        </div>

        {/* Optional fields */}
        <div style={{ textAlign: "left", marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", color: "#888780", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
            About you (optional)
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Year</label>
            <input type="text" placeholder="e.g. 2nd Year" value={year}
              onChange={e => setYear(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Department</label>
            <input type="text" placeholder="e.g. Computer Science" value={department}
              onChange={e => setDepartment(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Course / Program</label>
            <input type="text" placeholder="e.g. B.Tech CSE" value={course}
              onChange={e => setCourse(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {error && (
          <div style={{
            background: "#FDEDEC", border: "1px solid #F5B7B1",
            borderRadius: "8px", padding: "10px 14px", marginBottom: "14px",
            fontSize: "12px", color: "#922B21", textAlign: "left",
          }}>
            {error}
          </div>
        )}

        <button onClick={handleClaim} disabled={claiming} style={{
          ...primaryButtonStyle,
          background: claiming ? "#9FE1CB" : "#1D9E75",
          cursor: claiming ? "default" : "pointer",
          width: "100%",
        }}>
          {claiming ? "Activating..." : "Activate my account →"}
        </button>
      </div>
    </div>
  );
}

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
  fontSize: "15px", lineHeight: 1.6, color: "#3D3D3A", margin: "0 0 16px",
};
const subtleStyle: React.CSSProperties = {
  fontSize: "12px", color: "#888780", margin: "0 0 20px", lineHeight: 1.6,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", border: "0.5px solid #e5e4dc",
  borderRadius: "10px", fontSize: "14px", outline: "none",
  fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" as const,
};
const labelStyle: React.CSSProperties = {
  fontSize: "12px", color: "#888780", display: "block", marginBottom: "4px",
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
