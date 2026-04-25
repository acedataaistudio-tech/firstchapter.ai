import { useState } from "react";
import { useRouter } from "next/router";

const ADMIN_PASSWORD = "firstchapter@admin2026";

const mockStats = {
  totalUsers:        1247,
  totalReaders:      1089,
  totalPublishers:   94,
  totalInstitutions: 64,
  totalBooks:        312,
  totalQueries:      48920,
  queriesToday:      1240,
  totalRevenue:      244600,
  publisherPayouts:  122300,
  platformRevenue:   122300,
};

const mockPublishers = [
  { id: "1", name: "John Maxwell",   email: "john@maxwell.com",    type: "Author-Publisher", books: 3, queries: 4820, revenue: 2410, joined: "2026-02-20", status: "active",  payout: "pending" },
  { id: "2", name: "Sarah Chen",     email: "sarah@publisher.com", type: "Independent",      books: 5, queries: 3210, revenue: 1605, joined: "2026-03-05", status: "active",  payout: "pending" },
  { id: "3", name: "Logan Arumugam", email: "logan@gmail.com",     type: "Author-Publisher", books: 2, queries: 2847, revenue: 1423, joined: "2026-01-01", status: "active",  payout: "pending" },
  { id: "4", name: "David Park",     email: "david@park.com",      type: "Traditional",      books: 1, queries: 0,    revenue: 0,    joined: "2026-04-20", status: "active",  payout: "none"    },
  { id: "5", name: "Notion Press",   email: "pub@notion.com",      type: "Independent",      books: 8, queries: 9820, revenue: 4910, joined: "2026-01-15", status: "active",  payout: "paid"    },
];

const mockBooks = [
  { id: "1", title: "The Art of Selling",              author: "John Maxwell", publisher: "John Maxwell",   publisherId: "1", category: "Business",   status: "active",     queries: 1240, revenue: 620,  uploaded: "2026-03-01" },
  { id: "2", title: "Modern Economics",                author: "Sarah Chen",   publisher: "Sarah Chen",     publisherId: "2", category: "Economics",  status: "active",     queries: 890,  revenue: 445,  uploaded: "2026-03-15" },
  { id: "3", title: "Leadership Principles",           author: "David Park",   publisher: "David Park",     publisherId: "4", category: "Management", status: "processing", queries: 0,    revenue: 0,    uploaded: "2026-04-20" },
  { id: "4", title: "Principles of Political Economy", author: "W. Roscher",   publisher: "Logan Arumugam", publisherId: "3", category: "Economics",  status: "active",     queries: 2847, revenue: 1423, uploaded: "2026-04-25" },
  { id: "5", title: "The Art of War",                  author: "Sun Tzu",      publisher: "Logan Arumugam", publisherId: "3", category: "Philosophy", status: "active",     queries: 3120, revenue: 1560, uploaded: "2026-01-01" },
  { id: "6", title: "Meditations",                     author: "Marcus Aurelius", publisher: "Notion Press", publisherId: "5", category: "Philosophy", status: "active",    queries: 2100, revenue: 1050, uploaded: "2026-01-01" },
];

const mockUsers = [
  { id: "1", name: "Logan Arumugam",   email: "logan@gmail.com",      role: "admin",       joined: "2026-01-01", queries: 0,   status: "active"  },
  { id: "2", name: "Priya Sharma",     email: "priya@college.edu",    role: "reader",      joined: "2026-03-12", queries: 145, status: "active"  },
  { id: "3", name: "John Maxwell",     email: "john@maxwell.com",     role: "publisher",   joined: "2026-02-20", queries: 0,   status: "active"  },
  { id: "4", name: "Anna University",  email: "lib@annauniv.edu",     role: "institution", joined: "2026-01-15", queries: 0,   status: "active"  },
  { id: "5", name: "Rahul Singh",      email: "rahul@gmail.com",      role: "reader",      joined: "2026-04-01", queries: 32,  status: "active"  },
  { id: "6", name: "Sarah Chen",       email: "sarah@publisher.com",  role: "publisher",   joined: "2026-03-05", queries: 0,   status: "active"  },
  { id: "7", name: "IIT Madras",       email: "lib@iitm.ac.in",       role: "institution", joined: "2026-02-10", queries: 0,   status: "active"  },
  { id: "8", name: "Vikram Nair",      email: "vikram@gmail.com",     role: "reader",      joined: "2026-04-20", queries: 8,   status: "pending" },
];

const mockInstitutions = [
  { id: "1", name: "Anna University",   code: "ANNAUNIV26", plan: "Starter",    fee: 200000,  used: 12450,  total: 200000,  expiry: "2026-12-31", status: "active" },
  { id: "2", name: "IIT Madras",        code: "IITM2026",   plan: "Premium",    fee: 1000000, used: 45200,  total: 1200000, expiry: "2026-12-31", status: "active" },
  { id: "3", name: "SRM University",    code: "SRMU2026",   plan: "Standard",   fee: 500000,  used: 98000,  total: 550000,  expiry: "2026-12-31", status: "active" },
  { id: "4", name: "Vellore Institute", code: "VIT2026",    plan: "Enterprise", fee: 2500000, used: 120000, total: 3200000, expiry: "2026-12-31", status: "active" },
];

const mockQueries = [
  { id: "1", user: "Priya Sharma",  book: "The Art of War",          question: "What does Sun Tzu say about strategy?", time: "2 mins ago",  status: "success" },
  { id: "2", user: "Rahul Singh",   book: "Modern Economics",        question: "Explain supply and demand",              time: "5 mins ago",  status: "success" },
  { id: "3", user: "Anita Rajan",   book: "Art of Selling",          question: "What are closing techniques?",           time: "8 mins ago",  status: "success" },
  { id: "4", user: "Vikram Nair",   book: "Political Economy",       question: "What is political economy?",             time: "12 mins ago", status: "success" },
  { id: "5", user: "Sneha Patel",   book: "Leadership Principles",   question: "How to build a team?",                  time: "15 mins ago", status: "failed"  },
];

