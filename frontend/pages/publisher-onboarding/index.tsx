import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";

const publisherTypes = [
  {
    id:          "author-publisher",
    title:       "Author-Publisher",
    description: "I wrote the book and I own all rights",
    icon:        "✍️",
    color:       "#1D9E75",
    bg:          "#E1F5EE",
  },
  {
    id:          "independent",
    title:       "Independent Publisher",
    description: "I publish books on behalf of multiple authors",
    icon:        "📚",
    color:       "#378ADD",
    bg:          "#E6F1FB",
  },
  {
    id:          "traditional",
    title:       "Traditional Publisher",
    description: "I represent a publishing house with legal team",
    icon:        "🏢",
    color:       "#7F77DD",
    bg:          "#EEEDFE",
  },
  {
    id:          "academic",
    title:       "Academic / Institution",
    description: "I publish research, journals or academic content",
    icon:        "🎓",
    color:       "#EF9F27",
    bg:          "#FAEEDA",
  },
];

const agreementClauses = [
  { title: "1. Grant of Rights",    body: "Publisher grants Firstchapter.ai exclusive worldwide rights to convert, embed and make queryable the Work using AI technology for a period of 5 years from the date of upload." },
  { title: "2. Retained Rights",    body: "Publisher retains all print, audio, translation, film and all other rights not specifically granted herein. This agreement covers AI querying rights only." },
  { title: "3. Revenue Share",      body: "Platform shall pay Publisher ₹0.50 per query generated on the Work, paid monthly on the 1st of each month. Minimum payout threshold: ₹500." },
  { title: "4. Content Protection", body: "Platform shall not reproduce, distribute or expose raw content. All interactions are query-response only with full attribution to the Work and Author." },
  { title: "5. Exclusivity",        body: "Publisher shall not grant AI querying rights to any competing platform during the term of this agreement." },
  { title: "6. Termination",        body: "Either party may terminate with 90 days written notice. Early termination by Publisher incurs a processing fee of ₹2,000 per book." },
  { title: "7. Governing Law",      body: "This agreement is governed by Indian law. Disputes resolved in Chennai jurisdiction." },
];

