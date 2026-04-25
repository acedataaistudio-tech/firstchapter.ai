import { useRouter } from "next/router";

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "100vh", background: "#f9f9f7",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", textAlign: "center", padding: "40px",
    }}>
      <div style={{ maxWidth: "480px" }}>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "80px", color: "#e5e4dc",
          margin: "0 0 8px", lineHeight: 1,
        }}>
          404
        </h1>
        <h2 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "28px", color: "#2C2C2A",
          margin: "0 0 12px",
        }}>
          Page not found
        </h2>
        <p style={{ fontSize: "15px", color: "#888780", margin: "0 0 40px", lineHeight: 1.6 }}>
          The page you're looking for doesn't exist or has been moved.
          Let's get you back to exploring books.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "#1D9E75", color: "white", border: "none",
              borderRadius: "100px", padding: "13px 32px",
              fontSize: "14px", fontWeight: "500", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Go home →
          </button>
          <button
            onClick={() => router.back()}
            style={{
              background: "white", color: "#5F5E5A",
              border: "0.5px solid #e5e4dc", borderRadius: "100px",
              padding: "13px 32px", fontSize: "14px", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ← Go back
          </button>
        </div>
        <p style={{ fontSize: "13px", color: "#B4B2A9", marginTop: "40px" }}>
          First<span style={{ color: "#1D9E75" }}>chapter</span>.ai
        </p>
      </div>
    </div>
  );
}