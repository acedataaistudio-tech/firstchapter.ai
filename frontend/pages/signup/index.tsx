import { useState } from "react";
import { useRouter } from "next/router";

const plans = [
  {
    id:          "free",
    name:        "Free",
    price:       "₹0",
    period:      "forever",
    queries:     "10 queries/month",
    color:       "#888780",
    features:    ["10 queries per month", "Access to public domain books", "Basic search"],
    limitations: ["No conversation memory", "No export", "No saved sessions"],
  },
  {
    id:          "reader",
    name:        "Reader",
    price:       "₹149",
    period:      "per month",
    queries:     "150 queries/month",
    color:       "#1D9E75",
    features:    ["150 queries per month", "Conversation memory", "Save sessions", "Share links", "Multi-book query"],
    limitations: ["No export to doc/PPT"],
  },
  {
    id:          "scholar",
    name:        "Scholar",
    price:       "₹399",
    period:      "per month",
    queries:     "400 queries/month",
    color:       "#378ADD",
    popular:     true,
    features:    ["400 queries per month", "Everything in Reader", "Export to Word and PPT", "Priority support"],
    limitations: [],
  },
  {
    id:          "pro",
    name:        "Pro",
    price:       "₹799",
    period:      "per month",
    queries:     "2,500 queries/month",
    color:       "#7F77DD",
    features:    ["2,500 queries per month", "Everything in Scholar", "Early access to new features", "Priority response speed"],
    limitations: [],
  },
];

const professions = [
  "Student", "Working Professional", "Researcher / Academic",
  "Entrepreneur", "Teacher / Educator", "Freelancer", "Other",
];

const purposes = [
  "Academic research and assignments",
  "Professional upskilling",
  "Personal learning and curiosity",
  "Exam preparation",
  "Business and market research",
  "Writing and content creation",
  "Other",
];

const topicOptions = [
  "Business and Management",
  "Economics and Finance",
  "Science and Technology",
  "Philosophy and Psychology",
  "History and Politics",
  "Medicine and Health",
  "Law and Governance",
  "Literature and Arts",
  "Engineering",
  "Self Development",
  "Mathematics",
  "Environment and Sustainability",
];

const educationLevels = [
  "High School",
  "Undergraduate (UG)",
  "Postgraduate (PG)",
  "PhD / Doctorate",
  "Diploma / Certificate",
  "Not a student",
];

