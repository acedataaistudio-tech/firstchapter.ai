import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";
import { TokenDashboard } from "../../components/TokenDashboard";
import { Settings, TrendingUp, LogOut } from "lucide-react";

export default function ReaderDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("usage");

  // Handle tab from URL query parameter
  useEffect(() => {
    if (router.query.tab && typeof router.query.tab === 'string') {
      const validTabs = ['usage', 'settings'];
      if (validTabs.includes(router.query.tab)) {
        setActiveTab(router.query.tab);
      }
    }
  }, [router.query.tab]);

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

  const tabs = ["usage", "settings"];

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
              Reader Dashboard
            </p>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}>
            <div style={{ textAlign: "right" }}>
              <p style={{
                fontSize: "13px",
                fontWeight: "500",
                color: "#2C2C2A",
                margin: 0,
              }}>
                {user.firstName} {user.lastName}
              </p>
              <p style={{
                fontSize: "11px",
                color: "#888780",
                margin: 0,
              }}>
                {user.emailAddresses[0].emailAddress}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: "white",
        borderBottom: "0.5px solid #e5e4dc",
        padding: "0 32px",
        display: "flex",
        gap: "32px",
      }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: "none",
              border: "none",
              padding: "16px 0",
              fontSize: "14px",
              fontWeight: "500",
              color: activeTab === tab ? "#1D9E75" : "#888780",
              borderBottom: activeTab === tab ? "2px solid #1D9E75" : "2px solid transparent",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              textTransform: "capitalize",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {tab === "usage" && <TrendingUp size={16} />}
            {tab === "settings" && <Settings size={16} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "32px" }}>
        {activeTab === "usage" && (
          <div>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "600",
              color: "#2C2C2A",
              marginBottom: "24px",
              fontFamily: "'DM Serif Display', serif",
            }}>
              Your Usage
            </h2>
            
            <TokenDashboard userId={user.id} />
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "600",
              color: "#2C2C2A",
              marginBottom: "24px",
              fontFamily: "'DM Serif Display', serif",
            }}>
              Settings
            </h2>
            
            {/* Account Information */}
            <div style={{
              background: "white",
              border: "0.5px solid #e5e4dc",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "24px",
            }}>
              <h3 style={{
                fontSize: "16px",
                fontWeight: "500",
                color: "#2C2C2A",
                marginBottom: "20px",
              }}>
                Account Information
              </h3>
              
              {/* Name */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  fontSize: "12px",
                  color: "#888780",
                  display: "block",
                  marginBottom: "6px",
                }}>
                  Full Name
                </label>
                <p style={{
                  fontSize: "14px",
                  color: "#2C2C2A",
                  margin: 0,
                  padding: "10px 14px",
                  background: "#f9f9f7",
                  borderRadius: "8px",
                }}>
                  {user.firstName} {user.lastName}
                </p>
              </div>

              {/* Email */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  fontSize: "12px",
                  color: "#888780",
                  display: "block",
                  marginBottom: "6px",
                }}>
                  Email Address
                </label>
                <p style={{
                  fontSize: "14px",
                  color: "#2C2C2A",
                  margin: 0,
                  padding: "10px 14px",
                  background: "#f9f9f7",
                  borderRadius: "8px",
                }}>
                  {user.emailAddresses[0].emailAddress}
                </p>
              </div>

              {/* College Info */}
              {(() => {
                const collegeName = user.unsafeMetadata?.collegeName;
                const hasSubscription = user.unsafeMetadata?.hasSubscription === true;
                
                if (!collegeName) return null;
                
                return (
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{
                      fontSize: "12px",
                      color: "#888780",
                      display: "block",
                      marginBottom: "6px",
                    }}>
                      Institution
                    </label>
                    <p style={{
                      fontSize: "14px",
                      color: "#2C2C2A",
                      margin: 0,
                      padding: "10px 14px",
                      background: "#f9f9f7",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                      {String(collegeName)}
                      {hasSubscription && (
                        <span style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          background: "#E1F5EE",
                          color: "#0F6E56",
                          borderRadius: "100px",
                          fontWeight: "500",
                        }}>
                          ✓ Active
                        </span>
                      )}
                    </p>
                  </div>
                );
              })()}

              {/* Interests */}
              {(() => {
                const subjects = user.unsafeMetadata?.subjects as string[] | undefined;
                if (!subjects || subjects.length === 0) return null;
                
                return (
                  <div>
                    <label style={{
                      fontSize: "12px",
                      color: "#888780",
                      display: "block",
                      marginBottom: "8px",
                    }}>
                      Interests
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {subjects.map((subject: string, i: number) => (
                        <span key={i} style={{
                          fontSize: "12px",
                          padding: "6px 12px",
                          background: "#E1F5EE",
                          color: "#0F6E56",
                          borderRadius: "100px",
                        }}>
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Subscription Actions */}
            <div style={{
              background: "white",
              border: "0.5px solid #e5e4dc",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "24px",
            }}>
              <h3 style={{
                fontSize: "16px",
                fontWeight: "500",
                color: "#2C2C2A",
                marginBottom: "20px",
              }}>
                Subscription
              </h3>

              <button
                onClick={() => router.push("/pricing")}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "#1D9E75",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <TrendingUp size={16} />
                Upgrade Package
              </button>

              <p style={{
                fontSize: "12px",
                color: "#888780",
                margin: 0,
                textAlign: "center",
              }}>
                Get more tokens and advanced features
              </p>
            </div>

            {/* Security */}
            <div style={{
              background: "white",
              border: "0.5px solid #e5e4dc",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "24px",
            }}>
              <h3 style={{
                fontSize: "16px",
                fontWeight: "500",
                color: "#2C2C2A",
                marginBottom: "20px",
              }}>
                Security
              </h3>

              <button
                onClick={() => {
                  // Clerk's user profile modal for password change
                  window.location.href = `/user-profile`;
                }}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "white",
                  color: "#2C2C2A",
                  border: "1px solid #e5e4dc",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  marginBottom: "12px",
                }}
              >
                Change Password
              </button>

              <button
                onClick={() => router.push("/")}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "white",
                  color: "#E24B4A",
                  border: "1px solid #e5e4dc",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <LogOut size={16} />
                Return to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
