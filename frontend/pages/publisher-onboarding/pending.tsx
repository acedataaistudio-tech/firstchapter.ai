import { useUser } from "@clerk/nextjs";

export default function PublisherPending() {
  const { user } = useUser();

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
        padding: "44px 40px",
        maxWidth: "560px",
        width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
      }}>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "26px",
          color: "#2C2C2A",
          margin: "0 0 8px 0",
        }}>
          First<span style={{ color: "#1D9E75" }}>chapter</span>
        </h1>

        <div style={{
          width: "60px",
          height: "60px",
          margin: "24px auto 18px",
          borderRadius: "50%",
          background: "#EEEDFE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "28px",
        }}>
          ⏳
        </div>

        <h2 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "24px",
          color: "#2C2C2A",
          margin: "0 0 12px 0",
        }}>
          Application received
        </h2>

        <p style={{
          fontSize: "15px",
          lineHeight: 1.6,
          color: "#3D3D3A",
          margin: "0 0 24px 0",
        }}>
          Thank you for applying to publish on Firstchapter. Our team is reviewing
          your application and will respond within <strong>2 business days</strong>.
        </p>

        <div style={{
          background: "#f9f9f7",
          border: "1px solid #e5e4dc",
          borderRadius: "10px",
          padding: "18px 20px",
          textAlign: "left",
          fontSize: "13px",
          color: "#3D3D3A",
          marginBottom: "28px",
        }}>
          <div style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#888780",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "10px",
          }}>
            What happens next
          </div>
          <ol style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.8 }}>
            <li>We verify your publisher and payout details</li>
            <li>We may reach out if any clarification is needed</li>
            <li>Once approved, you can sign in and start uploading books</li>
          </ol>
        </div>

        <p style={{
          fontSize: "12px",
          color: "#888780",
          margin: "0 0 28px 0",
        }}>
          We've sent a confirmation email to{" "}
          <strong>
            {user?.primaryEmailAddress?.emailAddress
              || user?.emailAddresses?.[0]?.emailAddress
              || "your registered email"}
          </strong>.
        </p>

        <div style={{
          background: "#f9f9f7",
          border: "1px solid #e5e4dc",
          borderRadius: "10px",
          padding: "14px 16px",
          fontSize: "13px",
          color: "#5F5E5A",
          lineHeight: 1.6,
        }}>
          You can close this window now. Once approved, sign in again to access
          your publisher dashboard.
        </div>

        <p style={{
          fontSize: "12px",
          color: "#888780",
          margin: "20px 0 0 0",
        }}>
          Questions?{" "}
          <a href="mailto:support@firstchapter.ai" style={{ color: "#1D9E75", textDecoration: "none" }}>
            support@firstchapter.ai
          </a>
        </p>
      </div>
    </div>
  );
}