export default function PublisherOnboarding() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [publisherType, setPublisherType] = useState("");
  const [profile, setProfile] = useState({
    name:        "",
    bio:         "",
    website:     "",
    phone:       "",
    city:        "",
    language:    "English",
  });
  const [payout, setPayout] = useState({
    accountName: "",
    bankName:    "",
    accountNo:   "",
    ifsc:        "",
    upi:         "",
    pan:         "",
  });
  const [uploadForm, setUploadForm] = useState({
    title:       "",
    author:      "",
    category:    "Business",
    isbn:        "",
    file:        null as File | null,
  });
  const [skipUpload, setSkipUpload] = useState(false);

  if (!isLoaded) return null;

  const categories = [
    "Business", "Economics", "Philosophy", "Science",
    "Technology", "History", "Medicine", "Law",
    "Management", "Self Development",
  ];

  const steps = [
    "Account type",
    "Your profile",
    "Payout details",
    "AI Rights",
    "First book",
  ];

  const handleComplete = async () => {
    setLoading(true);
    try {
      await user?.update({
  unsafeMetadata: {
    role:          "publisher",
    publisherType,
    onboarded:     true,
    payoutSetup:   true,
    agreementDate: new Date().toISOString(),
  }
});
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    router.push("/publisher");
  };

  const inputStyle: any = {
    width: "100%", padding: "11px 14px",
    border: "0.5px solid #e5e4dc", borderRadius: "10px",
    fontSize: "14px", outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box", background: "white",
  };

  const selectStyle: any = { ...inputStyle, cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: "#f9f9f7", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "20px 40px", background: "white", borderBottom: "0.5px solid #e5e4dc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color: "#2C2C2A", margin: 0 }}>
          First<span style={{ color: "#1D9E75" }}>chapter</span>
          <span style={{ fontSize: "11px", color: "#7F77DD", marginLeft: "8px", fontFamily: "'DM Sans', sans-serif", fontWeight: "500" }}>Publisher Onboarding</span>
        </h1>
        <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>
          Step {step} of {steps.length} — {steps[step - 1]}
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ height: "3px", background: "#e5e4dc" }}>
        <div style={{ height: "3px", background: "#7F77DD", width: `${(step / steps.length) * 100}%`, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 20px", gap: "40px" }}>

        {/* Step indicator sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "180px", flexShrink: 0, paddingTop: "8px" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "24px", height: "24px", borderRadius: "50%",
                background: i + 1 < step ? "#7F77DD" : i + 1 === step ? "#7F77DD" : "#e5e4dc",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", color: i + 1 <= step ? "white" : "#888780",
                fontWeight: "500", flexShrink: 0,
              }}>
                {i + 1 < step ? "✓" : i + 1}
              </div>
              <p style={{
                fontSize: "12px", margin: 0,
                color: i + 1 === step ? "#534AB7" : i + 1 < step ? "#1D9E75" : "#888780",
                fontWeight: i + 1 === step ? "500" : "400",
              }}>
                {s}
              </p>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ width: "100%", maxWidth: "540px" }}>

          {/* STEP 1 — Publisher type */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#2C2C2A", margin: "0 0 8px" }}>
                What kind of publisher are you?
              </h2>
              <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 32px" }}>
                This helps us set up the right agreement and payout structure for you.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
                {publisherTypes.map(type => (
                  <div
                    key={type.id}
                    onClick={() => setPublisherType(type.id)}
                    style={{
                      background: "white",
                      border: publisherType === type.id ? `2px solid ${type.color}` : "0.5px solid #e5e4dc",
                      borderRadius: "14px", padding: "20px",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: "16px",
                      transition: "all 0.2s",
                      boxShadow: publisherType === type.id ? `0 0 0 4px ${type.bg}` : "none",
                    }}
                  >
                    <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: type.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>
                      {type.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "15px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 3px" }}>{type.title}</p>
                      <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>{type.description}</p>
                    </div>
                    <div style={{
                      width: "20px", height: "20px", borderRadius: "50%",
                      border: publisherType === type.id ? "none" : "1.5px solid #e5e4dc",
                      background: publisherType === type.id ? type.color : "white",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {publisherType === type.id && <span style={{ color: "white", fontSize: "11px", fontWeight: "bold" }}>✓</span>}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!publisherType}
                style={{
                  width: "100%", background: publisherType ? "#7F77DD" : "#C8C5F0",
                  color: "white", border: "none", borderRadius: "100px",
                  padding: "14px", fontSize: "15px", fontWeight: "500",
                  cursor: publisherType ? "pointer" : "not-allowed",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2 — Profile */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#2C2C2A", margin: "0 0 8px" }}>
                Tell us about yourself
              </h2>
              <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 32px" }}>
                This appears on your publisher profile visible to readers and institutions.
              </p>

              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "16px", padding: "28px" }}>
                <div style={{ background: "#E1F5EE", borderRadius: "10px", padding: "10px 14px", marginBottom: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#0F6E56", margin: 0 }}>
                    ✓ Pre-filled from your account. Update as needed.
                  </p>
                </div>

                {[
                  { label: "Full name / Publisher name", key: "name",    placeholder: "Your name or publishing house", prefill: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "" },
                  { label: "Website",                    key: "website", placeholder: "https://yourwebsite.com",       prefill: "" },
                  { label: "Phone number",               key: "phone",   placeholder: "10 digit mobile number",       prefill: "" },
                  { label: "City",                       key: "city",    placeholder: "e.g. Chennai",                 prefill: "" },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: "16px" }}>
                    <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>{field.label}</label>
                    <input
                      type="text" placeholder={field.placeholder}
                      defaultValue={field.prefill}
                      onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ))}

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Primary language of your books</label>
                  <select value={profile.language} onChange={e => setProfile(p => ({ ...p, language: e.target.value }))} style={selectStyle}>
                    {["English", "Tamil", "Hindi", "Telugu", "Kannada", "Malayalam", "Bengali", "Marathi", "Other"].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Bio <span style={{ color: "#B4B2A9" }}>(optional)</span></label>
                  <textarea
                    placeholder="Brief description about you or your publishing house..."
                    onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    style={{ ...inputStyle, resize: "none" as const }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, background: "white", color: "#5F5E5A", border: "0.5px solid #e5e4dc", borderRadius: "100px", padding: "13px", fontSize: "14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  ← Back
                </button>
                <button onClick={() => setStep(3)} style={{ flex: 2, background: "#7F77DD", color: "white", border: "none", borderRadius: "100px", padding: "13px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Payout details */}
          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#2C2C2A", margin: "0 0 8px" }}>
                Set up your payouts
              </h2>
              <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 32px" }}>
                You earn ₹0.50 per query. We pay on the 1st of every month.
              </p>

              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "16px", padding: "28px" }}>
                <div style={{ background: "#EEEDFE", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#534AB7", margin: 0 }}>
                    💜 Payouts processed on the 1st of every month. Minimum ₹500.
                    TDS deducted as per Indian tax law. PAN is mandatory for payouts above ₹50,000/year.
                  </p>
                </div>

                {[
                  { label: "Account holder name", key: "accountName", placeholder: "Exactly as per bank records"   },
                  { label: "Bank name",            key: "bankName",    placeholder: "e.g. State Bank of India"     },
                  { label: "Account number",       key: "accountNo",   placeholder: "Enter account number"         },
                  { label: "IFSC code",            key: "ifsc",        placeholder: "e.g. SBIN0001234"             },
                  { label: "UPI ID (optional)",    key: "upi",         placeholder: "yourname@upi"                 },
                  { label: "PAN number",           key: "pan",         placeholder: "e.g. ABCDE1234F"              },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: "16px" }}>
                    <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>{field.label}</label>
                    <input
                      type="text" placeholder={field.placeholder}
                      onChange={e => setPayout(p => ({ ...p, [field.key]: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                <button onClick={() => setStep(2)} style={{ flex: 1, background: "white", color: "#5F5E5A", border: "0.5px solid #e5e4dc", borderRadius: "100px", padding: "13px", fontSize: "14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  ← Back
                </button>
                <button onClick={() => setStep(4)} style={{ flex: 2, background: "#7F77DD", color: "white", border: "none", borderRadius: "100px", padding: "13px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  Continue →
                </button>
              </div>

              <button onClick={() => setStep(4)} style={{ width: "100%", background: "none", border: "none", color: "#888780", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: "12px" }}>
                Skip for now — set up payouts later
              </button>
            </div>
          )}

          {/* STEP 4 — AI Rights Agreement */}
          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#2C2C2A", margin: "0 0 8px" }}>
                AI Publishing Rights Agreement
              </h2>
              <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 24px" }}>
                Please read and accept our AI Publishing Rights Agreement before uploading books.
              </p>

              {/* Agreement document */}
              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "16px", padding: "24px", maxHeight: "360px", overflowY: "auto", marginBottom: "20px" }}>
                <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px", textAlign: "center" as const }}>
                  FIRSTCHAPTER.AI — AI PUBLISHING RIGHTS AGREEMENT
                </p>
                {agreementClauses.map((clause, i) => (
                  <div key={i} style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 4px" }}>{clause.title}</p>
                    <p style={{ fontSize: "12px", color: "#5F5E5A", margin: 0, lineHeight: 1.6 }}>{clause.body}</p>
                  </div>
                ))}

                <div style={{ borderTop: "0.5px solid #e5e4dc", paddingTop: "16px", marginTop: "8px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>
                    By accepting this agreement, you confirm that you hold or have obtained the necessary rights to grant Firstchapter.ai the AI publishing rights described above for any content you upload to the platform.
                  </p>
                </div>
              </div>

              {/* Key terms summary */}
              <div style={{ background: "#f9f9f7", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
                <p style={{ fontSize: "12px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 10px" }}>Key terms at a glance:</p>
                {[
                  { label: "Duration",       value: "5 years per book from upload date"      },
                  { label: "Revenue",        value: "₹0.50 per query (50% revenue share)"    },
                  { label: "Your rights",    value: "Print, audio, translation — fully yours" },
                  { label: "Early exit",     value: "90 days notice + ₹2,000 per book fee"  },
                  { label: "Exclusivity",    value: "AI querying rights only"                 },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>{item.label}</p>
                    <p style={{ fontSize: "12px", color: "#2C2C2A", fontWeight: "500", margin: 0 }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Acceptance checkbox */}
              <div style={{ background: "#EEEDFE", borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={agreementAccepted}
                    onChange={e => setAgreementAccepted(e.target.checked)}
                    style={{ marginTop: "2px", flexShrink: 0, width: "16px", height: "16px" }}
                  />
                  <p style={{ fontSize: "13px", color: "#534AB7", margin: 0, lineHeight: 1.5 }}>
                    I have read and agree to the Firstchapter.ai AI Publishing Rights Agreement. I confirm I hold or have obtained the necessary rights for all content I will upload.
                  </p>
                </label>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => setStep(3)} style={{ flex: 1, background: "white", color: "#5F5E5A", border: "0.5px solid #e5e4dc", borderRadius: "100px", padding: "13px", fontSize: "14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  ← Back
                </button>
                <button
                  onClick={() => setStep(5)}
                  disabled={!agreementAccepted}
                  style={{ flex: 2, background: agreementAccepted ? "#7F77DD" : "#C8C5F0", color: "white", border: "none", borderRadius: "100px", padding: "13px", fontSize: "14px", fontWeight: "500", cursor: agreementAccepted ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif" }}
                >
                  I accept — Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 — First book upload */}
          {step === 5 && (
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#2C2C2A", margin: "0 0 8px" }}>
                Upload your first book
              </h2>
              <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 24px" }}>
                Get your first book live immediately. You can upload more from your dashboard anytime.
              </p>

              {!skipUpload ? (
                <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "16px", padding: "28px", marginBottom: "20px" }}>
                  {[
                    { label: "Book title",  key: "title",  placeholder: "Enter full book title"   },
                    { label: "Author name", key: "author", placeholder: "Author full name"         },
                    { label: "ISBN",        key: "isbn",   placeholder: "ISBN number (optional)"  },
                  ].map(field => (
                    <div key={field.key} style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>{field.label}</label>
                      <input
                        type="text" placeholder={field.placeholder}
                        value={(uploadForm as any)[field.key]}
                        onChange={e => setUploadForm(f => ({ ...f, [field.key]: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                  ))}

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Category</label>
                    <select value={uploadForm.category} onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))} style={selectStyle}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>PDF file</label>
                    <div
                      onClick={() => document.getElementById("firstBookFile")?.click()}
                      style={{ border: "1.5px dashed #e5e4dc", borderRadius: "10px", padding: "28px", textAlign: "center" as const, cursor: "pointer", background: uploadForm.file ? "#E1F5EE" : "#f9f9f7" }}
                    >
                      <input id="firstBookFile" type="file" accept=".pdf,.epub" style={{ display: "none" }}
                        onChange={e => setUploadForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
                      {uploadForm.file
                        ? <p style={{ fontSize: "13px", color: "#1D9E75", margin: 0 }}>✓ {uploadForm.file.name}</p>
                        : <>
                            <p style={{ fontSize: "13px", color: "#888780", margin: "0 0 4px" }}>Click to select PDF or EPUB</p>
                            <p style={{ fontSize: "11px", color: "#B4B2A9", margin: 0 }}>Maximum 50MB</p>
                          </>
                      }
                    </div>
                  </div>

                  <div style={{ background: "#E1F5EE", borderRadius: "10px", padding: "12px 16px", marginTop: "16px" }}>
                    <p style={{ fontSize: "12px", color: "#0F6E56", margin: 0 }}>
                      💰 Once uploaded — your book passes content moderation and goes live automatically.
                      You start earning ₹0.50 per query immediately.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "16px", padding: "40px", textAlign: "center" as const, marginBottom: "20px" }}>
                  <p style={{ fontSize: "40px", margin: "0 0 12px" }}>📚</p>
                  <p style={{ fontSize: "15px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 8px" }}>You can upload books anytime</p>
                  <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>
                    Your dashboard has a full book management system. Upload, track analytics and manage rights from there.
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => setStep(4)} style={{ flex: 1, background: "white", color: "#5F5E5A", border: "0.5px solid #e5e4dc", borderRadius: "100px", padding: "13px", fontSize: "14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  ← Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  style={{ flex: 2, background: "#7F77DD", color: "white", border: "none", borderRadius: "100px", padding: "13px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {loading ? "Setting up your account..." : "Go to my dashboard →"}
                </button>
              </div>

              <button
                onClick={() => setSkipUpload(!skipUpload)}
                style={{ width: "100%", background: "none", border: "none", color: "#888780", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: "12px" }}
              >
                {skipUpload ? "I want to upload a book now" : "Skip — I'll upload books from my dashboard"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}