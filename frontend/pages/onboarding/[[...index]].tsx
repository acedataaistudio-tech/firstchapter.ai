import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";

const roles = [
  {
    id: "student",
    title: "Reader",
    description: "Discover and query books. Get instant cited answers on any topic.",
    icon: "📚",
    color: "#1D9E75",
  },
  {
    id: "institution",
    title: "Institution / Library",
    description: "Manage student access and view usage analytics",
    icon: "🏛️",
    color: "#378ADD",
  },
  {
    id: "publisher",
    title: "Publisher",
    description: "Upload books and track revenue from queries",
    icon: "📖",
    color: "#7F77DD",
  },
];

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState("");
  const [name, setName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  if (!isLoaded) return null;

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    setStep(2);
  };

useEffect(() => {
  if (!isLoaded || !user) return;
  const role = user.unsafeMetadata?.role || user.publicMetadata?.role;
  if (role === "publisher")   router.push("/publisher");
  if (role === "institution") router.push("/institution");
  if (role === "reader" || role === "student") router.push("/reader-onboarding");
}, [isLoaded, user]);

 const handleSubmit = async () => {
    if (!selectedRole || !name) return;
    setLoading(true);

    try {
      await user?.update({
        firstName: name,
        unsafeMetadata: {
          role:         selectedRole,
          organisation: organisation,
          onboarded:    true,
        }
      });
    } catch (e) {
      console.error("Onboarding error:", e);
    }

    setLoading(false);

    if (selectedRole === "publisher")   router.push("/publisher-onboarding");
    if (selectedRole === "institution") router.push("/institution");
    if (selectedRole === "student") router.push("/reader-onboarding");
};

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f9f9f7",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
      padding: "40px 20px",
    }}>
      <div style={{ maxWidth: "560px", width: "100%" }}>

        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "28px",
            color: "#2C2C2A",
          }}>
            First<span style={{ color: "#1D9E75" }}>chapter</span>
          </h1>
          <p style={{ fontSize: "14px", color: "#888780", marginTop: "6px" }}>
            {step === 1 ? "Tell us who you are" : "Complete your profile"}
          </p>
        </div>

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                style={{
                  background: "white",
                  border: selectedRole === role.id
                    ? `2px solid ${role.color}`
                    : "0.5px solid #e5e4dc",
                  borderRadius: "16px",
                  padding: "24px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: "32px" }}>{role.icon}</span>
                <div>
                  <p style={{
                    fontSize: "16px",
                    fontWeight: "500",
                    color: "#2C2C2A",
                    marginBottom: "4px",
                  }}>
                    {role.title}
                  </p>
                  <p style={{ fontSize: "13px", color: "#888780" }}>
                    {role.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div style={{
            background: "white",
            border: "0.5px solid #e5e4dc",
            borderRadius: "16px",
            padding: "32px",
          }}>
            <button
              onClick={() => setStep(1)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#888780",
                fontSize: "13px",
                marginBottom: "24px",
                padding: 0,
              }}
            >
              ← Back
            </button>

            <p style={{
              fontSize: "13px",
              color: "#1D9E75",
              fontWeight: "500",
              marginBottom: "24px",
              textTransform: "capitalize",
            }}>
              {roles.find(r => r.id === selectedRole)?.icon} {selectedRole} account
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{
                  fontSize: "13px",
                  color: "#888780",
                  display: "block",
                  marginBottom: "6px"
                }}>
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "0.5px solid #e5e4dc",
                    borderRadius: "10px",
                    fontSize: "14px",
                    outline: "none",
                    fontFamily: "'DM Sans', sans-serif",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{
                  fontSize: "13px",
                  color: "#888780",
                  display: "block",
                  marginBottom: "6px"
                }}>
                  {selectedRole === "publisher"
                    ? "Publisher / Company name"
                    : selectedRole === "institution"
                    ? "Institution name"
                    : "Your university or college"}
                </label>
                <input
                  type="text"
                  value={organisation}
                  onChange={(e) => setOrganisation(e.target.value)}
                  placeholder={
                    selectedRole === "publisher"
                      ? "e.g. Notion Press"
                      : selectedRole === "institution"
                      ? "e.g. IIT Madras"
                      : "e.g. Anna University"
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "0.5px solid #e5e4dc",
                    borderRadius: "10px",
                    fontSize: "14px",
                    outline: "none",
                    fontFamily: "'DM Sans', sans-serif",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!name || loading}
                style={{
                  background: name && !loading ? "#1D9E75" : "#9FE1CB",
                  color: "white",
                  border: "none",
                  borderRadius: "100px",
                  padding: "12px 28px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: name && !loading ? "pointer" : "not-allowed",
                  fontFamily: "'DM Sans', sans-serif",
                  marginTop: "8px",
                  transition: "background 0.2s",
                }}
              >
                {loading ? "Setting up your account..." : "Get started →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}