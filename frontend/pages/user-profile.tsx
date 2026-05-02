import { UserProfile } from "@clerk/nextjs";
import { useRouter } from "next/router";
import { useUser } from "@clerk/nextjs";

export default function UserProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#f9f9f7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: "3px solid #e5e4dc",
            borderTop: "3px solid #1D9E75",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }} />
          <p style={{ fontSize: "14px", color: "#888780" }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    router.push("/sign-in");
    return null;
  }

  // Determine user type for back navigation
  const userRole = (user.unsafeMetadata?.role as string) || 
                   (user.publicMetadata?.role as string) || 
                   'reader';
  
  const getBackPath = () => {
    switch(userRole) {
      case 'institution': return '/institution';
      case 'publisher': return '/publisher';
      default: return '/reader';
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f9f9f7",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: "white",
        borderBottom: "0.5px solid #e5e4dc",
        padding: "16px 32px",
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ cursor: "pointer" }} onClick={() => router.push("/")}>
            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "24px",
              color: "#2C2C2A",
              margin: 0,
            }}>
              First<span style={{ color: "#1D9E75" }}>chapter</span>
            </h1>
            <p style={{
              fontSize: "12px",
              color: "#888780",
              margin: "4px 0 0",
            }}>
              Account Settings
            </p>
          </div>

          <button
            onClick={() => router.push(getBackPath())}
            style={{
              padding: "8px 16px",
              background: "white",
              border: "1px solid #e5e4dc",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#2C2C2A",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* User Profile Component */}
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "32px 24px",
      }}>
        <div style={{
          background: "white",
          borderRadius: "16px",
          border: "0.5px solid #e5e4dc",
          overflow: "hidden",
        }}>
          <UserProfile 
            appearance={{
              elements: {
                rootBox: {
                  width: "100%",
                },
                card: {
                  border: "none",
                  boxShadow: "none",
                },
              },
            }}
          />
        </div>

        {/* Help Text */}
        <div style={{
          marginTop: "24px",
          padding: "16px",
          background: "#E1F5EE",
          borderRadius: "12px",
          border: "1px solid #B8E6D5",
        }}>
          <p style={{
            fontSize: "13px",
            color: "#0F6E56",
            margin: 0,
          }}>
            💡 <strong>Tip:</strong> You can manage your password, email, and security settings here. 
            Changes are saved automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
