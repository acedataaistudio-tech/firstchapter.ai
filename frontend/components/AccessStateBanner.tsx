/**
 * AccessStateBanner — single component handling all "non-active" access states.
 *
 * The reader home page calls /api/users/access-state on load and renders one of:
 *   - Nothing (state = 'active'): banner is invisible, normal home page shown
 *   - <TrialBanner>     (state = 'trial_pending'): yellow banner with usage progress
 *   - <BlockedScreen>   (state = 'blocked' or 'no_access'): hard-block, full-page
 *
 * This component handles its own data loading. Drop it in the page and it
 * does the right thing based on what the backend returns.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Clock, AlertCircle, ArrowRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type AccessState = {
  state: "active" | "trial_pending" | "blocked" | "no_access";
  user_id: string;
  headline: string;
  detail: string;
  tokens_used: number | null;
  tokens_limit: number | null;
  institution_name: string | null;
  rejection_reason: string | null;
  can_apply_elsewhere: boolean;
};

interface AccessStateBannerProps {
  userId: string;
  /** Children rendered only when state === 'active'. Pass the full home content. */
  children: React.ReactNode;
}

/**
 * Wraps the home content. If the user has full access, just renders children.
 * Otherwise, replaces with a banner (trial) or a hard-block screen (blocked).
 */
export function AccessStateBanner({ userId, children }: AccessStateBannerProps) {
  const [accessState, setAccessState] = useState<AccessState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/access-state?user_id=${encodeURIComponent(userId)}`);
        if (!res.ok) {
          // On error, fail open — user sees normal home; backend middleware enforces.
          if (!cancelled) setAccessState({ state: "active" } as AccessState);
          return;
        }
        const data = await res.json();
        if (!cancelled) setAccessState(data);
      } catch {
        if (!cancelled) setAccessState({ state: "active" } as AccessState);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    // Minimal loader — prevents flash of normal home before block kicks in
    return (
      <div style={{ minHeight: "100vh", background: "#f9f9f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "14px", color: "#888780" }}>Loading...</p>
      </div>
    );
  }

  if (!accessState || accessState.state === "active") {
    return <>{children}</>;
  }

  if (accessState.state === "trial_pending") {
    return (
      <>
        <TrialBanner accessState={accessState} />
        {children}
      </>
    );
  }

  // blocked or no_access
  return <BlockedScreen accessState={accessState} />;
}

// ──────────────────────────────────────────────────────────────────
// TrialBanner — yellow warning bar at top of home page
// ──────────────────────────────────────────────────────────────────
function TrialBanner({ accessState }: { accessState: AccessState }) {
  const used = accessState.tokens_used || 0;
  const limit = accessState.tokens_limit || 50000;
  const pctUsed = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div style={{
      background: "#FFF8E7",
      borderBottom: "1px solid #FFE4A3",
      padding: "12px 32px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <Clock size={18} style={{ color: "#B8860B", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#8B5A00", marginBottom: "2px" }}>
          Trial access — application pending
          {accessState.institution_name ? ` at ${accessState.institution_name}` : ""}
        </div>
        <div style={{ fontSize: "12px", color: "#8B5A00", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>{used.toLocaleString()} of {limit.toLocaleString()} tokens used</span>
          <span style={{
            display: "inline-block",
            width: "120px",
            height: "4px",
            background: "rgba(184, 134, 11, 0.2)",
            borderRadius: "2px",
            overflow: "hidden",
          }}>
            <span style={{
              display: "block",
              height: "100%",
              width: `${pctUsed}%`,
              background: "#B8860B",
              transition: "width 0.3s",
            }} />
          </span>
          <span style={{ fontWeight: 600 }}>{pctUsed}%</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// BlockedScreen — full-page hard-block
// ──────────────────────────────────────────────────────────────────
function BlockedScreen({ accessState }: { accessState: AccessState }) {
  const router = useRouter();

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
        padding: "40px 36px",
        maxWidth: "520px",
        width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
      }}>
        <div style={{
          width: "56px",
          height: "56px",
          margin: "0 auto 20px",
          borderRadius: "50%",
          background: "#FDEDEC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <AlertCircle size={28} style={{ color: "#C0392B" }} />
        </div>

        <h1 style={{
          margin: "0 0 12px 0",
          fontFamily: "'DM Serif Display', serif",
          fontSize: "26px",
          color: "#2C2C2A",
        }}>
          {accessState.headline}
        </h1>

        <p style={{
          margin: "0 0 8px 0",
          fontSize: "15px",
          lineHeight: 1.6,
          color: "#3D3D3A",
        }}>
          {accessState.detail}
        </p>

        {accessState.rejection_reason && (
          <div style={{
            background: "#f9f9f7",
            border: "1px solid #e5e4dc",
            borderLeft: "3px solid #C0392B",
            borderRadius: "8px",
            padding: "12px 14px",
            margin: "20px 0",
            textAlign: "left",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#888780", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Reason
            </div>
            <div style={{ fontSize: "14px", color: "#3D3D3A" }}>
              {accessState.rejection_reason}
            </div>
          </div>
        )}

        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {accessState.can_apply_elsewhere && (
            <button
              onClick={() => router.push("/reader-onboarding")}
              style={{
                padding: "12px 24px",
                background: "#1D9E75",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              Apply to a different institution <ArrowRight size={14} />
            </button>
          )}
          <button
            onClick={() => router.push("/pricing")}
            style={{
              padding: "12px 24px",
              background: "white",
              color: "#3D3D3A",
              border: "1px solid #e5e4dc",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            View individual plans
          </button>
        </div>

        <p style={{
          margin: "20px 0 0 0",
          fontSize: "12px",
          color: "#888780",
        }}>
          Need help? Email <a href="mailto:support@firstchapter.ai" style={{ color: "#1D9E75", textDecoration: "none" }}>support@firstchapter.ai</a>
        </p>
      </div>
    </div>
  );
}
