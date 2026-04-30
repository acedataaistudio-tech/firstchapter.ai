import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";
import { TokenDashboard } from "../../components/TokenDashboard";

export default function ReaderDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("discover");

  if (!isLoaded) return null;
  if (!user) {
    router.push('/sign-in');
    return null;
  }

  const tabs = [
    { id: "discover", label: "Discover", icon: "🔍" },
    { id: "my-books", label: "My Books", icon: "📚" },
    { id: "usage", label: "Usage", icon: "📊" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

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
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "24px",
          color: "#2C2C2A",
          margin: 0,
        }}>
          First<span style={{ color: "#1D9E75" }}>chapter</span>
        </h1>
        
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "14px", color: "#888780" }}>
            {user.firstName || user.emailAddresses[0].emailAddress}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        background: "white",
        borderBottom: "0.5px solid #e5e4dc",
        padding: "0 32px",
      }}>
        <div style={{
          display: "flex",
          gap: "32px",
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none",
                border: "none",
                padding: "16px 0",
                fontSize: "14px",
                color: activeTab === tab.id ? "#1D9E75" : "#888780",
                fontWeight: activeTab === tab.id ? "500" : "400",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                borderBottom: activeTab === tab.id ? "2px solid #1D9E75" : "2px solid transparent",
                transition: "all 0.2s",
              }}
            >
              <span style={{ marginRight: "8px" }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "32px 24px",
      }}>
        {activeTab === "discover" && (
          <div>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "600",
              color: "#2C2C2A",
              marginBottom: "24px",
            }}>
              Discover Books
            </h2>
            <p style={{ fontSize: "14px", color: "#888780" }}>
              Browse and search thousands of books...
            </p>
            {/* TODO: Add book discovery interface */}
          </div>
        )}

        {activeTab === "my-books" && (
          <div>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "600",
              color: "#2C2C2A",
              marginBottom: "24px",
            }}>
              My Library
            </h2>
            <p style={{ fontSize: "14px", color: "#888780" }}>
              Your saved books and recent queries...
            </p>
            {/* TODO: Add user's book library */}
          </div>
        )}

        {activeTab === "usage" && (
          <div>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "600",
              color: "#2C2C2A",
              marginBottom: "24px",
            }}>
              Your Usage
            </h2>
            
            {/* Token Dashboard Component */}
            <TokenDashboard 
              userId={user.id} 
              days={30} 
            />
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "600",
              color: "#2C2C2A",
              marginBottom: "24px",
            }}>
              Settings
            </h2>
            
            <div style={{
              background: "white",
              border: "0.5px solid #e5e4dc",
              borderRadius: "16px",
              padding: "24px",
            }}>
              <h3 style={{
                fontSize: "16px",
                fontWeight: "500",
                color: "#2C2C2A",
                marginBottom: "16px",
              }}>
                Account Information
              </h3>
              
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  fontSize: "12px",
                  color: "#888780",
                  display: "block",
                  marginBottom: "6px",
                }}>
                  Email
                </label>
                <p style={{
                  fontSize: "14px",
                  color: "#2C2C2A",
                  margin: 0,
                }}>
                  {user.emailAddresses[0].emailAddress}
                </p>
              </div>

              {user.unsafeMetadata?.collegeName && (
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
                  }}>
                    {user.unsafeMetadata.collegeName}
                    {user.unsafeMetadata.hasSubscription && (
                      <span style={{
                        marginLeft: "8px",
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