const mockPayouts = [
  { publisher: "John Maxwell",   book: "Art of Selling",            queries: 1240, amount: 620,  month: "April 2026", status: "pending" },
  { publisher: "Sarah Chen",     book: "Modern Economics",          queries: 890,  amount: 445,  month: "April 2026", status: "pending" },
  { publisher: "Logan Arumugam", book: "Principles of Pol. Economy",queries: 2847, amount: 1423, month: "April 2026", status: "pending" },
];

const categories = ["Business","Economics","Philosophy","Science","Technology","History","Medicine","Law","Management","Self Development"];
const publisherTypes = ["Author-Publisher","Independent Publisher","Traditional Publisher","Academic / Institution"];
const roles = ["reader","publisher","institution"];
const plans = ["Starter — ₹2,00,000","Standard — ₹5,00,000","Premium — ₹10,00,000","Enterprise — ₹25,00,000"];

export default function AdminDashboard() {
  const router = useRouter();
  const [authenticated, setAuthenticated]     = useState(false);
  const [password, setPassword]               = useState("");
  const [passwordError, setPasswordError]     = useState(false);
  const [activeTab, setActiveTab]             = useState("overview");
  const [userFilter, setUserFilter]           = useState("all");
  const [userSearch, setUserSearch]           = useState("");
  const [bookSearch, setBookSearch]           = useState("");
  const [selectedPublisher, setSelectedPublisher] = useState<any>(null);

  // Add user modal
  const [showAddUser, setShowAddUser]         = useState(false);
  const [addUserForm, setAddUserForm]         = useState({ name: "", email: "", role: "reader", institution: "", plan: "Starter — ₹2,00,000" });

  // Add book modal
  const [showAddBook, setShowAddBook]         = useState(false);
  const [addBookForm, setAddBookForm]         = useState({ title: "", author: "", publisher: "", category: "Business", isbn: "", file: null as File | null });

  // Add publisher modal
  const [showAddPublisher, setShowAddPublisher] = useState(false);
  const [addPublisherForm, setAddPublisherForm] = useState({ name: "", email: "", type: "Author-Publisher", phone: "", pan: "" });

  const [showAddInstitution, setShowAddInstitution] = useState(false);
  const [addInstitutionForm, setAddInstitutionForm] = useState({
  name: "", email: "", phone: "", address: "", plan: "Starter — ₹2,00,000",
  });
  const [institutions, setInstitutions] = useState(mockInstitutions);

  const [users, setUsers]               = useState(mockUsers);
  const [books, setBooks]               = useState(mockBooks);
  const [publishers, setPublishers]     = useState(mockPublishers);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) { setAuthenticated(true); setPasswordError(false); }
    else setPasswordError(true);
  };

  const filteredUsers = users
    .filter(u => userFilter === "all" || u.role === userFilter)
    .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));

  const filteredBooks = books
    .filter(b => b.title.toLowerCase().includes(bookSearch.toLowerCase()) || b.publisher.toLowerCase().includes(bookSearch.toLowerCase()) || b.author.toLowerCase().includes(bookSearch.toLowerCase()));

  const handleAddUser = () => {
    if (!addUserForm.name || !addUserForm.email) return;
    setUsers(prev => [...prev, { id: String(prev.length + 1), name: addUserForm.name, email: addUserForm.email, role: addUserForm.role, joined: new Date().toISOString().split("T")[0], queries: 0, status: "active" }]);
    setShowAddUser(false);
    setAddUserForm({ name: "", email: "", role: "reader", institution: "", plan: "Starter — ₹2,00,000" });
    alert(`✅ ${addUserForm.role === "institution" ? "Institution" : addUserForm.role === "publisher" ? "Publisher" : "Reader"} account created for ${addUserForm.name}. An invitation email will be sent.`);
  };

  const handleAddPublisher = () => {
    if (!addPublisherForm.name || !addPublisherForm.email) return;
    setPublishers(prev => [...prev, { id: String(prev.length + 1), name: addPublisherForm.name, email: addPublisherForm.email, type: addPublisherForm.type, books: 0, queries: 0, revenue: 0, joined: new Date().toISOString().split("T")[0], status: "active", payout: "none" }]);
    setShowAddPublisher(false);
    setAddPublisherForm({ name: "", email: "", type: "Author-Publisher", phone: "", pan: "" });
    alert(`✅ Publisher account created for ${addPublisherForm.name}. They can now log in and upload books.`);
  };

  const handleSuspendUser = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "active" ? "suspended" : "active" } : u));
  };

  const handleRemoveBook = (id: string) => {
    if (confirm("Are you sure? This will remove the book and all its vectors from Qdrant.")) {
      setBooks(prev => prev.filter(b => b.id !== id));
    }
  };

  const roleColor = (role: string) => {
    if (role === "admin")       return { bg: "#FCEBEB", color: "#A32D2D" };
    if (role === "publisher")   return { bg: "#EEEDFE", color: "#534AB7" };
    if (role === "institution") return { bg: "#E6F1FB", color: "#185FA5" };
    if (role === "suspended")   return { bg: "#f0efea", color: "#888780" };
    return { bg: "#E1F5EE", color: "#0F6E56" };
  };

  const inputStyle: any = {
    width: "100%", padding: "10px 14px",
    border: "0.5px solid #e5e4dc", borderRadius: "10px",
    fontSize: "13px", outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box", background: "white",
  };

  const modalOverlay: any = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  };

  const navItems = [
    { id: "overview",     label: "Overview"     },
    { id: "users",        label: "Users"        },
    { id: "publishers",   label: "Publishers"   },
    { id: "books",        label: "Books"        },
    { id: "institutions", label: "Institutions" },
    { id: "queries",      label: "Live queries" },
    { id: "revenue",      label: "Revenue"      },
  ];

  // ── Password Gate ─────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "#f9f9f7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ width: "380px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#2C2C2A", margin: "0 0 8px" }}>
              First<span style={{ color: "#1D9E75" }}>chapter</span>
            </h1>
            <p style={{ fontSize: "14px", color: "#888780", margin: 0 }}>Admin access only</p>
          </div>
          <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "16px", padding: "32px" }}>
            <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>Enter admin password</p>
            <div style={{ marginBottom: "16px" }}>
              <input type="password" placeholder="Admin password" value={password}
                onChange={e => { setPassword(e.target.value); setPasswordError(false); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ ...inputStyle, border: passwordError ? "1px solid #E24B4A" : "0.5px solid #e5e4dc" }} />
              {passwordError && <p style={{ fontSize: "12px", color: "#E24B4A", margin: "6px 0 0" }}>Incorrect password. Try again.</p>}
            </div>
            <button onClick={handleLogin} style={{ width: "100%", background: "#2C2C2A", color: "white", border: "none", borderRadius: "100px", padding: "13px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Access admin dashboard →
            </button>
            <button onClick={() => router.push("/")} style={{ width: "100%", background: "none", border: "none", color: "#888780", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: "12px" }}>
              ← Back to platform
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: "11px", color: "#B4B2A9", marginTop: "16px" }}>This page is not publicly accessible</p>
        </div>
      </div>
    );
  }

  // ── Admin Dashboard ───────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", background: "#f9f9f7" }}>

      {/* Sidebar */}
      <aside style={{ width: "220px", background: "#1A1A18", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px", borderBottom: "0.5px solid #2C2C2A" }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "20px", color: "white", margin: 0 }}>
            First<span style={{ color: "#1D9E75" }}>chapter</span>
          </h1>
          <p style={{ fontSize: "11px", color: "#E24B4A", margin: "4px 0 0", fontWeight: "500" }}>⚡ Admin Console</p>
        </div>
        <nav style={{ flex: 1, padding: "12px" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSelectedPublisher(null); }} style={{
              width: "100%", padding: "10px 12px",
              background: activeTab === item.id ? "#2C2C2A" : "none",
              border: "none", borderRadius: "8px", textAlign: "left",
              fontSize: "13px", color: activeTab === item.id ? "white" : "#888780",
              fontWeight: activeTab === item.id ? "500" : "400",
              cursor: "pointer", marginBottom: "2px", fontFamily: "'DM Sans', sans-serif",
            }}>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px", borderTop: "0.5px solid #2C2C2A" }}>
          <p style={{ fontSize: "12px", fontWeight: "500", color: "white", margin: "0 0 2px" }}>Logan Arumugam</p>
          <p style={{ fontSize: "11px", color: "#888780", margin: "0 0 8px" }}>Platform Admin</p>
          <button onClick={() => setAuthenticated(false)} style={{ fontSize: "11px", color: "#E24B4A", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "26px", color: "#2C2C2A", margin: 0 }}>
              {selectedPublisher ? `${selectedPublisher.name} — Books` : navItems.find(n => n.id === activeTab)?.label}
            </h2>
            <p style={{ fontSize: "13px", color: "#888780", margin: "4px 0 0" }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          {/* Action buttons per tab */}
          <div style={{ display: "flex", gap: "10px" }}>
            {activeTab === "users" && (
              <button onClick={() => setShowAddUser(true)} style={{ background: "#2C2C2A", color: "white", border: "none", borderRadius: "100px", padding: "10px 20px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                + Add user
              </button>
            )}
            {activeTab === "publishers" && !selectedPublisher && (
              <button onClick={() => setShowAddPublisher(true)} style={{ background: "#7F77DD", color: "white", border: "none", borderRadius: "100px", padding: "10px 20px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                + Add publisher
              </button>
            )}
            {(activeTab === "books" || selectedPublisher) && (
              <button onClick={() => setShowAddBook(true)} style={{ background: "#1D9E75", color: "white", border: "none", borderRadius: "100px", padding: "10px 20px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                + Add book
              </button>
            )}
            {selectedPublisher && (
              <button onClick={() => setSelectedPublisher(null)} style={{ background: "white", color: "#5F5E5A", border: "0.5px solid #e5e4dc", borderRadius: "100px", padding: "10px 20px", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                ← All publishers
              </button>
            )}
          </div>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Total users",      value: mockStats.totalUsers.toLocaleString(),                                    color: "#2C2C2A" },
                { label: "Total books",      value: mockStats.totalBooks.toLocaleString(),                                    color: "#7F77DD" },
                { label: "Queries today",    value: mockStats.queriesToday.toLocaleString(),                                  color: "#378ADD" },
                { label: "Platform revenue", value: `₹${(mockStats.platformRevenue / 100000).toFixed(1)}L`,                  color: "#1D9E75" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{stat.label}</p>
                  <p style={{ fontSize: "28px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>User breakdown</p>
                {[
                  { label: "Readers",      value: mockStats.totalReaders,      color: "#1D9E75" },
                  { label: "Publishers",   value: mockStats.totalPublishers,    color: "#7F77DD" },
                  { label: "Institutions", value: mockStats.totalInstitutions,  color: "#378ADD" },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <p style={{ fontSize: "13px", color: "#2C2C2A", margin: 0 }}>{item.label}</p>
                      <p style={{ fontSize: "13px", color: item.color, fontWeight: "500", margin: 0 }}>{item.value.toLocaleString()}</p>
                    </div>
                    <div style={{ height: "6px", background: "#f0efea", borderRadius: "100px" }}>
                      <div style={{ height: "6px", borderRadius: "100px", background: item.color, width: `${(item.value / mockStats.totalUsers) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>Revenue split</p>
                {[
                  { label: "Total queries",        value: mockStats.totalQueries.toLocaleString()           },
                  { label: "Gross revenue",         value: `₹${mockStats.totalRevenue.toLocaleString()}`    },
                  { label: "Publisher payouts",     value: `₹${mockStats.publisherPayouts.toLocaleString()}` },
                  { label: "Platform net revenue",  value: `₹${mockStats.platformRevenue.toLocaleString()}` },
                  { label: "Margin",                value: "50%"                                             },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 4 ? "0.5px solid #f0efea" : "none" }}>
                    <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>{item.label}</p>
                    <p style={{ fontSize: "13px", color: "#2C2C2A", fontWeight: "500", margin: 0 }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 16px" }}>Recent activity</p>
              {[
                { icon: "📚", text: "Principles of Political Economy uploaded by Logan Arumugam",  time: "2 hours ago"  },
                { icon: "👤", text: "New reader signup — Vikram Nair from Chennai",                 time: "3 hours ago"  },
                { icon: "🏛️", text: "IIT Madras query bucket at 45% — 660,000 remaining",          time: "5 hours ago"  },
                { icon: "💰", text: "Publisher payout processed — ₹1,423 to Logan Arumugam",       time: "1 day ago"    },
                { icon: "✅", text: "Content moderation passed — Art of Selling (568 pages)",       time: "2 days ago"   },
                { icon: "🏢", text: "New institution signup — SRM University",                      time: "3 days ago"   },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < 5 ? "0.5px solid #f0efea" : "none" }}>
                  <span style={{ fontSize: "20px" }}>{item.icon}</span>
                  <p style={{ fontSize: "13px", color: "#2C2C2A", margin: 0, flex: 1 }}>{item.text}</p>
                  <p style={{ fontSize: "11px", color: "#888780", margin: 0, whiteSpace: "nowrap" as const }}>{item.time}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* USERS */}
        {activeTab === "users" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Total users",   value: users.length,                                       color: "#2C2C2A" },
                { label: "Readers",       value: users.filter(u => u.role === "reader").length,       color: "#1D9E75" },
                { label: "Publishers",    value: users.filter(u => u.role === "publisher").length,    color: "#7F77DD" },
                { label: "Institutions",  value: users.filter(u => u.role === "institution").length,  color: "#378ADD" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{stat.label}</p>
                  <p style={{ fontSize: "28px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
              <input type="text" placeholder="Search by name or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
                style={{ flex: 1, padding: "10px 16px", border: "0.5px solid #e5e4dc", borderRadius: "100px", fontSize: "13px", outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
              {["all", "reader", "publisher", "institution"].map(f => (
                <button key={f} onClick={() => setUserFilter(f)} style={{
                  padding: "8px 20px", borderRadius: "100px",
                  border: userFilter === f ? "none" : "0.5px solid #e5e4dc",
                  background: userFilter === f ? "#2C2C2A" : "white",
                  color: userFilter === f ? "white" : "#5F5E5A",
                  fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  textTransform: "capitalize" as const,
                }}>
                  {f}
                </button>
              ))}
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9f9f7" }}>
                    {["User", "Role", "Joined", "Queries", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", color: "#888780", fontWeight: "500", borderBottom: "0.5px solid #e5e4dc" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, i) => {
                    const rc = roleColor(user.status === "suspended" ? "suspended" : user.role);
                    return (
                      <tr key={user.id} style={{ borderBottom: i < filteredUsers.length - 1 ? "0.5px solid #f0efea" : "none" }}>
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: rc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "500", color: rc.color }}>
                              {user.name[0]}
                            </div>
                            <div>
                              <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>{user.name}</p>
                              <p style={{ fontSize: "11px", color: "#888780", margin: 0 }}>{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: rc.bg, color: rc.color, textTransform: "capitalize" as const }}>{user.role}</span>
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: "13px", color: "#888780" }}>{user.joined}</td>
                        <td style={{ padding: "14px 20px", fontSize: "13px", color: "#378ADD", fontWeight: "500" }}>{user.queries}</td>
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: user.status === "active" ? "#E1F5EE" : "#FCEBEB", color: user.status === "active" ? "#0F6E56" : "#A32D2D" }}>
                            {user.status}
                          </span>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <button onClick={() => handleSuspendUser(user.id)} style={{
                            background: user.status === "active" ? "#FCEBEB" : "#E1F5EE",
                            color: user.status === "active" ? "#A32D2D" : "#0F6E56",
                            border: "none", borderRadius: "100px", padding: "4px 12px",
                            fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                          }}>
                            {user.status === "active" ? "Suspend" : "Reactivate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PUBLISHERS */}
        {activeTab === "publishers" && !selectedPublisher && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Total publishers", value: publishers.length,                                         color: "#7F77DD" },
                { label: "Total books",      value: publishers.reduce((s, p) => s + p.books, 0),              color: "#1D9E75" },
                { label: "Total queries",    value: publishers.reduce((s, p) => s + p.queries, 0).toLocaleString(), color: "#378ADD" },
                { label: "Total revenue",    value: `₹${publishers.reduce((s, p) => s + p.revenue, 0).toLocaleString()}`, color: "#EF9F27" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{stat.label}</p>
                  <p style={{ fontSize: "28px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {publishers.map((pub, i) => (
                <div key={i}
                  onClick={() => setSelectedPublisher(pub)}
                  style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "16px", transition: "box-shadow 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                >
                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "500", color: "#534AB7", flexShrink: 0 }}>
                    {pub.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>{pub.name}</p>
                      <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "100px", background: "#EEEDFE", color: "#534AB7" }}>{pub.type}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>{pub.email}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 80px)", gap: "12px", textAlign: "center" as const }}>
                    {[
                      { label: "Books",   value: pub.books,                        color: "#7F77DD" },
                      { label: "Queries", value: pub.queries.toLocaleString(),      color: "#378ADD" },
                      { label: "Revenue", value: `₹${pub.revenue.toLocaleString()}`, color: "#1D9E75" },
                    ].map((s, j) => (
                      <div key={j}>
                        <p style={{ fontSize: "16px", fontFamily: "'DM Serif Display', serif", color: s.color, margin: "0 0 2px" }}>{s.value}</p>
                        <p style={{ fontSize: "10px", color: "#888780", margin: 0 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      fontSize: "11px", padding: "3px 10px", borderRadius: "100px",
                      background: pub.payout === "pending" ? "#FAEEDA" : pub.payout === "paid" ? "#E1F5EE" : "#f0efea",
                      color: pub.payout === "pending" ? "#854F0B" : pub.payout === "paid" ? "#0F6E56" : "#888780",
                    }}>
                      {pub.payout === "pending" ? "Payout due" : pub.payout === "paid" ? "Paid" : "No payout"}
                    </span>
                    <span style={{ color: "#888780", fontSize: "18px" }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PUBLISHER DETAIL — books by this publisher */}
        {activeTab === "publishers" && selectedPublisher && (
          <div>
            {/* Publisher profile card */}
            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "500", color: "#534AB7" }}>
                  {selectedPublisher.name[0]}
                </div>
                <div>
                  <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 3px" }}>{selectedPublisher.name}</p>
                  <p style={{ fontSize: "13px", color: "#888780", margin: "0 0 6px" }}>{selectedPublisher.email}</p>
                  <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "100px", background: "#EEEDFE", color: "#534AB7" }}>{selectedPublisher.type}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                {[
                  { label: "Books uploaded", value: selectedPublisher.books,                             color: "#7F77DD" },
                  { label: "Total queries",  value: selectedPublisher.queries.toLocaleString(),           color: "#378ADD" },
                  { label: "Total revenue",  value: `₹${selectedPublisher.revenue.toLocaleString()}`,    color: "#1D9E75" },
                  { label: "Payout status",  value: selectedPublisher.payout,                            color: "#EF9F27" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#f9f9f7", borderRadius: "10px", padding: "14px" }}>
                    <p style={{ fontSize: "11px", color: "#888780", margin: "0 0 4px" }}>{s.label}</p>
                    <p style={{ fontSize: "20px", fontFamily: "'DM Serif Display', serif", color: s.color, margin: 0, textTransform: "capitalize" as const }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Books by this publisher */}
            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "0.5px solid #e5e4dc" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Books by {selectedPublisher.name}</p>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9f9f7" }}>
                    {["Title", "Category", "Status", "Queries", "Revenue", "Uploaded", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", color: "#888780", fontWeight: "500", borderBottom: "0.5px solid #e5e4dc" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {books.filter(b => b.publisherId === selectedPublisher.id).map((book, i) => {
                    const publisherBooks = books.filter(b => b.publisherId === selectedPublisher.id);
                    return (
                      <tr key={book.id} style={{ borderBottom: i < publisherBooks.length - 1 ? "0.5px solid #f0efea" : "none" }}>
                        <td style={{ padding: "14px 20px" }}>
                          <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>{book.title}</p>
                          <p style={{ fontSize: "11px", color: "#888780", margin: 0 }}>{book.author}</p>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: "#EEEDFE", color: "#534AB7" }}>{book.category}</span>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: book.status === "active" ? "#E1F5EE" : "#FAEEDA", color: book.status === "active" ? "#0F6E56" : "#854F0B" }}>{book.status}</span>
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: "13px", color: "#378ADD", fontWeight: "500" }}>{book.queries.toLocaleString()}</td>
                        <td style={{ padding: "14px 20px", fontSize: "13px", color: "#1D9E75", fontWeight: "500" }}>₹{book.revenue.toLocaleString()}</td>
                        <td style={{ padding: "14px 20px", fontSize: "13px", color: "#888780" }}>{book.uploaded}</td>
                        <td style={{ padding: "14px 20px" }}>
                          <button onClick={() => handleRemoveBook(book.id)} style={{ background: "#FCEBEB", color: "#A32D2D", border: "none", borderRadius: "100px", padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {books.filter(b => b.publisherId === selectedPublisher.id).length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "32px", textAlign: "center" as const, fontSize: "13px", color: "#888780" }}>
                        No books uploaded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
{activeTab === "institutions" && (
  <button onClick={() => setShowAddInstitution(true)} style={{ background: "#378ADD", color: "white", border: "none", borderRadius: "100px", padding: "10px 20px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
    + Add institution
  </button>
)}
        {/* BOOKS */}
        {activeTab === "books" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Total books",   value: books.length,                                           color: "#7F77DD" },
                { label: "Total queries", value: books.reduce((s, b) => s + b.queries, 0).toLocaleString(), color: "#378ADD" },
                { label: "Active books",  value: books.filter(b => b.status === "active").length,         color: "#1D9E75" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{stat.label}</p>
                  <p style={{ fontSize: "28px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <input type="text" placeholder="Search by title, author or publisher..." value={bookSearch} onChange={e => setBookSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 16px", border: "0.5px solid #e5e4dc", borderRadius: "100px", fontSize: "13px", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" as const }} />
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9f9f7" }}>
                    {["Title & Author", "Publisher", "Category", "Status", "Queries", "Revenue", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", color: "#888780", fontWeight: "500", borderBottom: "0.5px solid #e5e4dc" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((book, i) => (
                    <tr key={book.id} style={{ borderBottom: i < filteredBooks.length - 1 ? "0.5px solid #f0efea" : "none" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>{book.title}</p>
                        <p style={{ fontSize: "11px", color: "#888780", margin: 0 }}>{book.author}</p>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <p style={{ fontSize: "13px", color: "#7F77DD", fontWeight: "500", margin: 0, cursor: "pointer" }}
                          onClick={() => { setSelectedPublisher(publishers.find(p => p.id === book.publisherId)); setActiveTab("publishers"); }}>
                          {book.publisher}
                        </p>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: "#EEEDFE", color: "#534AB7" }}>{book.category}</span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: book.status === "active" ? "#E1F5EE" : "#FAEEDA", color: book.status === "active" ? "#0F6E56" : "#854F0B" }}>{book.status}</span>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: "13px", color: "#378ADD", fontWeight: "500" }}>{book.queries.toLocaleString()}</td>
                      <td style={{ padding: "14px 20px", fontSize: "13px", color: "#1D9E75", fontWeight: "500" }}>₹{book.revenue.toLocaleString()}</td>
                      <td style={{ padding: "14px 20px" }}>
                        <button onClick={() => handleRemoveBook(book.id)} style={{ background: "#FCEBEB", color: "#A32D2D", border: "none", borderRadius: "100px", padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INSTITUTIONS */}
        {activeTab === "institutions" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Active institutions", value: mockInstitutions.length,                                                              color: "#378ADD" },
                { label: "Total subscription",  value: `₹${(mockInstitutions.reduce((s, i) => s + i.fee, 0) / 100000).toFixed(1)}L`,        color: "#1D9E75" },
                { label: "Queries used",         value: mockInstitutions.reduce((s, i) => s + i.used, 0).toLocaleString(),                   color: "#7F77DD" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{stat.label}</p>
                  <p style={{ fontSize: "28px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>{stat.value}</p>
                </div>
              ))}
            </div>
            {mockInstitutions.map((inst, i) => {
              const usedPct = Math.round((inst.used / inst.total) * 100);
              const alertColor = usedPct >= 95 ? "#E24B4A" : usedPct >= 80 ? "#EF9F27" : "#1D9E75";
              return (
                <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                    <div>
                      <p style={{ fontSize: "15px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 6px" }}>{inst.name}</p>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "100px", background: "#E6F1FB", color: "#185FA5" }}>{inst.plan}</span>
                        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "100px", background: "#f0efea", color: "#888780", fontFamily: "monospace" }}>{inst.code}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <p style={{ fontSize: "18px", fontFamily: "'DM Serif Display', serif", color: "#1D9E75", margin: "0 0 2px" }}>₹{inst.fee.toLocaleString()}</p>
                      <p style={{ fontSize: "11px", color: "#888780", margin: 0 }}>Expires {inst.expiry}</p>
                    </div>
                  </div>
                  <div style={{ height: "6px", background: "#f0efea", borderRadius: "100px", marginBottom: "8px" }}>
                    <div style={{ height: "6px", borderRadius: "100px", background: alertColor, width: `${usedPct}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>Used: <strong>{inst.used.toLocaleString()}</strong></p>
                    <p style={{ fontSize: "12px", color: alertColor, margin: 0, fontWeight: "500" }}>{usedPct}% used</p>
                    <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>Total: <strong>{inst.total.toLocaleString()}</strong></p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LIVE QUERIES */}
        {activeTab === "queries" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Queries today", value: mockStats.queriesToday.toLocaleString(), color: "#378ADD" },
                { label: "Total queries", value: mockStats.totalQueries.toLocaleString(),  color: "#7F77DD" },
                { label: "Success rate",  value: "98.2%",                                  color: "#1D9E75" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{stat.label}</p>
                  <p style={{ fontSize: "28px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "0.5px solid #e5e4dc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Live query feed</p>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#1D9E75" }} />
                  <p style={{ fontSize: "12px", color: "#1D9E75", margin: 0, fontWeight: "500" }}>Live</p>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9f9f7" }}>
                    {["User", "Book", "Question", "Time", "Status"].map(h => (
                      <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", color: "#888780", fontWeight: "500", borderBottom: "0.5px solid #e5e4dc" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockQueries.map((q, i) => (
                    <tr key={q.id} style={{ borderBottom: i < mockQueries.length - 1 ? "0.5px solid #f0efea" : "none" }}>
                      <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: "500", color: "#2C2C2A" }}>{q.user}</td>
                      <td style={{ padding: "14px 20px", fontSize: "13px", color: "#888780" }}>{q.book}</td>
                      <td style={{ padding: "14px 20px", fontSize: "13px", color: "#2C2C2A", maxWidth: "280px" }}>
                        <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{q.question}</p>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: "12px", color: "#888780", whiteSpace: "nowrap" as const }}>{q.time}</td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: q.status === "success" ? "#E1F5EE" : "#FCEBEB", color: q.status === "success" ? "#0F6E56" : "#A32D2D" }}>
                          {q.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REVENUE */}
        {activeTab === "revenue" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Gross revenue",     value: `₹${mockStats.totalRevenue.toLocaleString()}`,     color: "#378ADD" },
                { label: "Publisher payouts", value: `₹${mockStats.publisherPayouts.toLocaleString()}`, color: "#7F77DD" },
                { label: "Platform revenue",  value: `₹${mockStats.platformRevenue.toLocaleString()}`,  color: "#1D9E75" },
                { label: "Margin",            value: "50%",                                              color: "#EF9F27" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{stat.label}</p>
                  <p style={{ fontSize: "24px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
              <div style={{ padding: "20px 24px", borderBottom: "0.5px solid #e5e4dc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Pending payouts — May 1, 2026</p>
                <p style={{ fontSize: "13px", color: "#1D9E75", fontWeight: "500", margin: 0 }}>Total: ₹{mockPayouts.reduce((s, p) => s + p.amount, 0).toLocaleString()}</p>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9f9f7" }}>
                    {["Publisher", "Book", "Queries", "Amount", "Month", "Action"].map(h => (
                      <th key={h} style={{ padding: "12px 24px", textAlign: "left", fontSize: "11px", color: "#888780", fontWeight: "500", borderBottom: "0.5px solid #e5e4dc" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockPayouts.map((payout, i) => (
                    <tr key={i} style={{ borderBottom: i < mockPayouts.length - 1 ? "0.5px solid #f0efea" : "none" }}>
                      <td style={{ padding: "14px 24px", fontSize: "13px", fontWeight: "500", color: "#2C2C2A" }}>{payout.publisher}</td>
                      <td style={{ padding: "14px 24px", fontSize: "13px", color: "#888780" }}>{payout.book}</td>
                      <td style={{ padding: "14px 24px", fontSize: "13px", color: "#378ADD", fontWeight: "500" }}>{payout.queries.toLocaleString()}</td>
                      <td style={{ padding: "14px 24px", fontSize: "13px", color: "#1D9E75", fontWeight: "500" }}>₹{payout.amount.toLocaleString()}</td>
                      <td style={{ padding: "14px 24px", fontSize: "13px", color: "#888780" }}>{payout.month}</td>
                      <td style={{ padding: "14px 24px" }}>
                        <button style={{ background: "#1D9E75", color: "white", border: "none", borderRadius: "100px", padding: "5px 14px", fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                          Mark paid
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>Institution subscription revenue</p>
              {mockInstitutions.map((inst, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: i < mockInstitutions.length - 1 ? "0.5px solid #f0efea" : "none" }}>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 2px" }}>{inst.name}</p>
                    <p style={{ fontSize: "11px", color: "#888780", margin: 0 }}>{inst.plan} · {inst.code}</p>
                  </div>
                  <p style={{ fontSize: "15px", fontFamily: "'DM Serif Display', serif", color: "#1D9E75", margin: 0 }}>₹{inst.fee.toLocaleString()}</p>
                </div>
              ))}
              <div style={{ borderTop: "1px solid #e5e4dc", marginTop: "12px", paddingTop: "12px", display: "flex", justifyContent: "space-between" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Total</p>
                <p style={{ fontSize: "18px", fontFamily: "'DM Serif Display', serif", color: "#1D9E75", margin: 0 }}>₹{mockInstitutions.reduce((s, i) => s + i.fee, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ADD USER MODAL */}
      {showAddUser && (
        <div style={modalOverlay}>
          <div style={{ background: "white", borderRadius: "20px", padding: "32px", width: "460px", maxWidth: "90vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
              <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Add user</p>
              <button onClick={() => setShowAddUser(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888780" }}>×</button>
            </div>

            {[
              { label: "Full name", key: "name",  placeholder: "User full name"   },
              { label: "Email",     key: "email", placeholder: "user@email.com"   },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>{field.label}</label>
                <input type="text" placeholder={field.placeholder} value={(addUserForm as any)[field.key]}
                  onChange={e => setAddUserForm(f => ({ ...f, [field.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Role</label>
              <select value={addUserForm.role} onChange={e => setAddUserForm(f => ({ ...f, role: e.target.value }))} style={inputStyle}>
                {roles.map(r => <option key={r} value={r} style={{ textTransform: "capitalize" }}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>

            {addUserForm.role === "institution" && (
              <>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Institution name</label>
                  <input type="text" placeholder="e.g. Anna University" value={addUserForm.institution}
                    onChange={e => setAddUserForm(f => ({ ...f, institution: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Subscription plan</label>
                  <select value={addUserForm.plan} onChange={e => setAddUserForm(f => ({ ...f, plan: e.target.value }))} style={inputStyle}>
                    {plans.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </>
            )}

            <div style={{ background: "#E6F1FB", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", color: "#185FA5", margin: 0 }}>
                ℹ️ An invitation email will be sent to the user with login instructions.
              </p>
            </div>

            <button onClick={handleAddUser} disabled={!addUserForm.name || !addUserForm.email} style={{
              width: "100%", background: addUserForm.name && addUserForm.email ? "#2C2C2A" : "#B4B2A9",
              color: "white", border: "none", borderRadius: "100px", padding: "12px",
              fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              Create account →
            </button>
          </div>
        </div>
      )}

      {/* ADD PUBLISHER MODAL */}
      {showAddPublisher && (
        <div style={modalOverlay}>
          <div style={{ background: "white", borderRadius: "20px", padding: "32px", width: "460px", maxWidth: "90vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
              <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Add publisher</p>
              <button onClick={() => setShowAddPublisher(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888780" }}>×</button>
            </div>

            {[
              { label: "Publisher / Author name", key: "name",  placeholder: "Full name or publishing house" },
              { label: "Email",                   key: "email", placeholder: "publisher@email.com"           },
              { label: "Phone",                   key: "phone", placeholder: "10 digit mobile"               },
              { label: "PAN number",              key: "pan",   placeholder: "For TDS compliance"            },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>{field.label}</label>
                <input type="text" placeholder={field.placeholder} value={(addPublisherForm as any)[field.key]}
                  onChange={e => setAddPublisherForm(f => ({ ...f, [field.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Publisher type</label>
              <select value={addPublisherForm.type} onChange={e => setAddPublisherForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                {publisherTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ background: "#EEEDFE", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", color: "#534AB7", margin: 0 }}>
                💜 Publisher will receive an email with login details and instructions to complete their profile and upload books.
              </p>
            </div>

            <button onClick={handleAddPublisher} disabled={!addPublisherForm.name || !addPublisherForm.email} style={{
              width: "100%", background: addPublisherForm.name && addPublisherForm.email ? "#7F77DD" : "#C8C5F0",
              color: "white", border: "none", borderRadius: "100px", padding: "12px",
              fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              Create publisher account →
            </button>
          </div>
        </div>
      )}

      {/* ADD BOOK MODAL */}
      {showAddBook && (
        <div style={modalOverlay}>
          <div style={{ background: "white", borderRadius: "20px", padding: "32px", width: "500px", maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
              <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Add book</p>
              <button onClick={() => setShowAddBook(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888780" }}>×</button>
            </div>

            {[
              { label: "Book title",    key: "title",     placeholder: "Enter full book title"   },
              { label: "Author name",   key: "author",    placeholder: "Author full name"         },
              { label: "Publisher",     key: "publisher", placeholder: "Publisher name"           },
              { label: "ISBN",          key: "isbn",      placeholder: "ISBN (optional)"          },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>{field.label}</label>
                <input type="text" placeholder={field.placeholder} value={(addBookForm as any)[field.key]}
                  onChange={e => setAddBookForm(f => ({ ...f, [field.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Category</label>
              <select value={addBookForm.category} onChange={e => setAddBookForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>PDF file</label>
              <div onClick={() => document.getElementById("adminBookFile")?.click()} style={{ border: "1.5px dashed #e5e4dc", borderRadius: "10px", padding: "24px", textAlign: "center" as const, cursor: "pointer", background: addBookForm.file ? "#E1F5EE" : "#f9f9f7" }}>
                <input id="adminBookFile" type="file" accept=".pdf,.epub" style={{ display: "none" }}
                  onChange={e => setAddBookForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
                {addBookForm.file
                  ? <p style={{ fontSize: "13px", color: "#1D9E75", margin: 0 }}>✓ {addBookForm.file.name}</p>
                  : <><p style={{ fontSize: "13px", color: "#888780", margin: "0 0 4px" }}>Click to select PDF or EPUB</p><p style={{ fontSize: "11px", color: "#B4B2A9", margin: 0 }}>Max 50MB</p></>
                }
              </div>
            </div>

            <div style={{ background: "#E1F5EE", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", color: "#0F6E56", margin: 0 }}>
                ✓ Book will go through content moderation and be ingested automatically.
                It will be live and queryable within minutes.
              </p>
            </div>

            <button
              onClick={() => {
                if (!addBookForm.title || !addBookForm.author || !addBookForm.file) return;
                setBooks(prev => [...prev, {
                  id:          String(prev.length + 1),
                  title:       addBookForm.title,
                  author:      addBookForm.author,
                  publisher:   addBookForm.publisher || "Admin",
                  publisherId: "1",
                  category:    addBookForm.category,
                  status:      "processing",
                  queries:     0,
                  revenue:     0,
                  uploaded:    new Date().toISOString().split("T")[0],
                }]);
                setShowAddBook(false);
                setAddBookForm({ title: "", author: "", publisher: "", category: "Business", isbn: "", file: null });
                alert(`✅ "${addBookForm.title}" submitted for ingestion. It will be live within minutes.`);
              }}
              disabled={!addBookForm.title || !addBookForm.author || !addBookForm.file}
              style={{
                width: "100%",
                background: addBookForm.title && addBookForm.author && addBookForm.file ? "#1D9E75" : "#9FE1CB",
                color: "white", border: "none", borderRadius: "100px", padding: "12px",
                fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Upload and ingest book →
            </button>
          </div>
        </div>
      )}
{/* ADD INSTITUTION MODAL */}
{showAddInstitution && (
  <div style={modalOverlay}>
    <div style={{ background: "white", borderRadius: "20px", padding: "32px", width: "480px", maxWidth: "90vw" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
        <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Add institution</p>
        <button onClick={() => setShowAddInstitution(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888780" }}>×</button>
      </div>

      {[
        { label: "Institution name",  key: "name",    placeholder: "e.g. Anna University"        },
        { label: "Contact email",     key: "email",   placeholder: "librarian@institution.edu"   },
        { label: "Contact phone",     key: "phone",   placeholder: "10 digit mobile number"      },
        { label: "Address",           key: "address", placeholder: "Institution address"          },
      ].map(field => (
        <div key={field.key} style={{ marginBottom: "14px" }}>
          <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>{field.label}</label>
          <input
            type="text" placeholder={field.placeholder}
            value={(addInstitutionForm as any)[field.key]}
            onChange={e => setAddInstitutionForm(f => ({ ...f, [field.key]: e.target.value }))}
            style={inputStyle}
          />
        </div>
      ))}

      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Subscription plan</label>
        <select
          value={addInstitutionForm.plan}
          onChange={e => setAddInstitutionForm(f => ({ ...f, plan: e.target.value }))}
          style={inputStyle}
        >
          {plans.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div style={{ background: "#E6F1FB", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
        <p style={{ fontSize: "12px", color: "#185FA5", margin: 0 }}>
          ℹ️ A unique college code will be auto-generated for this institution.
          Login credentials will be sent to the contact email.
        </p>
      </div>

      <button
        onClick={() => {
          if (!addInstitutionForm.name || !addInstitutionForm.email) return;
          const code = addInstitutionForm.name
            .toUpperCase()
            .replace(/[^A-Z]/g, "")
            .slice(0, 8) + "26";
          const planFee: any = {
            "Starter — ₹2,00,000":   { fee: 200000,  total: 200000  },
            "Standard — ₹5,00,000":  { fee: 500000,  total: 550000  },
            "Premium — ₹10,00,000":  { fee: 1000000, total: 1200000 },
            "Enterprise — ₹25,00,000":{ fee: 2500000, total: 3200000 },
          };
          const planData = planFee[addInstitutionForm.plan] || planFee["Starter — ₹2,00,000"];
          setInstitutions(prev => [...prev, {
            id:     String(prev.length + 1),
            name:   addInstitutionForm.name,
            code,
            plan:   addInstitutionForm.plan.split(" — ")[0],
            fee:    planData.fee,
            used:   0,
            total:  planData.total,
            expiry: `${new Date().getFullYear() + 1}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
            status: "active",
          }]);
          setShowAddInstitution(false);
          setAddInstitutionForm({ name: "", email: "", phone: "", address: "", plan: "Starter — ₹2,00,000" });
          alert(`✅ Institution "${addInstitutionForm.name}" created!\nCollege code: ${code}\nLogin credentials sent to ${addInstitutionForm.email}`);
        }}
        disabled={!addInstitutionForm.name || !addInstitutionForm.email}
        style={{
          width: "100%",
          background: addInstitutionForm.name && addInstitutionForm.email ? "#378ADD" : "#A8D4F5",
          color: "white", border: "none", borderRadius: "100px", padding: "12px",
          fontSize: "14px", fontWeight: "500", cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Create institution account →
      </button>
    </div>
  </div>
)}
    </div>
  );
}
