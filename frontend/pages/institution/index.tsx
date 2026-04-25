import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";

const mockStudents = [
  { id: "1", name: "Arjun Kumar",   email: "arjun@college.edu",  mobile: "9876543210", course: "B.Tech CSE",   batch: "2022", status: "active",  queries: 45 },
  { id: "2", name: "Priya Sharma",  email: "priya@college.edu",  mobile: "9876543211", course: "B.Tech ECE",   batch: "2022", status: "active",  queries: 32 },
  { id: "3", name: "Rahul Singh",   email: "rahul@college.edu",  mobile: "9876543212", course: "MBA",          batch: "2023", status: "pending", queries: 0  },
  { id: "4", name: "Sneha Patel",   email: "sneha@college.edu",  mobile: "9876543213", course: "B.Tech Mech",  batch: "2022", status: "active",  queries: 28 },
  { id: "5", name: "Vikram Nair",   email: "vikram@college.edu", mobile: "9876543214", course: "B.Sc Physics", batch: "2023", status: "pending", queries: 0  },
  { id: "6", name: "Anita Rajan",   email: "anita@college.edu",  mobile: "9876543215", course: "B.Tech CSE",   batch: "2021", status: "active",  queries: 67 },
];

const subscription = {
  plan:          "Starter",
  fee:           200000,
  totalQueries:  200000,
  usedQueries:   12450,
  startDate:     "2026-01-01",
  expiryDate:    "2026-12-31",
  collegeCode:   "ANNAUNIV26",
  daysRemaining: 253,
};

const renewPlans = [
  { plan: "Starter",    fee: "₹2,00,000",  queries: "2,00,000",  current: true  },
  { plan: "Standard",   fee: "₹5,00,000",  queries: "5,50,000",  current: false },
  { plan: "Premium",    fee: "₹10,00,000", queries: "12,00,000", current: false },
  { plan: "Enterprise", fee: "₹25,00,000", queries: "32,00,000", current: false },
];

const topupPackages = [
  { queries: "10,000",   price: "₹12,000",   per: "₹1.20/query" },
  { queries: "25,000",   price: "₹28,000",   per: "₹1.12/query" },
  { queries: "50,000",   price: "₹52,000",   per: "₹1.04/query" },
  { queries: "1,00,000", price: "₹1,00,000", per: "₹1.00/query" },
];

