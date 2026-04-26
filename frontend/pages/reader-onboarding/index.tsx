import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";

export default function ReaderOnboarding() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isInstitution, setIsInstitution] = useState<boolean | null>(null);
  const [collegeCode, setCollegeCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [form, setForm] = useState({ name: "", profession: "", reason: "" });
  const [loading, setLoading] = useState(false);

  const professions = [
    "Student", "Researcher", "Academic / Professor",
    "Professional", "Entrepreneur", "Writer / Author",
    "Curious reader", "Other",
  ];

  const reasons = [
    "Research and study",
    "Professional development",
    "Personal learning",
    "Writing and content creation",
    "Teaching and training",
    "Just exploring",
  ];

  const handleCollegeCode = async () => {
    if (!collegeCode.trim()) { setCodeError("Please enter your college code"); return; }
    setLoading(true);
    // For now accept any code — will validate against Supabase later
    try {
      await user?.update({
        firstName: form.name || user.firstName || "",
        unsafeMetadata: {
          role:        "student",
          onboarded:   true,
          collegeCode: collegeCode.toUpperCase(),
        }
      });
      router.push("/");
    } catch (e) {
      setCodeError("Failed to save. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleIndividual = async () => {
    setLoading(true);
    try {
      await user?.update({
        firstName: form.name || user.firstName || "",
        unsafeMetadata: {
          role:       "reader",
          onboarded:  true,
          profession: form.profession,
          reason:     form.reason,
        }
      });
      router.push("/");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return null;

  const inputStyle: any = {
    width: "100%", padding: "12px 16px",
    border: "0.5px solid #e5e4dc", borderRadius: "12px",
    fontSize: "14px", outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box", background: "white",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9f9f7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color: "#2C2C2A", margin: "0 0 8px" }}>
            First<span style={{ color: "#1D9E75" }}>chapter</span>
          </h1>
          <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>
            {step === 1 ? "Let's get you set up" : isInstitution ? "Enter your college code" : "Tell us a bit about yourself"}
          </p>
        </div>

        <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "20px", padding: "32px" }}>

          {/* STEP 1 — Institution check */}
          {step === 1 && (
            <>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color: "#2C2C2A", margin: "0 0 8px" }}>
                Are you from a partner institution?
              </h2>
              <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 32px", lineHeight: 1.6 }}>
                If your college or university has a Firstchapter subscription, enter your college code to get unlimited access.
              </p>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
                <button
                  onClick={() => { setIsInstitution(true); setStep(2); }}
                  style={{
                    padding: "16px 20px", border: "1.5px solid #e5e4dc",
                    borderRadius: "14px", background: "white", cursor: "pointer",
                    textAlign: "left" as const, fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#1D9E75"; e.currentTarget.style.background = "#f9fffd"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e4dc"; e.currentTarget.style.background = "white"; }}
                >
                  <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 4px" }}>
                    🏛️ Yes, I have a college code
                  </p>
                  <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>
                    Get unlimited queries under your institution's subscription
                  </p>
                </button>

                <button
                  onClick={() => { setIsInstitution(false); setStep(2); }}
                  style={{
                    padding: "16px 20px", border: "1.5px solid #e5e4dc",
                    borderRadius: "14px", background: "white", cursor: "pointer",
                    textAlign: "left" as const, fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#1D9E75"; e.currentTarget.style.background = "#f9fffd"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e4dc"; e.currentTarget.style.background = "white"; }}
                >
                  <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 4px" }}>
                    📚 No, I'm an individual reader
                  </p>
                  <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>
                    Start with 10 free queries per month
                  </p>
                </button>
              </div>
            </>
          )}

          {/* STEP 2A — College code */}
          {step === 2 && isInstitution && (
            <>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color: "#2C2C2A", margin: "0 0 8px" }}>
                Enter your college code
              </h2>
              <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 24px", lineHeight: 1.6 }}>
                Your institution administrator would have shared this with you.
              </p>

              <div style={{ marginBottom: "16px" }}>
                <input
                  type="text"
                  placeholder="e.g. IITM2026"
                  value={collegeCode}
                  onChange={e => { setCollegeCode(e.target.value.toUpperCase()); setCodeError(""); }}
                  style={{ ...inputStyle, letterSpacing: "2px", fontWeight: "500", textTransform: "uppercase" as const }}
                />
                {codeError && <p style={{ fontSize: "12px", color: "#E24B4A", margin: "6px 0 0" }}>{codeError}</p>}
              </div>

              <button onClick={handleCollegeCode} disabled={loading} style={{
                width: "100%", background: loading ? "#9FE1CB" : "#1D9E75",
                color: "white", border: "none", borderRadius: "100px",
                padding: "13px", fontSize: "14px", fontWeight: "500",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                marginBottom: "12px",
              }}>
                {loading ? "Verifying..." : "Access platform →"}
              </button>

              <button onClick={() => { setIsInstitution(false); setCodeError(""); }} style={{
                width: "100%", background: "none", border: "none",
                color: "#888780", fontSize: "13px", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                I don't have a code — continue as individual
              </button>
            </>
          )}

          {/* STEP 2B — Individual profile */}
          {step === 2 && !isInstitution && (
            <>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color: "#2C2C2A", margin: "0 0 8px" }}>
                Quick profile
              </h2>
              <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 24px", lineHeight: 1.6 }}>
                Help us personalise your experience. You can skip any field.
              </p>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Your name</label>
                <input type="text" placeholder="Full name" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "8px" }}>What best describes you?</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {professions.map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, profession: p }))} style={{
                      padding: "10px 12px", border: `1.5px solid ${form.profession === p ? "#1D9E75" : "#e5e4dc"}`,
                      borderRadius: "10px", background: form.profession === p ? "#E1F5EE" : "white",
                      fontSize: "12px", color: form.profession === p ? "#0F6E56" : "#5F5E5A",
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left" as const,
                    }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "8px" }}>Why are you here?</label>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                  {reasons.map(r => (
                    <button key={r} onClick={() => setForm(f => ({ ...f, reason: r }))} style={{
                      padding: "10px 14px", border: `1.5px solid ${form.reason === r ? "#1D9E75" : "#e5e4dc"}`,
                      borderRadius: "10px", background: form.reason === r ? "#E1F5EE" : "white",
                      fontSize: "13px", color: form.reason === r ? "#0F6E56" : "#5F5E5A",
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left" as const,
                    }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleIndividual} disabled={loading} style={{
                width: "100%", background: loading ? "#9FE1CB" : "#1D9E75",
                color: "white", border: "none", borderRadius: "100px",
                padding: "13px", fontSize: "14px", fontWeight: "500",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                marginBottom: "12px",
              }}>
                {loading ? "Setting up..." : "Start reading →"}
              </button>

              <button onClick={() => handleIndividual()} style={{
                width: "100%", background: "none", border: "none",
                color: "#B4B2A9", fontSize: "13px", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Skip — take me to the platform
              </button>
            </>
          )}

        </div>

        <p style={{ textAlign: "center", fontSize: "12px", color: "#B4B2A9", marginTop: "20px" }}>
          Firstchapter.ai — India's first AI-powered licensed book platform
        </p>
      </div>
    </div>
  );
}