export default function IndividualSignup() {
  const router = useRouter();
  const [step, setStep]                 = useState(1);
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "", email: "", mobile: "",
    profession: "", purpose: "", education: "",
    organisation: "", city: "",
  });
  const [otp, setOtp]         = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedPlanData = plans.find(p => p.id === selectedPlan)!;

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : prev.length < 5
        ? [...prev, topic]
        : prev
    );
  };

  const handleSendOtp = () => {
    if (!form.mobile || form.mobile.length !== 10) {
      alert("Please enter a valid 10 digit mobile number");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setOtpSent(true);
      setLoading(false);
      alert("OTP sent! Use 123456 for testing.");
    }, 1000);
  };

  const handleVerifyOtp = () => {
    if (otp !== "123456") { alert("Invalid OTP. Try again."); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (selectedPlan === "free") router.push("/");
      else setStep(5);
    }, 1000);
  };

  const handlePayment = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); router.push("/"); }, 1500);
  };

  const steps = ["Details", "Profile", "Plan", "Verify", "Payment"];

  const inputStyle: any = {
    width: "100%", padding: "11px 14px",
    border: "0.5px solid #e5e4dc", borderRadius: "10px",
    fontSize: "14px", outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box", background: "white",
  };

  const selectStyle: any = { ...inputStyle, cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: "#f9f9f7", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "20px 40px", borderBottom: "0.5px solid #e5e4dc", background: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color: "#2C2C2A", margin: 0 }}>
          First<span style={{ color: "#1D9E75" }}>chapter</span>
        </h1>
        <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>
          Step {step} of {steps.length} — {steps[step - 1]}
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ height: "3px", background: "#e5e4dc" }}>
        <div style={{ height: "3px", background: "#1D9E75", width: `${(step / steps.length) * 100}%`, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: step === 3 ? "900px" : "520px" }}>

          {/* ── STEP 1 — Basic details ──────────────────────── */}
          {step === 1 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#2C2C2A", margin: "0 0 8px" }}>
                  Create your account
                </h2>
                <p style={{ fontSize: "14px", color: "#888780", margin: 0 }}>
                  Join thousands of readers on Firstchapter.ai
                </p>
              </div>

              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "16px", padding: "32px" }}>
                {[
                  { label: "Full name",     key: "name",   placeholder: "Enter your full name",  type: "text"  },
                  { label: "Email address", key: "email",  placeholder: "your@email.com",         type: "email" },
                  { label: "Mobile number", key: "mobile", placeholder: "10 digit mobile number", type: "tel"   },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: "16px" }}>
                    <label style={{ fontSize: "13px", color: "#5F5E5A", display: "block", marginBottom: "6px" }}>{field.label}</label>
                    <input
                      type={field.type} placeholder={field.placeholder}
                      value={(form as any)[field.key]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ))}

                <button
                  onClick={() => setStep(2)}
                  disabled={!form.name || !form.email || !form.mobile}
                  style={{
                    width: "100%",
                    background: form.name && form.email && form.mobile ? "#1D9E75" : "#9FE1CB",
                    color: "white", border: "none", borderRadius: "100px",
                    padding: "13px", fontSize: "14px", fontWeight: "500",
                    cursor: form.name && form.email && form.mobile ? "pointer" : "not-allowed",
                    fontFamily: "'DM Sans', sans-serif", marginTop: "8px",
                  }}
                >
                  Continue →
                </button>

                <p style={{ textAlign: "center", fontSize: "13px", color: "#888780", margin: "20px 0 0" }}>
                  Already have an account?{" "}
                  <span onClick={() => router.push("/sign-in")} style={{ color: "#1D9E75", cursor: "pointer", fontWeight: "500" }}>
                    Sign in
                  </span>
                </p>

                <div style={{ borderTop: "0.5px solid #e5e4dc", marginTop: "20px", paddingTop: "16px", textAlign: "center" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 12px" }}>Are you from an institution?</p>
                  <button onClick={() => router.push("/sign-in")} style={{
                    background: "none", color: "#378ADD", border: "1px solid #378ADD",
                    borderRadius: "100px", padding: "8px 20px", fontSize: "13px",
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  }}>
                    Use college code instead
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 — Profile enrichment ─────────────────── */}
          {step === 2 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#2C2C2A", margin: "0 0 8px" }}>
                  Tell us about yourself
                </h2>
                <p style={{ fontSize: "14px", color: "#888780", margin: 0 }}>
                  This helps us personalise your book recommendations
                </p>
              </div>

              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "16px", padding: "32px" }}>

                {/* Profession */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "13px", color: "#5F5E5A", display: "block", marginBottom: "10px", fontWeight: "500" }}>
                    What do you do? <span style={{ color: "#E24B4A" }}>*</span>
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {professions.map(p => (
                      <button
                        key={p}
                        onClick={() => setForm(f => ({ ...f, profession: p }))}
                        style={{
                          padding: "8px 16px", borderRadius: "100px", fontSize: "13px",
                          border: form.profession === p ? "none" : "0.5px solid #e5e4dc",
                          background: form.profession === p ? "#1D9E75" : "white",
                          color: form.profession === p ? "white" : "#5F5E5A",
                          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                          transition: "all 0.15s",
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Education level — shows only for students */}
                {form.profession === "Student" && (
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "13px", color: "#5F5E5A", display: "block", marginBottom: "10px", fontWeight: "500" }}>
                      Education level
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {educationLevels.map(e => (
                        <button
                          key={e}
                          onClick={() => setForm(f => ({ ...f, education: e }))}
                          style={{
                            padding: "8px 16px", borderRadius: "100px", fontSize: "13px",
                            border: form.education === e ? "none" : "0.5px solid #e5e4dc",
                            background: form.education === e ? "#378ADD" : "white",
                            color: form.education === e ? "white" : "#5F5E5A",
                            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                            transition: "all 0.15s",
                          }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Organisation / College */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "13px", color: "#5F5E5A", display: "block", marginBottom: "6px", fontWeight: "500" }}>
                    {form.profession === "Student" ? "College / University" : "Organisation / Company"}
                  </label>
                  <input
                    type="text"
                    placeholder={form.profession === "Student" ? "e.g. Anna University" : "e.g. Tata Consultancy Services"}
                    value={form.organisation}
                    onChange={e => setForm(f => ({ ...f, organisation: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                {/* City */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "13px", color: "#5F5E5A", display: "block", marginBottom: "6px", fontWeight: "500" }}>
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chennai"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                {/* Purpose */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "13px", color: "#5F5E5A", display: "block", marginBottom: "10px", fontWeight: "500" }}>
                    Why are you joining Firstchapter? <span style={{ color: "#E24B4A" }}>*</span>
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {purposes.map(p => (
                      <button
                        key={p}
                        onClick={() => setForm(f => ({ ...f, purpose: p }))}
                        style={{
                          padding: "10px 16px", borderRadius: "10px", fontSize: "13px",
                          border: form.purpose === p ? "2px solid #1D9E75" : "0.5px solid #e5e4dc",
                          background: form.purpose === p ? "#E1F5EE" : "white",
                          color: form.purpose === p ? "#0F6E56" : "#5F5E5A",
                          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                          textAlign: "left", transition: "all 0.15s",
                          display: "flex", alignItems: "center", gap: "10px",
                        }}
                      >
                        {form.purpose === p && <span style={{ fontWeight: "bold" }}>✓</span>}
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topics of interest */}
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ fontSize: "13px", color: "#5F5E5A", display: "block", marginBottom: "6px", fontWeight: "500" }}>
                    Topics you're interested in
                    <span style={{ fontSize: "12px", color: "#888780", fontWeight: "400", marginLeft: "8px" }}>
                      (select up to 5)
                    </span>
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {topicOptions.map(topic => (
                      <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        style={{
                          padding: "7px 14px", borderRadius: "100px", fontSize: "12px",
                          border: selectedTopics.includes(topic) ? "none" : "0.5px solid #e5e4dc",
                          background: selectedTopics.includes(topic) ? "#7F77DD" : "white",
                          color: selectedTopics.includes(topic) ? "white" : "#5F5E5A",
                          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                          transition: "all 0.15s",
                          opacity: !selectedTopics.includes(topic) && selectedTopics.length >= 5 ? 0.4 : 1,
                        }}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                  {selectedTopics.length > 0 && (
                    <p style={{ fontSize: "12px", color: "#7F77DD", margin: "8px 0 0" }}>
                      {selectedTopics.length}/5 selected
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => setStep(1)} style={{
                    flex: 1, background: "white", color: "#5F5E5A",
                    border: "0.5px solid #e5e4dc", borderRadius: "100px",
                    padding: "12px", fontSize: "14px", cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    ← Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!form.profession || !form.purpose}
                    style={{
                      flex: 2,
                      background: form.profession && form.purpose ? "#1D9E75" : "#9FE1CB",
                      color: "white", border: "none", borderRadius: "100px",
                      padding: "12px", fontSize: "14px", fontWeight: "500",
                      cursor: form.profession && form.purpose ? "pointer" : "not-allowed",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 — Plan selection ─────────────────────── */}
          {step === 3 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#2C2C2A", margin: "0 0 8px" }}>
                  Choose your plan
                </h2>
                <p style={{ fontSize: "14px", color: "#888780", margin: 0 }}>
                  Start free — upgrade anytime. Cancel anytime.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "28px" }}>
                {plans.map(plan => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    style={{
                      background: "white",
                      border: selectedPlan === plan.id ? `2px solid ${plan.color}` : "0.5px solid #e5e4dc",
                      borderRadius: "16px", padding: "24px", cursor: "pointer",
                      position: "relative", transition: "all 0.2s",
                    }}
                  >
                    {plan.popular && (
                      <div style={{
                        position: "absolute", top: "-12px", left: "50%",
                        transform: "translateX(-50%)",
                        background: "#378ADD", color: "white",
                        borderRadius: "100px", padding: "3px 14px",
                        fontSize: "11px", fontWeight: "500", whiteSpace: "nowrap" as const,
                      }}>
                        Most popular
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                      <div>
                        <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 4px" }}>{plan.name}</p>
                        <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>{plan.queries}</p>
                      </div>
                      <div style={{
                        width: "20px", height: "20px", borderRadius: "50%",
                        border: selectedPlan === plan.id ? "none" : "1.5px solid #e5e4dc",
                        background: selectedPlan === plan.id ? plan.color : "white",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        {selectedPlan === plan.id && <span style={{ color: "white", fontSize: "11px", fontWeight: "bold" }}>✓</span>}
                      </div>
                    </div>
                    <div style={{ marginBottom: "16px" }}>
                      <span style={{ fontSize: "26px", fontWeight: "500", color: plan.color, fontFamily: "'DM Serif Display', serif" }}>
                        {plan.price}
                      </span>
                      <span style={{ fontSize: "12px", color: "#888780", marginLeft: "4px" }}>{plan.period}</span>
                    </div>
                    <div style={{ borderTop: "0.5px solid #f0efea", paddingTop: "14px" }}>
                      {plan.features.map((f, i) => (
                        <p key={i} style={{ fontSize: "12px", color: "#5F5E5A", margin: "0 0 6px", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                          <span style={{ color: "#1D9E75", flexShrink: 0 }}>✓</span> {f}
                        </p>
                      ))}
                      {plan.limitations.map((l, i) => (
                        <p key={i} style={{ fontSize: "12px", color: "#B4B2A9", margin: "0 0 6px", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                          <span style={{ flexShrink: 0 }}>✕</span> {l}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                <button onClick={() => setStep(2)} style={{
                  background: "white", color: "#5F5E5A", border: "0.5px solid #e5e4dc",
                  borderRadius: "100px", padding: "12px 28px", fontSize: "14px",
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>
                  ← Back
                </button>
                <button onClick={() => setStep(4)} style={{
                  background: "#1D9E75", color: "white", border: "none",
                  borderRadius: "100px", padding: "12px 32px",
                  fontSize: "14px", fontWeight: "500", cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  Continue with {selectedPlanData.name} →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4 — OTP Verification ──────────────────── */}
          {step === 4 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#2C2C2A", margin: "0 0 8px" }}>
                  Verify your mobile
                </h2>
                <p style={{ fontSize: "14px", color: "#888780", margin: 0 }}>
                  We'll send a one-time password to <strong>{form.mobile}</strong>
                </p>
              </div>

              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "16px", padding: "32px" }}>

                {/* Profile summary */}
                <div style={{ background: "#f9f9f7", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 10px", fontWeight: "500" }}>Your profile summary</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {[
                      form.profession,
                      form.education,
                      form.organisation,
                      form.city,
                      form.purpose,
                      ...selectedTopics,
                    ].filter(Boolean).map((tag, i) => (
                      <span key={i} style={{
                        fontSize: "11px", padding: "3px 10px",
                        background: "white", border: "0.5px solid #e5e4dc",
                        borderRadius: "100px", color: "#5F5E5A",
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {!otpSent ? (
                  <>
                    <div style={{
                      background: "#f9f9f7", borderRadius: "12px", padding: "16px",
                      marginBottom: "20px", display: "flex",
                      justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 2px" }}>Sending OTP to</p>
                        <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>+91 {form.mobile}</p>
                      </div>
                      <button onClick={() => setStep(1)} style={{
                        background: "none", border: "none", color: "#1D9E75",
                        fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}>
                        Change
                      </button>
                    </div>
                    <button onClick={handleSendOtp} disabled={loading} style={{
                      width: "100%", background: "#1D9E75", color: "white",
                      border: "none", borderRadius: "100px", padding: "13px",
                      fontSize: "14px", fontWeight: "500", cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                      {loading ? "Sending..." : "Send OTP →"}
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: "13px", color: "#888780", margin: "0 0 16px", textAlign: "center" }}>
                      Enter the 6 digit OTP sent to +91 {form.mobile}
                    </p>
                    <input
                      type="text" maxLength={6} placeholder="• • • • • •"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                      style={{
                        width: "100%", padding: "14px",
                        border: "0.5px solid #e5e4dc", borderRadius: "10px",
                        fontSize: "24px", outline: "none", textAlign: "center",
                        letterSpacing: "12px", fontFamily: "'DM Sans', sans-serif",
                        boxSizing: "border-box" as const, marginBottom: "16px",
                      }}
                    />
                    <button onClick={handleVerifyOtp} disabled={otp.length !== 6 || loading} style={{
                      width: "100%",
                      background: otp.length === 6 ? "#1D9E75" : "#9FE1CB",
                      color: "white", border: "none", borderRadius: "100px",
                      padding: "13px", fontSize: "14px", fontWeight: "500",
                      cursor: otp.length === 6 ? "pointer" : "not-allowed",
                      fontFamily: "'DM Sans', sans-serif", marginBottom: "12px",
                    }}>
                      {loading ? "Verifying..." : "Verify OTP →"}
                    </button>
                    <p style={{ textAlign: "center", fontSize: "13px", color: "#888780", margin: 0 }}>
                      Didn't receive?{" "}
                      <span onClick={handleSendOtp} style={{ color: "#1D9E75", cursor: "pointer" }}>Resend OTP</span>
                    </p>
                  </>
                )}

                <button onClick={() => setStep(3)} style={{
                  width: "100%", background: "none", border: "none",
                  color: "#888780", fontSize: "13px", cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", marginTop: "16px",
                }}>
                  ← Back to plan selection
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5 — Payment ───────────────────────────── */}
          {step === 5 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#2C2C2A", margin: "0 0 8px" }}>
                  Complete payment
                </h2>
                <p style={{ fontSize: "14px", color: "#888780", margin: 0 }}>
                  You're almost there — one last step
                </p>
              </div>

              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "16px", padding: "32px" }}>
                <div style={{ background: "#f9f9f7", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
                  <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 12px" }}>Order summary</p>
                  {[
                    { label: "Plan",    value: selectedPlanData.name    },
                    { label: "Queries", value: selectedPlanData.queries  },
                    { label: "Billing", value: "Monthly"                 },
                    { label: "Amount",  value: selectedPlanData.price + "/month" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>{item.label}</p>
                      <p style={{ fontSize: "13px", color: "#2C2C2A", fontWeight: "500", margin: 0 }}>{item.value}</p>
                    </div>
                  ))}
                  <div style={{ borderTop: "0.5px solid #e5e4dc", marginTop: "12px", paddingTop: "12px", display: "flex", justifyContent: "space-between" }}>
                    <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Total today</p>
                    <p style={{ fontSize: "16px", fontWeight: "500", color: "#1D9E75", margin: 0 }}>{selectedPlanData.price}</p>
                  </div>
                </div>

                <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 12px" }}>Pay with</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                  {["UPI", "Credit / Debit Card", "Net Banking", "Wallet"].map((method, i) => (
                    <div key={i} style={{
                      border: i === 0 ? "2px solid #1D9E75" : "0.5px solid #e5e4dc",
                      borderRadius: "10px", padding: "12px 16px",
                      cursor: "pointer", background: i === 0 ? "#E1F5EE" : "white",
                      display: "flex", alignItems: "center", gap: "8px",
                    }}>
                      {i === 0 && <span style={{ color: "#1D9E75", fontSize: "11px", fontWeight: "bold" }}>✓</span>}
                      <p style={{ fontSize: "13px", color: i === 0 ? "#0F6E56" : "#5F5E5A", margin: 0, fontWeight: i === 0 ? "500" : "400" }}>
                        {method}
                      </p>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>UPI ID</label>
                  <input type="text" placeholder="yourname@upi" style={inputStyle} />
                </div>

                <div style={{ background: "#E1F5EE", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#0F6E56", margin: 0 }}>
                    🔒 Payments secured by Razorpay. Your card details are never stored on our servers.
                  </p>
                </div>

                <button onClick={handlePayment} disabled={loading} style={{
                  width: "100%", background: "#1D9E75", color: "white",
                  border: "none", borderRadius: "100px", padding: "14px",
                  fontSize: "15px", fontWeight: "500", cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {loading ? "Processing payment..." : `Pay ${selectedPlanData.price} and start reading →`}
                </button>

                <p style={{ textAlign: "center", fontSize: "12px", color: "#888780", margin: "16px 0 0" }}>
                  Cancel anytime. No hidden charges.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}