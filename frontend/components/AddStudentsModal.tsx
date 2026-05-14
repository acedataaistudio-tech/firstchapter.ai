/**
 * AddStudentsModal — opens from StudentManagement's "Add students" button.
 *
 * Two tabs:
 *   - Single: name + admission number + email + validity years
 *   - Bulk: paste CSV (name,admission_number,email) + global validity years
 *
 * On submit: calls POST /institution/students/invite with the institution_id.
 * Shows result summary (created / skipped / failed).
 */

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Props = {
  institutionId: string;
  adminUserId: string;     // Clerk user_id of the calling admin
  onClose: () => void;
  onComplete?: () => void; // called after successful invite send (to refresh student list)
};

type InviteRow = { name: string; admission_number: string; email: string };

type ResultSummary = {
  created: number;
  skipped: number;
  failed: number;
  total: number;
};

type ResultDetails = {
  created: { email: string; name: string }[];
  skipped: { email: string; reason: string }[];
  failed: { email: string; reason: string }[];
};

export function AddStudentsModal({ institutionId, adminUserId, onClose, onComplete }: Props) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [validity, setValidity] = useState<number>(1);

  // Single
  const [single, setSingle] = useState<InviteRow>({ name: "", admission_number: "", email: "" });

  // Bulk
  const [csvText, setCsvText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ summary: ResultSummary; details: ResultDetails } | null>(null);

  const parseCsv = (text: string): InviteRow[] => {
    const rows: InviteRow[] = [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    for (const line of lines) {
      const parts = line.split(",").map(p => p.trim());
      if (parts.length < 3) continue;
      // Skip header row if it looks like one
      if (/^name$/i.test(parts[0]) && /admission/i.test(parts[1]) && /email/i.test(parts[2])) continue;
      const [name, admission_number, email] = parts;
      if (!name || !admission_number || !email) continue;
      rows.push({ name, admission_number, email });
    }
    return rows;
  };

  const handleSubmit = async () => {
    setError("");
    setResult(null);

    let students: InviteRow[] = [];

    if (mode === "single") {
      if (!single.name.trim() || !single.admission_number.trim() || !single.email.trim()) {
        setError("Please fill all three fields.");
        return;
      }
      students = [single];
    } else {
      students = parseCsv(csvText);
      if (students.length === 0) {
        setError("Couldn't find any valid rows. Use format: name,admission_number,email (one student per line).");
        return;
      }
      if (students.length > 500) {
        setError(`Found ${students.length} rows. Maximum 500 per batch — please split into multiple uploads.`);
        return;
      }
    }

    if (validity < 1 || validity > 10) {
      setError("Validity period must be between 1 and 10 years.");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch(`${API_URL}/api/institution/students/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": adminUserId },
        body: JSON.stringify({
          institution_id: institutionId,
          validity_period_years: validity,
          students,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(typeof data.detail === "string" ? data.detail : "Could not send invites.");
        setSubmitting(false);
        return;
      }
      setResult(data);
      if (onComplete) onComplete();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Result screen ──────────────────────────────────────────
  if (result) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h3 style={titleStyle}>Invites processed</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
            <StatCard label="Sent" value={result.summary.created} color="#1D9E75" />
            <StatCard label="Skipped" value={result.summary.skipped} color="#EF9F27" />
            <StatCard label="Failed" value={result.summary.failed} color="#A32D2D" />
          </div>

          {result.summary.skipped > 0 && (
            <DetailBlock title="Skipped" rows={result.details.skipped} />
          )}
          {result.summary.failed > 0 && (
            <DetailBlock title="Failed" rows={result.details.failed} />
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button onClick={() => { setResult(null); setSingle({ name: "", admission_number: "", email: "" }); setCsvText(""); }} style={{ ...secondaryButton, flex: 1 }}>
              Invite more
            </button>
            <button onClick={onClose} style={{ ...primaryButton, flex: 1 }}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form screen ───────────────────────────────────────────
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
          <h3 style={titleStyle}>Add students</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", color: "#888780", cursor: "pointer" }}>×</button>
        </div>
        <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 18px" }}>
          Students will get an email with a sign-up link. They become active once they complete signup.
        </p>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: "6px", padding: "4px", background: "#f9f9f7", borderRadius: "100px", marginBottom: "20px" }}>
          {[{ k: "single", l: "One student" }, { k: "bulk", l: "Bulk (CSV)" }].map(opt => (
            <button
              key={opt.k}
              onClick={() => setMode(opt.k as any)}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "100px",
                border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500,
                background: mode === opt.k ? "white" : "transparent",
                color: mode === opt.k ? "#2C2C2A" : "#888780",
                boxShadow: mode === opt.k ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {opt.l}
            </button>
          ))}
        </div>

        {mode === "single" ? (
          <>
            <Field label="Student name" placeholder="Full name" value={single.name}
              onChange={v => setSingle(s => ({ ...s, name: v }))} />
            <Field label="Admission / Roll number" placeholder="e.g. CSE2024-0142" value={single.admission_number}
              onChange={v => setSingle(s => ({ ...s, admission_number: v }))} />
            <Field label="Email" placeholder="student@example.com" value={single.email}
              onChange={v => setSingle(s => ({ ...s, email: v }))} />
          </>
        ) : (
          <>
            <label style={labelStyle}>CSV — one student per line</label>
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={`name,admission_number,email\nJohn Doe,CSE2024-0142,john@example.com\nJane Smith,CSE2024-0143,jane@example.com`}
              rows={8}
              style={{ ...inputStyle, resize: "vertical" as const, fontFamily: "monospace", fontSize: "12px" }}
            />
            <p style={{ fontSize: "11px", color: "#888780", margin: "6px 0 16px" }}>
              Format: <code style={{ background: "#f9f9f7", padding: "2px 6px", borderRadius: "4px" }}>name,admission_number,email</code> per line.
              Header row optional. Max 500 students per batch.
            </p>
          </>
        )}

        <Field
          label="Validity period (years)"
          type="number"
          value={String(validity)}
          onChange={v => setValidity(Math.max(1, Math.min(10, parseInt(v) || 1)))}
          placeholder="1-10"
        />

        {error && (
          <div style={{
            background: "#FDEDEC", border: "1px solid #F5B7B1",
            borderRadius: "8px", padding: "10px 14px", margin: "12px 0",
            fontSize: "12px", color: "#922B21",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onClose} disabled={submitting} style={{ ...secondaryButton, flex: 1 }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              ...primaryButton, flex: 2,
              background: submitting ? "#9FE1CB" : "#1D9E75",
              cursor: submitting ? "default" : "pointer",
            }}
          >
            {submitting ? "Sending invites..." : (mode === "single" ? "Send invite" : "Send invites")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: "white", border: "0.5px solid #e5e4dc",
      borderRadius: "10px", padding: "14px", textAlign: "center" as const,
    }}>
      <p style={{ fontSize: "26px", fontFamily: "'DM Serif Display', serif", color, margin: 0 }}>{value}</p>
      <p style={{ fontSize: "11px", color: "#888780", margin: "4px 0 0", textTransform: "uppercase" as const, letterSpacing: "0.4px" }}>{label}</p>
    </div>
  );
}

function DetailBlock({ title, rows }: { title: string; rows: { email: string; reason: string }[] }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <p style={{ fontSize: "12px", fontWeight: 500, color: "#5F5E5A", margin: "0 0 8px" }}>{title}</p>
      <div style={{ background: "#f9f9f7", borderRadius: "8px", padding: "10px 14px", fontSize: "11px", color: "#5F5E5A" }}>
        {rows.slice(0, 10).map((r, i) => (
          <div key={i} style={{ marginBottom: i < rows.length - 1 ? "4px" : 0 }}>
            <strong>{r.email}</strong> — {r.reason}
          </div>
        ))}
        {rows.length > 10 && <div style={{ fontStyle: "italic", marginTop: "4px" }}>...and {rows.length - 10} more</div>}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "16px", zIndex: 1000,
};
const modalStyle: React.CSSProperties = {
  background: "white", borderRadius: "16px", padding: "28px",
  maxWidth: "560px", width: "100%", maxHeight: "90vh", overflowY: "auto" as const,
  fontFamily: "'DM Sans', sans-serif",
};
const titleStyle: React.CSSProperties = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: "22px", color: "#2C2C2A", margin: "0 0 6px",
};
const labelStyle: React.CSSProperties = {
  fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px",
  border: "0.5px solid #e5e4dc", borderRadius: "10px",
  fontSize: "14px", outline: "none",
  fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" as const,
};
const primaryButton: React.CSSProperties = {
  background: "#1D9E75", color: "white", border: "none",
  borderRadius: "100px", padding: "12px", fontSize: "13px", fontWeight: 500,
  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};
const secondaryButton: React.CSSProperties = {
  background: "white", color: "#5F5E5A",
  border: "0.5px solid #e5e4dc", borderRadius: "100px",
  padding: "12px", fontSize: "13px", cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};
