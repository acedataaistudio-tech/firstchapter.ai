import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { CheckCircle, Clock, Mail } from "lucide-react";

export default function ApplicationPending() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [collegeName, setCollegeName] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    
    // Get college name from Clerk metadata
    const metadata = user?.unsafeMetadata as any;
    if (metadata?.collegeName) {
      setCollegeName(metadata.collegeName);
    }
  }, [isLoaded, user]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f9f9f7",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
      padding: "24px",
    }}>
      <div style={{
        maxWidth: "520px",
        width: "100%",
        background: "white",
        borderRadius: "16px",
        border: "0.5px solid #e5e4dc",
        padding: "48px 32px",
        textAlign: "center",
      }}>
        
        {/* Success Icon */}
        <div style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "#E1F5EE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <CheckCircle size={40} color="#1D9E75" />
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "28px",
          color: "#2C2C2A",
          margin: "0 0 12px",
        }}>
          Application Submitted!
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: "16px",
          color: "#888780",
          margin: "0 0 32px",
          lineHeight: "1.5",
        }}>
          Your application to <strong>{collegeName || "your institution"}</strong> is under review.
        </p>

        {/* Status Card */}
        <div style={{
          background: "#FFF4E5",
          border: "1px solid #F7E7CE",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "32px",
          textAlign: "left",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}>
            <Clock size={20} color="#F39C12" />
            <span style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#F39C12",
            }}>
              Status: Pending Review
            </span>
          </div>
          <p style={{
            fontSize: "14px",
            color: "#666",
            margin: 0,
            lineHeight: "1.6",
          }}>
            Your institution admin will review your application shortly. 
            This usually takes 1-2 business days.
          </p>
        </div>

        {/* What's Next */}
        <div style={{
          textAlign: "left",
          marginBottom: "32px",
        }}>
          <h3 style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#2C2C2A",
            margin: "0 0 16px",
          }}>
            What happens next?
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#E1F5EE",
                color: "#1D9E75",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "600",
                flexShrink: 0,
              }}>1</div>
              <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                Your institution admin reviews your application
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#E1F5EE",
                color: "#1D9E75",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "600",
                flexShrink: 0,
              }}>2</div>
              <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                You'll receive an email notification once approved
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#E1F5EE",
                color: "#1D9E75",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "600",
                flexShrink: 0,
              }}>3</div>
              <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                You can then access the platform and start reading
              </p>
            </div>
          </div>
        </div>

        {/* Email Notification */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "12px",
          background: "#f9f9f7",
          borderRadius: "8px",
          marginBottom: "24px",
        }}>
          <Mail size={16} color="#888780" />
          <span style={{ fontSize: "13px", color: "#888780" }}>
            We'll email you at <strong>{user?.primaryEmailAddress?.emailAddress}</strong>
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={() => window.open('https://mail.google.com', '_blank')}
          style={{
            width: "100%",
            background: "#1D9E75",
            color: "white",
            border: "none",
            borderRadius: "100px",
            padding: "14px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: "12px",
          }}>
          Check your email →
        </button>

        {/* Secondary Action */}
        <button
          onClick={() => router.push('/')}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            color: "#888780",
            fontSize: "13px",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>
          Return to home
        </button>

      </div>
    </div>
  );
}
