import { useState, useEffect } from "react";
import { useRouter } from "next/router";

const ADMIN_PASSWORD = "firstchapter@admin2026";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_HEADERS = { "Content-Type": "application/json", "x-admin-secret": ADMIN_PASSWORD };

const categories = ["Business","Economics","Philosophy","Science","Technology","History","Medicine","Law","Management","Self Development","Psychology","Politics","Education","Writing","Mathematics","Strategy","Leadership","Communication"];

export default function AdminDashboard() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPublisher, setSelectedPublisher] = useState<any>(null);

  // Real data state
  const [users, setUsers] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);

  // Filters
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [bookSearch, setBookSearch] = useState("");

  // Add book modal
  const [showAddBook, setShowAddBook] = useState(false);
  const [addBookForm, setAddBookForm] = useState({ title: "", author: "", category: "Philosophy", url: "", publisher: "Admin" });
  const [addingBook, setAddingBook] = useState(false);
  const [addBookStatus, setAddBookStatus] = useState("");

  // Add user modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ firstName: "", lastName: "", email: "", role: "reader" });
  const [addingUser, setAddingUser] = useState(false);

  // Fetch users from real API
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, { headers: ADMIN_HEADERS });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error("Failed to fetch users:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch books from real API
  const fetchBooks = async () => {
    setLoadingBooks(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/books`, { headers: ADMIN_HEADERS });
      const data = await res.json();
      setBooks(data.books || []);
    } catch (e) {
      console.error("Failed to fetch books:", e);
    } finally {
      setLoadingBooks(false);
    }
  };

  // Delete book
  const handleDeleteBook = async (bookId: string, title: string) => {
    if (!confirm(`Remove "${title}"? This will delete it from Qdrant and Supabase.`)) return;
    try {
      await fetch(`${API_URL}/api/admin/books/${bookId}`, { method: "DELETE", headers: ADMIN_HEADERS });
      setBooks(prev => prev.filter(b => b.id !== bookId));
      alert(`✅ "${title}" removed successfully.`);
    } catch (e) {
      alert("Failed to delete book. Try again.");
    }
  };

  // Suspend / unsuspend user
  const handleSuspendUser = async (userId: string, currentStatus: string) => {
    const endpoint = currentStatus === "active" ? "suspend" : "unsuspend";
    try {
      await fetch(`${API_URL}/api/admin/users/${userId}/${endpoint}`, { method: "POST", headers: ADMIN_HEADERS });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: currentStatus === "active" ? "suspended" : "active" } : u));
    } catch (e) {
      alert("Failed to update user. Try again.");
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await fetch(`${API_URL}/api/admin/users/${userId}`, { method: "DELETE", headers: ADMIN_HEADERS });
      setUsers(prev => prev.filter(u => u.id !== userId));
      alert(`✅ User "${name}" deleted.`);
    } catch (e) {
      alert("Failed to delete user.");
    }
  };

  // Add book via URL ingestion
  const handleAddBook = async () => {
    if (!addBookForm.title || !addBookForm.author || !addBookForm.url) return;
    setAddingBook(true);
    setAddBookStatus("Downloading and ingesting book...");
    try {
      const res = await fetch(`${API_URL}/api/admin/books/ingest`, {
        method: "POST",
        headers: ADMIN_HEADERS,
        body: JSON.stringify(addBookForm),
      });
      const data = await res.json();
      if (data.success) {
        setAddBookStatus(`✅ Success! ${data.chunks} chunks stored.`);
        setTimeout(() => {
          setShowAddBook(false);
          setAddBookForm({ title: "", author: "", category: "Philosophy", url: "", publisher: "Admin" });
          setAddBookStatus("");
          fetchBooks();
        }, 2000);
      } else {
        setAddBookStatus(`❌ Failed: ${data.detail}`);
      }
    } catch (e) {
      setAddBookStatus("❌ Error ingesting book. Check the URL.");
    } finally {
      setAddingBook(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (!authenticated) return;
    if (activeTab === "users" || activeTab === "overview") fetchUsers();
    if (activeTab === "books" || activeTab === "overview") fetchBooks();
  }, [activeTab, authenticated]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) { setAuthenticated(true); setPasswordError(false); }
    else setPasswordError(true);
  };

  const filteredUsers = users
    .filter(u => userFilter === "all" || u.role === userFilter)
    .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));

  const filteredBooks = books.filter(b =>
    b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
    b.author?.toLowerCase().includes(bookSearch.toLowerCase()) ||
    b.category?.toLowerCase().includes(bookSearch.toLowerCase())
  );

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

  // ── Password Gate ─────────────────────────────────────────────────────────────
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
              {passwordError && <p style={{ fontSize: "12px", color: "#E24B4A", margin: "6px 0 0" }}>Incorrect password.</p>}
            </div>
            <button onClick={handleLogin} style={{ width: "100%", background: "#2C2C2A", color: "white", border: "none", borderRadius: "100px", padding: "13px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Access admin dashboard →
            </button>
            <button onClick={() => router.push("/")} style={{ width: "100%", background: "none", border: "none", color: "#888780", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: "12px" }}>
              ← Back to platform
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin Dashboard ───────────────────────────────────────────────────────────
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
              border: "none", borderRadius: "8px", textAlign: "left" as const,
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

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "26px", color: "#2C2C2A", margin: 0 }}>
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
            <p style={{ fontSize: "13px", color: "#888780", margin: "4px 0 0" }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {activeTab === "users" && (
              <button onClick={() => setShowAddUser(true)} style={{ background: "#2C2C2A", color: "white", border: "none", borderRadius: "100px", padding: "10px 20px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                + Add user
              </button>
            )}
            {activeTab === "books" && (
              <button onClick={() => setShowAddBook(true)} style={{ background: "#1D9E75", color: "white", border: "none", borderRadius: "100px", padding: "10px 20px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                + Add book
              </button>
            )}
          </div>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Total users",   value: loadingUsers ? "..." : users.length.toLocaleString(),  color: "#2C2C2A" },
                { label: "Total books",   value: loadingBooks ? "..." : books.length.toLocaleString(),  color: "#7F77DD" },
                { label: "Queries today", value: "—",                                                    color: "#378ADD" },
                { label: "Platform revenue", value: "—",                                                 color: "#1D9E75" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{stat.label}</p>
                  <p style={{ fontSize: "28px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>User breakdown</p>
                {loadingUsers ? <p style={{ fontSize: "13px", color: "#888780" }}>Loading...</p> : (
                  [
                    { label: "Readers",      value: users.filter(u => u.role === "reader" || !u.role).length,      color: "#1D9E75" },
                    { label: "Publishers",   value: users.filter(u => u.role === "publisher").length,    color: "#7F77DD" },
                    { label: "Institutions", value: users.filter(u => u.role === "institution").length,  color: "#378ADD" },
                  ].map((item, i) => (
                    <div key={i} style={{ marginBottom: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <p style={{ fontSize: "13px", color: "#2C2C2A", margin: 0 }}>{item.label}</p>
                        <p style={{ fontSize: "13px", color: item.color, fontWeight: "500", margin: 0 }}>{item.value}</p>
                      </div>
                      <div style={{ height: "6px", background: "#f0efea", borderRadius: "100px" }}>
                        <div style={{ height: "6px", borderRadius: "100px", background: item.color, width: `${users.length ? (item.value / users.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>Book categories</p>
                {loadingBooks ? <p style={{ fontSize: "13px", color: "#888780" }}>Loading...</p> : (
                  Object.entries(
                    books.reduce((acc: any, b) => { acc[b.category] = (acc[b.category] || 0) + 1; return acc; }, {})
                  ).sort(([,a]: any, [,b]: any) => b - a).slice(0, 6).map(([cat, count]: any, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid #f0efea" }}>
                      <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>{cat}</p>
                      <p style={{ fontSize: "13px", color: "#2C2C2A", fontWeight: "500", margin: 0 }}>{count} books</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* USERS */}
        {activeTab === "users" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Total users",   value: users.length,                                              color: "#2C2C2A" },
                { label: "Readers",       value: users.filter(u => u.role === "reader" || !u.role).length,  color: "#1D9E75" },
                { label: "Publishers",    value: users.filter(u => u.role === "publisher").length,           color: "#7F77DD" },
                { label: "Institutions",  value: users.filter(u => u.role === "institution").length,         color: "#378ADD" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{stat.label}</p>
                  <p style={{ fontSize: "28px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>
                    {loadingUsers ? "..." : stat.value}
                  </p>
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
              <button onClick={fetchUsers} style={{ padding: "8px 16px", borderRadius: "100px", border: "0.5px solid #e5e4dc", background: "white", color: "#5F5E5A", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                ↻ Refresh
              </button>
            </div>

            {loadingUsers ? (
              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "48px", textAlign: "center" as const }}>
                <p style={{ fontSize: "14px", color: "#888780" }}>Loading users from Clerk...</p>
              </div>
            ) : (
              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9f9f7" }}>
                      {["User", "Role", "Joined", "Status", "Actions"].map(h => (
                        <th key={h} style={{ padding: "12px 20px", textAlign: "left" as const, fontSize: "11px", color: "#888780", fontWeight: "500", borderBottom: "0.5px solid #e5e4dc" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, i) => {
                      const rc = roleColor(user.status === "suspended" ? "suspended" : user.role || "reader");
                      return (
                        <tr key={user.id} style={{ borderBottom: i < filteredUsers.length - 1 ? "0.5px solid #f0efea" : "none" }}>
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: rc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "500", color: rc.color }}>
                                {user.name?.[0] || "?"}
                              </div>
                              <div>
                                <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>{user.name || "Unknown"}</p>
                                <p style={{ fontSize: "11px", color: "#888780", margin: 0 }}>{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: rc.bg, color: rc.color, textTransform: "capitalize" as const }}>
                              {user.role || "reader"}
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: "13px", color: "#888780" }}>
                            {user.joined ? new Date(user.joined).toLocaleDateString("en-IN") : "—"}
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: user.status === "active" ? "#E1F5EE" : "#FCEBEB", color: user.status === "active" ? "#0F6E56" : "#A32D2D" }}>
                              {user.status}
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button onClick={() => handleSuspendUser(user.id, user.status)} style={{
                                background: user.status === "active" ? "#FAEEDA" : "#E1F5EE",
                                color: user.status === "active" ? "#854F0B" : "#0F6E56",
                                border: "none", borderRadius: "100px", padding: "4px 10px",
                                fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                              }}>
                                {user.status === "active" ? "Suspend" : "Reactivate"}
                              </button>
                              <button onClick={() => handleDeleteUser(user.id, user.name)} style={{
                                background: "#FCEBEB", color: "#A32D2D",
                                border: "none", borderRadius: "100px", padding: "4px 10px",
                                fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                              }}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center" as const, fontSize: "13px", color: "#888780" }}>No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* BOOKS */}
        {activeTab === "books" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Total books",   value: books.length,                                   color: "#7F77DD" },
                { label: "Active books",  value: books.filter(b => b.status === "active").length, color: "#1D9E75" },
                { label: "Categories",    value: new Set(books.map(b => b.category)).size,        color: "#378ADD" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{stat.label}</p>
                  <p style={{ fontSize: "28px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>
                    {loadingBooks ? "..." : stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <input type="text" placeholder="Search by title, author or category..." value={bookSearch} onChange={e => setBookSearch(e.target.value)}
                style={{ flex: 1, padding: "10px 16px", border: "0.5px solid #e5e4dc", borderRadius: "100px", fontSize: "13px", outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
              <button onClick={fetchBooks} style={{ padding: "8px 16px", borderRadius: "100px", border: "0.5px solid #e5e4dc", background: "white", color: "#5F5E5A", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                ↻ Refresh
              </button>
            </div>

            {loadingBooks ? (
              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "48px", textAlign: "center" as const }}>
                <p style={{ fontSize: "14px", color: "#888780" }}>Loading books from Supabase...</p>
              </div>
            ) : (
              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9f9f7" }}>
                      {["Title & Author", "Category", "Status", "Uploaded", "Actions"].map(h => (
                        <th key={h} style={{ padding: "12px 20px", textAlign: "left" as const, fontSize: "11px", color: "#888780", fontWeight: "500", borderBottom: "0.5px solid #e5e4dc" }}>{h}</th>
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
                          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: "#EEEDFE", color: "#534AB7" }}>{book.category}</span>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: book.status === "active" ? "#E1F5EE" : "#FAEEDA", color: book.status === "active" ? "#0F6E56" : "#854F0B" }}>
                            {book.status}
                          </span>
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: "13px", color: "#888780" }}>
                          {book.created_at ? new Date(book.created_at).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <button onClick={() => handleDeleteBook(book.id, book.title)} style={{
                            background: "#FCEBEB", color: "#A32D2D", border: "none",
                            borderRadius: "100px", padding: "4px 12px",
                            fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                          }}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredBooks.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center" as const, fontSize: "13px", color: "#888780" }}>No books found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
{/* PUBLISHERS */}
{activeTab === "publishers" && (
  <div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
      {[
        { label: "Total publishers", value: users.filter(u => u.role === "publisher").length, color: "#7F77DD" },
        { label: "Total books",      value: books.length,                                      color: "#1D9E75" },
        { label: "Pending payouts",  value: "—",                                               color: "#EF9F27" },
      ].map((stat, i) => (
        <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px" }}>
          <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{stat.label}</p>
          <p style={{ fontSize: "28px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>{stat.value}</p>
        </div>
      ))}
    </div>

    <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "20px 24px", borderBottom: "0.5px solid #e5e4dc" }}>
        <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>All publishers</p>
      </div>
      {loadingUsers ? (
        <div style={{ padding: "48px", textAlign: "center" as const }}>
          <p style={{ fontSize: "13px", color: "#888780" }}>Loading...</p>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9f9f7" }}>
              {["Publisher", "Email", "Joined", "Books", "Status", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 20px", textAlign: "left" as const, fontSize: "11px", color: "#888780", fontWeight: "500", borderBottom: "0.5px solid #e5e4dc" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.filter(u => u.role === "publisher").map((pub, i) => {
              const pubBooks = books.filter(b => b.uploaded_by === pub.id);
              return (
                <tr key={pub.id} style={{ borderBottom: "0.5px solid #f0efea" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "500", color: "#534AB7" }}>
                        {pub.name?.[0] || "?"}
                      </div>
                      <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>{pub.name}</p>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "#888780" }}>{pub.email}</td>
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "#888780" }}>
                    {pub.joined ? new Date(pub.joined).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "#7F77DD", fontWeight: "500" }}>{pubBooks.length}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: "#E1F5EE", color: "#0F6E56" }}>
                      {pub.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => handleSuspendUser(pub.id, pub.status)} style={{
                        background: "#FAEEDA", color: "#854F0B",
                        border: "none", borderRadius: "100px", padding: "4px 10px",
                        fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}>
                        Suspend
                      </button>
                      <button onClick={() => handleDeleteUser(pub.id, pub.name)} style={{
                        background: "#FCEBEB", color: "#A32D2D",
                        border: "none", borderRadius: "100px", padding: "4px 10px",
                        fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.filter(u => u.role === "publisher").length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "48px", textAlign: "center" as const, fontSize: "13px", color: "#888780" }}>
                  No publishers yet. Publishers will appear here after they sign up.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  </div>
)}

        {/* INSTITUTIONS */}
        {activeTab === "institutions" && (
          <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "48px", textAlign: "center" as const }}>
            <p style={{ fontSize: "32px", margin: "0 0 16px" }}>🏛️</p>
            <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 8px" }}>Institutions coming soon</p>
            <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>Institution management will be available once the first institution signs up.</p>
          </div>
        )}

        {/* LIVE QUERIES */}
        {activeTab === "queries" && (
          <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "48px", textAlign: "center" as const }}>
            <p style={{ fontSize: "32px", margin: "0 0 16px" }}>⚡</p>
            <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 8px" }}>Live query tracking coming soon</p>
            <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>Real-time query feed will appear here once query logging is enabled.</p>
          </div>
        )}

        {/* REVENUE */}
        {activeTab === "revenue" && (
          <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "48px", textAlign: "center" as const }}>
            <p style={{ fontSize: "32px", margin: "0 0 16px" }}>💰</p>
            <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 8px" }}>Revenue dashboard coming soon</p>
            <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>Revenue tracking will appear here once payment integration is live.</p>
          </div>
        )}

      </main>

      {/* ADD BOOK MODAL */}
      {showAddBook && (
        <div style={modalOverlay}>
          <div style={{ background: "white", borderRadius: "20px", padding: "32px", width: "500px", maxWidth: "90vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
              <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Add book</p>
              <button onClick={() => { setShowAddBook(false); setAddBookStatus(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888780" }}>×</button>
            </div>

            {[
              { label: "Book title",  key: "title",     placeholder: "Full book title"        },
              { label: "Author",      key: "author",    placeholder: "Author name"             },
              { label: "Publisher",   key: "publisher", placeholder: "Publisher or your name"  },
              { label: "Gutenberg or direct text URL", key: "url", placeholder: "https://www.gutenberg.org/cache/epub/..." },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>{field.label}</label>
                <input type="text" placeholder={field.placeholder} value={(addBookForm as any)[field.key]}
                  onChange={e => setAddBookForm(f => ({ ...f, [field.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Category</label>
              <select value={addBookForm.category} onChange={e => setAddBookForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {addBookStatus && (
              <div style={{ background: addBookStatus.startsWith("✅") ? "#E1F5EE" : addBookStatus.startsWith("❌") ? "#FCEBEB" : "#E6F1FB", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}>
                <p style={{ fontSize: "13px", color: addBookStatus.startsWith("✅") ? "#0F6E56" : addBookStatus.startsWith("❌") ? "#A32D2D" : "#185FA5", margin: 0 }}>
                  {addBookStatus}
                </p>
              </div>
            )}

            <button onClick={handleAddBook} disabled={addingBook || !addBookForm.title || !addBookForm.url} style={{
              width: "100%",
              background: addingBook || !addBookForm.title || !addBookForm.url ? "#9FE1CB" : "#1D9E75",
              color: "white", border: "none", borderRadius: "100px", padding: "12px",
              fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              {addingBook ? "Ingesting... this takes 2-5 minutes" : "Ingest book →"}
            </button>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddUser && (
        <div style={modalOverlay}>
          <div style={{ background: "white", borderRadius: "20px", padding: "32px", width: "460px", maxWidth: "90vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
              <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Add user</p>
              <button onClick={() => setShowAddUser(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888780" }}>×</button>
            </div>
            <div style={{ background: "#E6F1FB", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", color: "#185FA5", margin: 0 }}>
                ℹ️ To add users, please use the Clerk dashboard at dashboard.clerk.com → Users → Create user. This gives you full control over the account setup.
              </p>
            </div>
            <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", background: "#2C2C2A", color: "white", border: "none", borderRadius: "100px", padding: "12px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "center" as const, textDecoration: "none" }}>
              Open Clerk Dashboard →
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
