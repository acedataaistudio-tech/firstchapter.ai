import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";
import { CollegeSelector } from "../../components/CollegeSelector";

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
  const [selectedCollege, setSelectedCollege] = useState<any>(null);
  const [isInstitution, setIsInstitution] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Profile form
  const [profession, setProfession] = useState("");
  const [reason, setReason] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);

  // Step 3 — institution verification (only used when applying to an institution)
  const [verificationName, setVerificationName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [yearOfAdmission, setYearOfAdmission] = useState<number | "">("");
  const [verificationError, setVerificationError] = useState<string>("");

  // Year-of-admission dropdown range: current year down to 6 years back
  const currentYear = new Date().getFullYear();
  const admissionYears = Array.from({ length: 7 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (!isLoaded || !user) return;
  }, [isLoaded, user]);

  // Pre-fill verification name from Clerk profile when stepping into Step 3
  useEffect(() => {
    if (step === 3 && user && !verificationName) {
      setVerificationName(user.fullName || user.firstName || "");
    }
  }, [step, user, verificationName]);

  const toggleSubject = (subject: string) => {
    setSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : prev.length < 6 ? [...prev, subject] : prev
    );
  };

  const handleCollegeSelect = (college: any) => {
    setSelectedCollege(college);
    if (college) {
      setIsInstitution(true);
    }
  };

  const handleContinueWithCollege = () => {
    if (selectedCollege) {
      setIsInstitution(true);
      setStep(2);
    }
  };

  const handleSave = async () => {
    if (subjects.length === 0) {
      alert("Please select at least one subject area");
      return;
    }

    if (!user) {
      alert("User not loaded. Please try again.");
      return;
    }

    // Save profile metadata to Clerk first (always)
    setLoading(true);
    try {
      const updateData: any = {
        unsafeMetadata: {
          role:       isInstitution ? "student" : "reader",
          onboarded:  true,
          profession,
          reason,
          subjects,
          ...(selectedCollege && {
            collegeId: selectedCollege.id,
            collegeName: selectedCollege.name,
            hasSubscription: selectedCollege.has_subscription,
          }),
        }
      };

      await user.update(updateData);

      // ✨ FLOW SPLIT:
      //   - Institutional applicant → continue to Step 3 (verification)
      //   - Individual reader → straight to pricing
      if (selectedCollege && isInstitution) {
        setStep(3);
        setLoading(false);
        return;
      }

      // Individual reader path — unchanged
      router.push("/pricing");
    } catch (e) {
      console.error("Onboarding save error:", e);
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // Submitted from Step 3 — sends the full institutional application
  const submitInstitutionApplication = async () => {
    if (!user || !selectedCollege) return;

    // Client-side validation
    const nameClean = verificationName.trim();
    const rollClean = admissionNumber.trim();

    if (!nameClean) {
      setVerificationError("Please enter your full name as per institutional records");
      return;
    }
    if (!rollClean) {
      setVerificationError("Please enter your admission/roll number");
      return;
    }
    if (!yearOfAdmission) {
      setVerificationError("Please select your year of admission");
      return;
    }

    setVerificationError("");
    setLoading(true);

    try {
      const response = await fetch('https://firstchapterai-production.up.railway.app/api/student/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          institution_id: selectedCollege.id,
          student_name: nameClean,
          student_email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '',
          student_roll_number: rollClean,
          year_of_admission: yearOfAdmission,
        })
      });

      if (!response.ok) {
        let detail = "Application could not be submitted. Please try again.";
        try {
          const data = await response.json();
          if (data?.detail) detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
        } catch { /* ignore */ }
        setVerificationError(detail);
        setLoading(false);
        return;
      }

      router.push('/reader-onboarding/pending');
    } catch (e) {
      console.error('Application error:', e);
      setVerificationError("Network error — please check your connection and try again.");
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
      <div style={{ width: "100%", maxWidth: selectedCollege ? "720px" : "520px", transition: "max-width 0.3s" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color: "#2C2C2A", margin: "0 0 6px" }}>
            First<span style={{ color: "#1D9E75" }}>chapter</span>
          </h1>
          <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>
            {step === 1
              ? "One quick question before we begin"
              : step === 2
                ? "Tell us what you love reading"
                : "Verify your enrollment for institution access"}
          </p>
        </div>

        {/* Progress dots — 3 steps for institutional applicants, 2 for individuals */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "24px" }}>
          {(selectedCollege && isInstitution ? [1, 2, 3] : [1, 2]).map(i => (
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
              <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 24px", lineHeight: 1.6 }}>
                If your college or university has a Firstchapter subscription, select it below for unlimited access.
              </p>

              {/* College Selector Component */}
              <div style={{ marginBottom: "20px" }}>
                <CollegeSelector
                  onSelect={handleCollegeSelect}
                  selectedCollege={selectedCollege}
                />
              </div>

              {/* Show info if college selected */}
              {selectedCollege && (
                <div style={{
                  background: selectedCollege.has_subscription ? "#E1F5EE" : "#FAEEDA",
                  border: `0.5px solid ${selectedCollege.has_subscription ? "#9FE1CB" : "#EFE1BC"}`,
                  borderRadius: "12px",
                  padding: "14px 18px",
                  marginBottom: "20px",
                }}>
                  <p style={{
                    fontSize: "13px",
                    color: selectedCollege.has_subscription ? "#0F6E56" : "#8B6914",
                    margin: "0 0 4px",
                    fontWeight: "500",
                  }}>
                    {selectedCollege.has_subscription ? "✓ Free access activated!" : "⚠️ No subscription yet"}
                  </p>
                  <p style={{
                    fontSize: "12px",
                    color: selectedCollege.has_subscription ? "#0F6E56" : "#8B6914",
                    margin: 0,
                  }}>
                    {selectedCollege.has_subscription
                      ? `Your institution has an active subscription. You get unlimited access to all books!`
                      : `${selectedCollege.name} doesn't have a subscription. You can still continue with individual access.`
                    }
                  </p>
                </div>
              )}

              {/* Continue button if college selected */}
              {selectedCollege && (
                <button
                  onClick={handleContinueWithCollege}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    background: "#1D9E75",
                    color: "white",
                    border: "none",
                    borderRadius: "14px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    marginBottom: "16px",
                  }}
                >
                  Continue with {selectedCollege.name} →
                </button>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
                <div style={{ flex: 1, height: "0.5px", background: "#e5e4dc" }} />
                <p style={{ fontSize: "12px", color: "#B4B2A9", margin: 0 }}>or</p>
                <div style={{ flex: 1, height: "0.5px", background: "#e5e4dc" }} />
              </div>

              <button
                onClick={() => { setIsInstitution(false); setSelectedCollege(null); setStep(2); }}
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
                  Start with free plan or choose a subscription
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
                {selectedCollege
                  ? `${selectedCollege.name} ${selectedCollege.has_subscription ? "✅ — unlimited access!" : "— tell us what you love reading"}`
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
                {loading
                  ? "Setting up your account..."
                  : (selectedCollege && isInstitution ? "Continue → Verify enrollment" : "Start reading →")}
              </button>

              <button
                onClick={async () => {
                  if (!user) {
                    alert("User not loaded. Please try again.");
                    return;
                  }

                  // Allow skip but save minimum data
                  setLoading(true);
                  try {
                    await user.update({
                      unsafeMetadata: {
                        role:      isInstitution ? "student" : "reader",
                        onboarded: true,
                        ...(selectedCollege && {
                          collegeId: selectedCollege.id,
                          collegeName: selectedCollege.name,
                          hasSubscription: selectedCollege.has_subscription,
                        }),
                      }
                    });

                    // Institution applicants cannot skip the verification step —
                    // route them to Step 3 instead. Individuals proceed to pricing.
                    if (selectedCollege && isInstitution) {
                      setStep(3);
                      setLoading(false);
                      return;
                    }
                    router.push("/pricing");
                  } catch {
                    router.push("/pricing");
                  } finally {
                    setLoading(false);
                  }
                }}
                style={{
                  width: "100%", background: "none", border: "none",
                  color: "#B4B2A9", fontSize: "13px", cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                {selectedCollege && isInstitution ? "Continue without preferences →" : "Skip for now"}
              </button>
            </>
          )}

          {/* STEP 3 — Institution verification (institution applicants only) */}
          {step === 3 && (
            <>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color: "#2C2C2A", margin: "0 0 4px" }}>
                Verify your enrollment
              </h2>
              <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 24px", lineHeight: 1.6 }}>
                {selectedCollege?.name} will use these details to verify your application.
                Please enter them exactly as on your institutional records.
              </p>

              {/* Full name as per records */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>
                  Full name (as per institutional records) <span style={{ color: "#E24B4A" }}>*</span>
                </label>
                <input
                  type="text"
                  value={verificationName}
                  onChange={(e) => { setVerificationName(e.target.value); setVerificationError(""); }}
                  placeholder="e.g., Loganathan Arumugam"
                  style={inputStyle}
                />
              </div>

              {/* Admission/roll number */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>
                  Admission / roll number <span style={{ color: "#E24B4A" }}>*</span>
                </label>
                <input
                  type="text"
                  value={admissionNumber}
                  onChange={(e) => { setAdmissionNumber(e.target.value); setVerificationError(""); }}
                  placeholder="e.g., 21BCE1042"
                  style={inputStyle}
                />
                <p style={{ fontSize: "11px", color: "#B4B2A9", margin: "6px 0 0" }}>
                  Used by your institution to verify your enrollment.
                </p>
              </div>

              {/* Year of admission */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>
                  Year of admission <span style={{ color: "#E24B4A" }}>*</span>
                </label>
                <select
                  value={yearOfAdmission}
                  onChange={(e) => { setYearOfAdmission(e.target.value ? parseInt(e.target.value) : ""); setVerificationError(""); }}
                  style={{ ...inputStyle, appearance: "auto" }}
                >
                  <option value="">Select year</option>
                  {admissionYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {verificationError && (
                <div style={{
                  background: "#FDEDEC",
                  border: "1px solid #F5B7B1",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  marginBottom: "16px",
                  fontSize: "12px",
                  color: "#922B21",
                  lineHeight: 1.5,
                }}>
                  {verificationError}
                </div>
              )}

              <button
                onClick={submitInstitutionApplication}
                disabled={loading}
                style={{
                  width: "100%",
                  background: loading ? "#9FE1CB" : "#1D9E75",
                  color: "white", border: "none", borderRadius: "100px",
                  padding: "14px", fontSize: "14px", fontWeight: "500",
                  cursor: loading ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif",
                  marginBottom: "12px",
                }}>
                {loading ? "Submitting application..." : "Submit application for review →"}
              </button>

              <button
                onClick={() => { setStep(2); setVerificationError(""); }}
                disabled={loading}
                style={{
                  width: "100%", background: "none", border: "none",
                  color: "#B4B2A9", fontSize: "13px",
                  cursor: loading ? "default" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                ← Back
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