export default function InstitutionDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab]         = useState("overview");
  const [showUpload, setShowUpload]       = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showRenew, setShowRenew]         = useState(false);
  const [showTopup, setShowTopup]         = useState(false);
  const [selectedPlan, setSelectedPlan]   = useState("Starter");
  const [selectedTopup, setSelectedTopup] = useState("");
  const [searchQuery, setSearchQuery]     = useState("");
  const [students, setStudents]           = useState(mockStudents);
  const [filterStatus, setFilterStatus]   = useState("all");
  const [addForm, setAddForm]             = useState({
    name: "", email: "", mobile: "", course: "", batch: "2024",
  });

  if (!isLoaded) return null;

  const usedPercent     = Math.round((subscription.usedQueries / subscription.totalQueries) * 100);
  const remaining       = subscription.totalQueries - subscription.usedQueries;
  const pendingStudents = students.filter(s => s.status === "pending");
  const activeStudents  = students.filter(s => s.status === "active");

  const filteredStudents = students
    .filter(s => filterStatus === "all" || s.status === filterStatus)
    .filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.course.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleApprove = (id: string) =>
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: "active" } : s));

  const handleReject = (id: string) =>
    setStudents(prev => prev.filter(s => s.id !== id));

  const handleAddStudent = () => {
    if (!addForm.name || !addForm.email || !addForm.mobile) return;
    setStudents(prev => [...prev, {
      id:      String(prev.length + 1),
      name:    addForm.name,
      email:   addForm.email,
      mobile:  addForm.mobile,
      course:  addForm.course,
      batch:   addForm.batch,
      status:  "active",
      queries: 0,
    }]);
    setAddForm({ name: "", email: "", mobile: "", course: "", batch: "2024" });
    setShowAddStudent(false);
  };

  const alertColor = usedPercent >= 95 ? "#E24B4A" : usedPercent >= 80 ? "#EF9F27" : "#1D9E75";

  const navItems = [
    { id: "overview",      label: "Overview"      },
    { id: "students",      label: "Students"      },
    { id: "analytics",     label: "Analytics"     },
    { id: "subscription",  label: "Subscription"  },
    { id: "settings",      label: "Settings"      },
  ];

  const inputStyle: any = {
    width: "100%", padding: "10px 14px",
    border: "0.5px solid #e5e4dc", borderRadius: "10px",
    fontSize: "13px", outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box",
  };

  const modalOverlay: any = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  };

  const modalBox: any = {
    background: "white", borderRadius: "20px",
    padding: "32px", maxWidth: "90vw",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", background: "#f9f9f7" }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside style={{
        width: "220px", background: "white",
        borderRight: "0.5px solid #e5e4dc",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        <div style={{ padding: "20px", borderBottom: "0.5px solid #e5e4dc" }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "20px", color: "#2C2C2A", margin: 0 }}>
            First<span style={{ color: "#1D9E75" }}>chapter</span>
          </h1>
          <p style={{ fontSize: "11px", color: "#378ADD", margin: "4px 0 0", fontWeight: "500" }}>
            Institution Portal
          </p>
        </div>

        <nav style={{ flex: 1, padding: "12px" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
              width: "100%", padding: "10px 12px",
              background: activeTab === item.id ? "#E6F1FB" : "none",
              border: "none", borderRadius: "8px", textAlign: "left",
              fontSize: "13px",
              color: activeTab === item.id ? "#185FA5" : "#5F5E5A",
              fontWeight: activeTab === item.id ? "500" : "400",
              cursor: "pointer", marginBottom: "2px",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              {item.label}
              {item.id === "students" && pendingStudents.length > 0 && (
                <span style={{
                  background: "#E24B4A", color: "white",
                  borderRadius: "100px", padding: "1px 7px", fontSize: "10px",
                }}>
                  {pendingStudents.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: "16px", borderTop: "0.5px solid #e5e4dc", background: "#f9f9f7" }}>
          <p style={{ fontSize: "11px", color: "#888780", margin: "0 0 6px" }}>Query bucket</p>
          <div style={{ height: "4px", background: "#e5e4dc", borderRadius: "100px", marginBottom: "4px" }}>
            <div style={{
              height: "4px", borderRadius: "100px", background: alertColor,
              width: `${usedPercent}%`, transition: "width 0.5s",
            }} />
          </div>
          <p style={{ fontSize: "11px", color: alertColor, margin: 0, fontWeight: "500" }}>
            {remaining.toLocaleString()} left ({usedPercent}% used)
          </p>
        </div>

        <div style={{ padding: "16px", borderTop: "0.5px solid #e5e4dc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: "#E6F1FB", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "12px", fontWeight: "500", color: "#185FA5",
            }}>
              {user?.firstName?.[0] || "L"}
            </div>
            <div>
              <p style={{ fontSize: "12px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>
                {user?.firstName || "Librarian"}
              </p>
              <p style={{ fontSize: "11px", color: "#888780", margin: 0 }}>Admin</p>
            </div>
          </div>
          <button onClick={() => router.push("/")} style={{
            fontSize: "11px", color: "#888780", background: "none",
            border: "none", cursor: "pointer", padding: 0,
          }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "26px", color: "#2C2C2A", margin: 0 }}>
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
            <p style={{ fontSize: "13px", color: "#888780", margin: "4px 0 0" }}>
              Anna University — Code: <strong>{subscription.collegeCode}</strong>
            </p>
          </div>
          {activeTab === "students" && (
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowUpload(true)} style={{
                background: "white", color: "#185FA5",
                border: "1px solid #185FA5", borderRadius: "100px",
                padding: "10px 20px", fontSize: "13px", fontWeight: "500",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>
                Bulk upload CSV
              </button>
              <button onClick={() => setShowAddStudent(true)} style={{
                background: "#378ADD", color: "white", border: "none",
                borderRadius: "100px", padding: "10px 20px",
                fontSize: "13px", fontWeight: "500", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                + Add student
              </button>
            </div>
          )}
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            {usedPercent >= 80 && (
              <div style={{
                background: usedPercent >= 95 ? "#FCEBEB" : "#FAEEDA",
                border: `1px solid ${usedPercent >= 95 ? "#F09595" : "#FAC775"}`,
                borderRadius: "12px", padding: "16px 20px", marginBottom: "24px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <p style={{ fontSize: "13px", margin: 0, color: usedPercent >= 95 ? "#A32D2D" : "#633806" }}>
                  {usedPercent >= 95
                    ? "⚠️ Critical: 95% of your query budget used. Renew now to avoid interruption."
                    : "⚠️ Warning: 80% of your query budget used. Consider renewing soon."}
                </p>
                <button onClick={() => { setActiveTab("subscription"); setShowRenew(true); }} style={{
                  background: usedPercent >= 95 ? "#E24B4A" : "#EF9F27",
                  color: "white", border: "none", borderRadius: "100px",
                  padding: "8px 20px", fontSize: "12px", cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", fontWeight: "500",
                }}>
                  Renew now
                </button>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
              {[
                { label: "Total students",   value: students.length,                          color: "#378ADD" },
                { label: "Active students",  value: activeStudents.length,                    color: "#1D9E75" },
                { label: "Pending approval", value: pendingStudents.length,                   color: "#EF9F27" },
                { label: "Queries used",     value: subscription.usedQueries.toLocaleString(), color: "#7F77DD" },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: "white", border: "0.5px solid #e5e4dc",
                  borderRadius: "12px", padding: "20px",
                }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{stat.label}</p>
                  <p style={{ fontSize: "26px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div style={{
              background: "white", border: "0.5px solid #e5e4dc",
              borderRadius: "12px", padding: "24px", marginBottom: "24px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Query bucket</p>
                <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>
                  Expires: {subscription.expiryDate} ({subscription.daysRemaining} days)
                </p>
              </div>
              <div style={{ height: "8px", background: "#f0efea", borderRadius: "100px", marginBottom: "12px" }}>
                <div style={{
                  height: "8px", borderRadius: "100px", background: alertColor,
                  width: `${usedPercent}%`, transition: "width 0.5s",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>
                  Used: <strong style={{ color: "#2C2C2A" }}>{subscription.usedQueries.toLocaleString()}</strong>
                </p>
                <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>
                  Remaining: <strong style={{ color: alertColor }}>{remaining.toLocaleString()}</strong>
                </p>
                <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>
                  Total: <strong style={{ color: "#2C2C2A" }}>{subscription.totalQueries.toLocaleString()}</strong>
                </p>
              </div>
            </div>

            {pendingStudents.length > 0 && (
              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: "0.5px solid #e5e4dc", display: "flex", justifyContent: "space-between" }}>
                  <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Pending approvals</p>
                  <span style={{ background: "#FCEBEB", color: "#A32D2D", borderRadius: "100px", padding: "2px 10px", fontSize: "12px" }}>
                    {pendingStudents.length} waiting
                  </span>
                </div>
                {pendingStudents.map((student, i) => (
                  <div key={student.id} style={{
                    padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px",
                    borderBottom: i < pendingStudents.length - 1 ? "0.5px solid #f0efea" : "none",
                  }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "50%",
                      background: "#E6F1FB", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "14px", fontWeight: "500", color: "#185FA5",
                    }}>
                      {student.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>{student.name}</p>
                      <p style={{ fontSize: "12px", color: "#888780", margin: "2px 0 0" }}>
                        {student.email} · {student.course} · Batch {student.batch}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleApprove(student.id)} style={{
                        background: "#1D9E75", color: "white", border: "none",
                        borderRadius: "100px", padding: "6px 16px",
                        fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}>Approve</button>
                      <button onClick={() => handleReject(student.id)} style={{
                        background: "white", color: "#E24B4A", border: "1px solid #E24B4A",
                        borderRadius: "100px", padding: "6px 16px",
                        fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── STUDENTS ──────────────────────────────────────── */}
        {activeTab === "students" && (
          <div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
              <input
                type="text"
                placeholder="Search by name, email or course..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, flex: 1, borderRadius: "100px" }}
              />
              {["all", "active", "pending"].map(status => (
                <button key={status} onClick={() => setFilterStatus(status)} style={{
                  padding: "8px 20px", borderRadius: "100px",
                  border: filterStatus === status ? "none" : "0.5px solid #e5e4dc",
                  background: filterStatus === status ? "#378ADD" : "white",
                  color: filterStatus === status ? "white" : "#5F5E5A",
                  fontSize: "13px", cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", textTransform: "capitalize" as const,
                }}>
                  {status}
                </button>
              ))}
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9f9f7" }}>
                    {["Student", "Course", "Batch", "Mobile", "Queries", "Status", "Actions"].map(h => (
                      <th key={h} style={{
                        padding: "12px 20px", textAlign: "left",
                        fontSize: "11px", color: "#888780", fontWeight: "500",
                        borderBottom: "0.5px solid #e5e4dc",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, i) => (
                    <tr key={student.id} style={{ borderBottom: i < filteredStudents.length - 1 ? "0.5px solid #f0efea" : "none" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "30px", height: "30px", borderRadius: "50%",
                            background: student.status === "active" ? "#E1F5EE" : "#FAEEDA",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "12px", fontWeight: "500",
                            color: student.status === "active" ? "#0F6E56" : "#633806",
                          }}>
                            {student.name[0]}
                          </div>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>{student.name}</p>
                            <p style={{ fontSize: "11px", color: "#888780", margin: 0 }}>{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: "13px", color: "#2C2C2A" }}>{student.course}</td>
                      <td style={{ padding: "14px 20px", fontSize: "13px", color: "#2C2C2A" }}>{student.batch}</td>
                      <td style={{ padding: "14px 20px", fontSize: "13px", color: "#2C2C2A" }}>{student.mobile}</td>
                      <td style={{ padding: "14px 20px", fontSize: "13px", color: "#378ADD", fontWeight: "500" }}>{student.queries}</td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{
                          fontSize: "11px", padding: "3px 10px", borderRadius: "100px",
                          background: student.status === "active" ? "#E1F5EE" : "#FAEEDA",
                          color: student.status === "active" ? "#0F6E56" : "#854F0B",
                        }}>
                          {student.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        {student.status === "pending" ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={() => handleApprove(student.id)} style={{
                              background: "#1D9E75", color: "white", border: "none",
                              borderRadius: "100px", padding: "4px 12px",
                              fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                            }}>Approve</button>
                            <button onClick={() => handleReject(student.id)} style={{
                              background: "white", color: "#E24B4A", border: "1px solid #E24B4A",
                              borderRadius: "100px", padding: "4px 12px",
                              fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                            }}>Reject</button>
                          </div>
                        ) : (
                          <button onClick={() => handleReject(student.id)} style={{
                            background: "white", color: "#888780", border: "0.5px solid #e5e4dc",
                            borderRadius: "100px", padding: "4px 12px",
                            fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                          }}>Deactivate</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ─────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>Top students by queries</p>
              {[...students].filter(s => s.status === "active")
                .sort((a, b) => b.queries - a.queries).slice(0, 5)
                .map((student, i) => (
                <div key={student.id} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                  <span style={{ fontSize: "13px", color: "#888780", width: "16px" }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 4px" }}>{student.name}</p>
                    <div style={{ height: "4px", background: "#f0efea", borderRadius: "100px" }}>
                      <div style={{ height: "4px", borderRadius: "100px", background: "#378ADD", width: `${(student.queries / 70) * 100}%` }} />
                    </div>
                  </div>
                  <span style={{ fontSize: "13px", color: "#378ADD", fontWeight: "500" }}>{student.queries}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>Usage by course</p>
              {[
                { course: "B.Tech CSE",   queries: 112, color: "#378ADD" },
                { course: "B.Tech ECE",   queries: 32,  color: "#1D9E75" },
                { course: "B.Tech Mech",  queries: 28,  color: "#7F77DD" },
                { course: "MBA",          queries: 18,  color: "#EF9F27" },
                { course: "B.Sc Physics", queries: 12,  color: "#F0997B" },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <p style={{ fontSize: "12px", color: "#2C2C2A", margin: 0 }}>{item.course}</p>
                    <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>{item.queries} queries</p>
                  </div>
                  <div style={{ height: "4px", background: "#f0efea", borderRadius: "100px" }}>
                    <div style={{ height: "4px", borderRadius: "100px", background: item.color, width: `${(item.queries / 112) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>Most searched topics</p>
              {["Leadership and management", "Economic theories", "Strategic planning", "Philosophy of mind", "Military strategy"]
                .map((topic, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < 4 ? "0.5px solid #f0efea" : "none" }}>
                  <span style={{
                    width: "24px", height: "24px", borderRadius: "6px", background: "#E6F1FB",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", color: "#185FA5", fontWeight: "500",
                  }}>{i + 1}</span>
                  <p style={{ fontSize: "13px", color: "#2C2C2A", margin: 0 }}>{topic}</p>
                </div>
              ))}
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>Usage projection</p>
              {[
                { label: "Daily average",      value: "49 queries"          },
                { label: "Weekly average",     value: "343 queries"         },
                { label: "Monthly average",    value: "1,472 queries"       },
                { label: "Projected annual",   value: "17,664 queries"      },
                { label: "Budget utilisation", value: "8.8% of 2,00,000"   },
                { label: "Queries will last",  value: "Full year ✓"         },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 5 ? "0.5px solid #f0efea" : "none" }}>
                  <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: "13px", color: "#2C2C2A", fontWeight: "500", margin: 0 }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SUBSCRIPTION ──────────────────────────────────── */}
        {activeTab === "subscription" && (
          <div style={{ maxWidth: "600px" }}>
            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "28px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
                <div>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 4px" }}>Current plan</p>
                  <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color: "#2C2C2A", margin: 0 }}>
                    {subscription.plan}
                  </p>
                </div>
                <span style={{ background: "#E1F5EE", color: "#0F6E56", borderRadius: "100px", padding: "4px 16px", fontSize: "12px", fontWeight: "500", height: "fit-content" }}>
                  Active
                </span>
              </div>
              {[
                { label: "Annual fee",        value: `₹${subscription.fee.toLocaleString()}` },
                { label: "Total queries",     value: subscription.totalQueries.toLocaleString() },
                { label: "Queries used",      value: subscription.usedQueries.toLocaleString() },
                { label: "Queries remaining", value: remaining.toLocaleString() },
                { label: "Start date",        value: subscription.startDate },
                { label: "Expiry date",       value: subscription.expiryDate },
                { label: "Days remaining",    value: `${subscription.daysRemaining} days` },
                { label: "College code",      value: subscription.collegeCode },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: i < 7 ? "0.5px solid #f0efea" : "none" }}>
                  <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: "13px", color: "#2C2C2A", fontWeight: "500", margin: 0 }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <button onClick={() => setShowRenew(true)} style={{
                background: "#378ADD", color: "white", border: "none",
                borderRadius: "12px", padding: "16px", fontSize: "14px",
                fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>
                Renew subscription
              </button>
              <button onClick={() => setShowTopup(true)} style={{
                background: "white", color: "#378ADD", border: "1px solid #378ADD",
                borderRadius: "12px", padding: "16px", fontSize: "14px",
                fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>
                Top up queries
              </button>
            </div>
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────────────── */}
        {activeTab === "settings" && (
          <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "32px", maxWidth: "500px" }}>
            <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 24px" }}>Institution profile</p>
            {[
              { label: "Institution name", placeholder: "Your college or university name" },
              { label: "Contact person",   placeholder: "Librarian or admin name" },
              { label: "Contact email",    placeholder: "admin@institution.edu" },
              { label: "Contact mobile",   placeholder: "10 digit mobile number" },
              { label: "Address",          placeholder: "Institution address" },
            ].map((field, i) => (
              <div key={i} style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>{field.label}</label>
                <input type="text" placeholder={field.placeholder} style={inputStyle} />
              </div>
            ))}
            <button style={{
              background: "#378ADD", color: "white", border: "none",
              borderRadius: "100px", padding: "10px 24px", fontSize: "13px",
              fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: "8px",
            }}>
              Save changes
            </button>
          </div>
        )}
      </main>

      {/* ── Bulk Upload Modal ────────────────────────────────── */}
      {showUpload && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "520px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Bulk upload students</p>
              <button onClick={() => setShowUpload(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888780" }}>×</button>
            </div>
            <div style={{ background: "#E6F1FB", borderRadius: "10px", padding: "14px 16px", marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", color: "#0C447C", margin: "0 0 8px", fontWeight: "500" }}>CSV format required</p>
              <p style={{ fontSize: "12px", color: "#185FA5", margin: 0, fontFamily: "monospace" }}>name, email, mobile, course, batch_year</p>
              <p style={{ fontSize: "11px", color: "#185FA5", margin: "6px 0 0" }}>Example: Arjun Kumar, arjun@college.edu, 9876543210, B.Tech CSE, 2022</p>
            </div>
            <div onClick={() => document.getElementById("csvInput")?.click()} style={{
              border: "1.5px dashed #e5e4dc", borderRadius: "12px", padding: "32px",
              textAlign: "center", cursor: "pointer", background: "#f9f9f7", marginBottom: "20px",
            }}>
              <input id="csvInput" type="file" accept=".csv" style={{ display: "none" }} />
              <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 4px" }}>Click to select CSV file</p>
              <p style={{ fontSize: "12px", color: "#B4B2A9", margin: 0 }}>All students will be auto-approved on upload</p>
            </div>
            <div style={{ background: "#E1F5EE", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", color: "#0F6E56", margin: 0 }}>
                ✓ Students uploaded via CSV are automatically approved. They will receive an email invitation to set their password.
              </p>
            </div>
            <button style={{
              width: "100%", background: "#378ADD", color: "white", border: "none",
              borderRadius: "100px", padding: "12px", fontSize: "14px",
              fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              Upload and invite students →
            </button>
          </div>
        </div>
      )}

      {/* ── Add Student Modal ────────────────────────────────── */}
      {showAddStudent && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "440px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
              <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Add student</p>
              <button onClick={() => setShowAddStudent(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888780" }}>×</button>
            </div>
            {[
              { label: "Full name", key: "name",   placeholder: "Student full name",   type: "text"  },
              { label: "Email",     key: "email",  placeholder: "student@college.edu", type: "email" },
              { label: "Mobile",    key: "mobile", placeholder: "10 digit number",     type: "tel"   },
              { label: "Course",    key: "course", placeholder: "e.g. B.Tech CSE",     type: "text"  },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>{field.label}</label>
                <input
                  type={field.type} placeholder={field.placeholder}
                  value={(addForm as any)[field.key]}
                  onChange={e => setAddForm(f => ({ ...f, [field.key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Batch start year</label>
              <select value={addForm.batch} onChange={e => setAddForm(f => ({ ...f, batch: e.target.value }))}
                style={{ ...inputStyle, background: "white" }}>
                {["2021","2022","2023","2024","2025"].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={handleAddStudent} disabled={!addForm.name || !addForm.email || !addForm.mobile} style={{
              width: "100%", background: "#378ADD", color: "white", border: "none",
              borderRadius: "100px", padding: "12px", fontSize: "14px",
              fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              opacity: !addForm.name || !addForm.email || !addForm.mobile ? 0.5 : 1,
            }}>
              Add student →
            </button>
          </div>
        </div>
      )}

      {/* ── Renew Subscription Modal ─────────────────────────── */}
      {showRenew && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "500px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
              <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Renew subscription</p>
              <button onClick={() => setShowRenew(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888780" }}>×</button>
            </div>
            <p style={{ fontSize: "13px", color: "#888780", margin: "0 0 20px" }}>
              Your current plan expires on <strong>2026-12-31</strong>. Select a plan to renew for another 12 months.
            </p>
            {renewPlans.map((item, i) => (
              <div key={i} onClick={() => setSelectedPlan(item.plan)} style={{
                border: selectedPlan === item.plan ? "2px solid #378ADD" : "0.5px solid #e5e4dc",
                borderRadius: "12px", padding: "16px 20px", marginBottom: "12px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer",
                background: selectedPlan === item.plan ? "#EFF8FF" : "white",
                transition: "all 0.2s",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>{item.plan}</p>
                    {item.current && (
                      <span style={{ fontSize: "10px", padding: "2px 8px", background: "#378ADD", color: "white", borderRadius: "100px" }}>Current</span>
                    )}
                    {selectedPlan === item.plan && !item.current && (
                      <span style={{ fontSize: "10px", padding: "2px 8px", background: "#1D9E75", color: "white", borderRadius: "100px" }}>Selected</span>
                    )}
                  </div>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "3px 0 0" }}>{item.queries} queries · 12 months</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <p style={{ fontSize: "16px", fontWeight: "500", color: "#378ADD", margin: 0 }}>{item.fee}</p>
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "50%",
                    border: selectedPlan === item.plan ? "none" : "1.5px solid #e5e4dc",
                    background: selectedPlan === item.plan ? "#378ADD" : "white",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {selectedPlan === item.plan && <span style={{ color: "white", fontSize: "11px", fontWeight: "bold" }}>✓</span>}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ background: "#E6F1FB", borderRadius: "10px", padding: "12px 16px", margin: "20px 0" }}>
              <p style={{ fontSize: "12px", color: "#0C447C", margin: 0 }}>
                💳 Payment via bank transfer or Razorpay. Our team will contact you within 24 hours to process renewal.
              </p>
            </div>
            <button onClick={() => { alert(`Renewal request for ${selectedPlan} plan submitted! Our team will contact you within 24 hours.`); setShowRenew(false); }} style={{
              width: "100%", background: "#378ADD", color: "white", border: "none",
              borderRadius: "100px", padding: "12px", fontSize: "14px",
              fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              Request renewal — {selectedPlan} plan →
            </button>
          </div>
        </div>
      )}

      {/* ── Top Up Modal ─────────────────────────────────────── */}
      {showTopup && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "460px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
              <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Top up queries</p>
              <button onClick={() => setShowTopup(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888780" }}>×</button>
            </div>
            <p style={{ fontSize: "13px", color: "#888780", margin: "0 0 20px" }}>
              Add more queries to your current bucket. Top-up queries expire with your subscription on <strong>2026-12-31</strong>.
            </p>
            {topupPackages.map((item, i) => (
              <div key={i} onClick={() => setSelectedTopup(item.queries)} style={{
                border: selectedTopup === item.queries ? "2px solid #1D9E75" : "0.5px solid #e5e4dc",
                borderRadius: "12px", padding: "14px 20px", marginBottom: "10px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer",
                background: selectedTopup === item.queries ? "#E1F5EE" : "white",
                transition: "all 0.2s",
              }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>{item.queries} queries</p>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "2px 0 0" }}>{item.per}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <p style={{ fontSize: "16px", fontWeight: "500", color: "#1D9E75", margin: 0 }}>{item.price}</p>
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "50%",
                    border: selectedTopup === item.queries ? "none" : "1.5px solid #e5e4dc",
                    background: selectedTopup === item.queries ? "#1D9E75" : "white",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {selectedTopup === item.queries && <span style={{ color: "white", fontSize: "11px", fontWeight: "bold" }}>✓</span>}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ background: "#E1F5EE", borderRadius: "10px", padding: "12px 16px", margin: "20px 0" }}>
              <p style={{ fontSize: "12px", color: "#0F6E56", margin: 0 }}>
                ✓ Queries added instantly after payment confirmation. All top-up queries expire on 2026-12-31.
              </p>
            </div>
            <button
              onClick={() => {
                if (!selectedTopup) { alert("Please select a top-up package first."); return; }
                alert(`Top-up request for ${selectedTopup} queries submitted! Queries will be added within 2 hours.`);
                setShowTopup(false);
                setSelectedTopup("");
              }}
              disabled={!selectedTopup}
              style={{
                width: "100%",
                background: selectedTopup ? "#1D9E75" : "#9FE1CB",
                color: "white", border: "none", borderRadius: "100px",
                padding: "12px", fontSize: "14px", fontWeight: "500",
                cursor: selectedTopup ? "pointer" : "not-allowed",
                fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s",
              }}
            >
              {selectedTopup ? `Request ${selectedTopup} query top-up →` : "Select a package above"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
