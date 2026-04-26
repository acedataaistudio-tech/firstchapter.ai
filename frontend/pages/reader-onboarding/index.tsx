import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";

const professions = [
  "Student",
  "Researcher",
  "Academic / Professor",
  "Working Professional",
  "Entrepreneur",
  "Writer / Author",
  "Curious reader",
  "Other",
];

const reasons = [
  "Research and study",
  "Professional development",
  "Personal learning",
  "Writing and content creation",
  "Teaching and training",
  "Just exploring",
];

const subjectAreas = [
  "Philosophy",
  "Economics",
  "Business & Management",
  "History",
  "Science & Technology",
  "Psychology",
  "Politics & Law",
  "Self Development",
  "Literature",
  "Mathematics",
  "Medicine & Health",
  "Education",
  "Strategy & Leadership",
  "Indian Studies",
  "Environment",
  "Art & Culture",
];

export default function ReaderOnboarding() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isInstitution, setIsInstitution] = useState<boolean | null>(null);
  const [collegeCode, setCollegeCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [loading, setLoading] = useState(false);

  // Profile form
  const [profession, setProfession] = useState("");
  const [reason, setReason] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoaded || !user) return;
  }, [isLoaded, user]);

  const toggleSubject = (subject: string) => {
    setSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : prev.length < 6 ? [...prev, subject] : prev
    );
  };

  const handleCollegeCode = () => {
    if (!collegeCode.trim()) { setCodeError("Please enter your college code"); return; }
    // Move to profile step regardless
    setIsInstitution(true);
    setStep(2);
    setCodeError("");
  };

  const handleSave = async () => {
    if (subjects.length === 0) {
      alert("Please select at least one subject area");
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        unsafeMetadata: {
          role:       isInstitution ? "student" : "reader",
          onboarded:  true,
          profession,
          reason,
          subjects,
          ...(isInstitution && { collegeCode: collegeCode.toUpperCase() }),
        }
      };

      await user?.update(updateData);
      router.push("/");
    } catch (e) {
      console.error("Onboarding save error:", e);
      alert("Something went wrong. Please try again.");
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
    <div style={{
      minHeight: "100vh", background: "#f9f9f7",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color: "#2C2C2A", margin: "0 0 6px" }}>
            First<span style={{ color: "#1D9E75" }}>chapter</span>
          </h1>
          <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>
            {step === 1 ? "One quick question before we begin" : "Tell us what you love reading"}
          </p>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "24px" }}>
          {[1, 2].map(i => (
            <div key={i} style={{
              width: i === step ? "20px" : "6px", height: "6px",
              borderRadius: "100px",
              background: i === step ? "#1D9E75" : i < step ? "#1D9E75" : "#e5e4dc",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "20px", padding: "32px" }}>

          {/* STEP 1 — Institution check */}
          {step === 1 && (
            <>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color: "#2C2C2A", margin: "0 0 8px" }}>
                Are you from a partner institution?
              </h2>
              <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 28px", lineHeight: 1.6 }}>
                If your college or university has a Firstchapter subscription, enter your college code for unlimited access.
              </p>

              {/* College code input */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>
                  College code
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    placeholder="e.g. IITM2026"
                    value={collegeCode}
                    onChange={e => { setCollegeCode(e.target.value.toUpperCase()); setCodeError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleCollegeCode()}
                    style={{ ...inputStyle, letterSpacing: "1px", fontWeight: "500", flex: 1 }}
                  />
                  <button onClick={handleCollegeCode} style={{
                    background: "#1D9E75", color: "white", border: "none",
                    borderRadius: "12px", padding: "0 20px",
                    fontSize: "13px", fontWeight: "500", cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" as const,
                  }}>
                    Apply
                  </button>
                </div>
                {codeError && <p style={{ fontSize: "12px", color: "#E24B4A", margin: "6px 0 0" }}>{codeError}</p>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
                <div style={{ flex: 1, height: "0.5px", background: "#e5e4dc" }} />
                <p style={{ fontSize: "12px", color: "#B4B2A9", margin: 0 }}>or</p>
                <div style={{ flex: 1, height: "0.5px", background: "#e5e4dc" }} />
              </div>

              <button
                onClick={() => { setIsInstitution(false); setStep(2); }}
                style={{
                  width: "100%", padding: "14px 20px",
                  border: "1.5px solid #e5e4dc", borderRadius: "14px",
                  background: "white", cursor: "pointer",
                  textAlign: "left" as const, fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#1D9E75"; e.currentTarget.style.background = "#f9fffd"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e4dc"; e.currentTarget.style.background = "white"; }}
              >
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 3px" }}>
                  📚 I'm an individual reader
                </p>
                <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>
                  Start with 10 free queries per month
                </p>
              </button>
            </>
          )}

          {/* STEP 2 — Profile (both institution + individual) */}
          {step === 2 && (
            <>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color: "#2C2C2A", margin: "0 0 4px" }}>
                Welcome, {user?.firstName}! 👋
              </h2>
              <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 24px", lineHeight: 1.6 }}>
                {isInstitution
                  ? `College code applied ✅ — tell us what you love reading`
                  : "Help us personalise your reading experience"}
              </p>

              {/* Profession */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "8px" }}>
                  What best describes you?
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {professions.map(p => (
                    <button key={p} onClick={() => setProfession(p)} style={{
                      padding: "10px 12px",
                      border: `1.5px solid ${profession === p ? "#1D9E75" : "#e5e4dc"}`,
                      borderRadius: "10px",
                      background: profession === p ? "#E1F5EE" : "white",
                      fontSize: "12px",
                      color: profession === p ? "#0F6E56" : "#5F5E5A",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      textAlign: "left" as const,
                      transition: "all 0.15s",
                    }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject areas */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "4px" }}>
                  Subject areas of interest <span style={{ color: "#E24B4A" }}>*</span>
                </label>
                <p style={{ fontSize: "11px", color: "#B4B2A9", margin: "0 0 8px" }}>
                  Pick up to 6 — we'll show relevant books first
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {subjectAreas.map(s => (
                    <button key={s} onClick={() => toggleSubject(s)} style={{
                      padding: "7px 14px",
                      border: `1.5px solid ${subjects.includes(s) ? "#1D9E75" : "#e5e4dc"}`,
                      borderRadius: "100px",
                      background: subjects.includes(s) ? "#E1F5EE" : "white",
                      fontSize: "12px",
                      color: subjects.includes(s) ? "#0F6E56" : "#5F5E5A",
                      cursor: subjects.length >= 6 && !subjects.includes(s) ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      opacity: subjects.length >= 6 && !subjects.includes(s) ? 0.5 : 1,
                      transition: "all 0.15s",
                    }}>
                      {subjects.includes(s) ? "✓ " : ""}{s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Why here */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "8px" }}>
                  Why are you here?
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {reasons.map(r => (
                    <button key={r} onClick={() => setReason(r)} style={{
                      padding: "10px 12px",
                      border: `1.5px solid ${reason === r ? "#1D9E75" : "#e5e4dc"}`,
                      borderRadius: "10px",
                      background: reason === r ? "#E1F5EE" : "white",
                      fontSize: "12px",
                      color: reason === r ? "#0F6E56" : "#5F5E5A",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      textAlign: "left" as const,
                      transition: "all 0.15s",
                    }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={loading || subjects.length === 0}
                style={{
                  width: "100%",
                  background: loading || subjects.length === 0 ? "#9FE1CB" : "#1D9E75",
                  color: "white", border: "none", borderRadius: "100px",
                  padding: "14px", fontSize: "14px", fontWeight: "500",
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  marginBottom: "12px",
                }}>
                {loading ? "Setting up your account..." : "Start reading →"}
              </button>

              <button
                onClick={async () => {
                  // Allow skip but save minimum data
                  setLoading(true);
                  try {
                    await user?.update({
                      unsafeMetadata: {
                        role:      isInstitution ? "student" : "reader",
                        onboarded: true,
                        ...(isInstitution && { collegeCode: collegeCode.toUpperCase() }),
                      }
                    });
                    router.push("/");
                  } catch { router.push("/"); }
                  finally { setLoading(false); }
                }}
                style={{
                  width: "100%", background: "none", border: "none",
                  color: "#B4B2A9", fontSize: "13px", cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                Skip for now
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
