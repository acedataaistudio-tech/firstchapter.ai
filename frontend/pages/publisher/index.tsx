import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";

const mockBooks = [
  {
    id: "1",
    title: "The Art of Selling",
    author: "John Maxwell",
    category: "Business",
    status: "active",
    queries: 1240,
    revenue: 620,
    chapters: 12,
    pages: 280,
    uploaded: "2026-03-01",
    rightsExpiry: "2031-03-01",
    isbn: "978-0-00-000001-1",
    topChapters: [
      { chapter: "Chapter 3 — The Psychology of Selling", queries: 312 },
      { chapter: "Chapter 7 — Closing Techniques",        queries: 287 },
      { chapter: "Chapter 1 — Introduction",              queries: 198 },
    ],
  },
  {
    id: "2",
    title: "Modern Economics",
    author: "Sarah Chen",
    category: "Economics",
    status: "active",
    queries: 890,
    revenue: 445,
    chapters: 18,
    pages: 420,
    uploaded: "2026-03-15",
    rightsExpiry: "2031-03-15",
    isbn: "978-0-00-000002-2",
    topChapters: [
      { chapter: "Chapter 5 — Market Dynamics",   queries: 234 },
      { chapter: "Chapter 11 — Monetary Policy",  queries: 198 },
      { chapter: "Chapter 2 — Supply and Demand", queries: 176 },
    ],
  },
  {
    id: "3",
    title: "Leadership Principles",
    author: "David Park",
    category: "Management",
    status: "processing",
    queries: 0,
    revenue: 0,
    chapters: 0,
    pages: 0,
    uploaded: "2026-04-20",
    rightsExpiry: "2031-04-20",
    isbn: "",
    topChapters: [],
  },
];

const payoutHistory = [
  { month: "March 2026",    queries: 890, amount: 445, status: "paid", date: "2026-04-01" },
  { month: "February 2026", queries: 760, amount: 380, status: "paid", date: "2026-03-01" },
  { month: "January 2026",  queries: 590, amount: 295, status: "paid", date: "2026-02-01" },
];

const categories = [
  "Business","Economics","Philosophy","Science","Technology",
  "History","Medicine","Law","Management","Self Development",
];

export default function PublisherDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab]           = useState("overview");
  const [showUpload, setShowUpload]         = useState(false);
  const [showAgreement, setShowAgreement]   = useState(false);
  const [showBookDetail, setShowBookDetail] = useState<any>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<any>(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [books, setBooks]                   = useState(mockBooks);
  const [uploadForm, setUploadForm]         = useState({
    title: "", author: "", category: "Business",
    isbn: "", description: "", file: null as File | null,
  });

  if (!isLoaded) return null;

  const totalQueries = books.reduce((s, b) => s + b.queries, 0);
  const totalRevenue = books.reduce((s, b) => s + b.revenue, 0);
  const activeBooks  = books.filter(b => b.status === "active").length;
  const pendingPayout = 620;

const handleUpload = async () => {
    if (!uploadForm.title || !uploadForm.author || !uploadForm.file) return;
    if (!agreementAccepted) { setShowAgreement(true); return; }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file",        uploadForm.file);
      formData.append("title",       uploadForm.title);
      formData.append("author",      uploadForm.author);
      formData.append("category",    uploadForm.category);
      formData.append("isbn",        uploadForm.isbn);
      formData.append("description", uploadForm.description);

      const response = await fetch("http://localhost:8000/api/books/upload", {
        method:  "POST",
        headers: { "x-user-id": user?.id || "anonymous" },
        body:    formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Content moderation failed
        if (response.status === 422) {
          alert(`❌ Book rejected\n\nReason: ${data.detail?.reason || "Content policy violation"}\n\nPlease review your content and try again.`);
        } else {
          alert(`Upload failed: ${data.detail || "Unknown error"}`);
        }
        return;
      }

      // Success — add to books list as active
      const uploadDate = new Date();
      const expiryDate = new Date(uploadDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + 5);

      setBooks(prev => [...prev, {
        id:           data.book_id,
        title:        uploadForm.title,
        author:       uploadForm.author,
        category:     uploadForm.category,
        status:       "active",  // Real status from backend
        queries:      0,
        revenue:      0,
        chapters:     0,
        pages:        data.pages || 0,
        uploaded:     uploadDate.toISOString().split("T")[0],
        rightsExpiry: expiryDate.toISOString().split("T")[0],
        isbn:         uploadForm.isbn,
        topChapters:  [],
      }]);

      setShowUpload(false);
      setUploadForm({ title: "", author: "", category: "Business", isbn: "", description: "", file: null });
      alert(`✅ "${uploadForm.title}" uploaded successfully!\n\n${data.chunks} chunks indexed.\nBook is now live and queryable by students.`);

    } catch (e: any) {
      alert(`Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
};

  const handleRemoveBook = (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
    setShowRemoveConfirm(null);
  };

  const navItems = [
    { id: "overview",  label: "Overview"  },
    { id: "books",     label: "My Books"  },
    { id: "analytics", label: "Analytics" },
    { id: "revenue",   label: "Revenue"   },
    { id: "settings",  label: "Settings"  },
  ];

  const inputStyle: any = {
    width: "100%", padding: "10px 14px",
    border: "0.5px solid #e5e4dc", borderRadius: "10px",
    fontSize: "13px", outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box", background: "white",
  };

  const modalOverlay: any = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", background: "#f9f9f7" }}>

      {/* Sidebar */}
      <aside style={{ width: "220px", background: "white", borderRight: "0.5px solid #e5e4dc", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px", borderBottom: "0.5px solid #e5e4dc" }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "20px", color: "#2C2C2A", margin: 0 }}>
            First<span style={{ color: "#1D9E75" }}>chapter</span>
          </h1>
          <p style={{ fontSize: "11px", color: "#7F77DD", margin: "4px 0 0", fontWeight: "500" }}>Publisher Portal</p>
        </div>

        <nav style={{ flex: 1, padding: "12px" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
              width: "100%", padding: "10px 12px",
              background: activeTab === item.id ? "#EEEDFE" : "none",
              border: "none", borderRadius: "8px", textAlign: "left",
              fontSize: "13px",
              color: activeTab === item.id ? "#534AB7" : "#5F5E5A",
              fontWeight: activeTab === item.id ? "500" : "400",
              cursor: "pointer", marginBottom: "2px",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "16px", borderTop: "0.5px solid #e5e4dc", background: "#f9f9f7" }}>
          <p style={{ fontSize: "11px", color: "#888780", margin: "0 0 4px" }}>Pending payout</p>
          <p style={{ fontSize: "20px", fontFamily: "'DM Serif Display', serif", color: "#1D9E75", margin: "0 0 2px" }}>
            ₹{pendingPayout.toLocaleString()}
          </p>
          <p style={{ fontSize: "11px", color: "#888780", margin: 0 }}>Paid on May 1, 2026</p>
        </div>

        <div style={{ padding: "16px", borderTop: "0.5px solid #e5e4dc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: "#EEEDFE", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "12px", fontWeight: "500", color: "#534AB7",
            }}>
              {user?.firstName?.[0] || "P"}
            </div>
            <div>
              <p style={{ fontSize: "12px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>{user?.firstName || "Publisher"}</p>
              <p style={{ fontSize: "11px", color: "#888780", margin: 0 }}>Publisher</p>
            </div>
          </div>
          <button onClick={() => router.push("/")} style={{ fontSize: "11px", color: "#888780", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "26px", color: "#2C2C2A", margin: 0 }}>
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
            <p style={{ fontSize: "13px", color: "#888780", margin: "4px 0 0" }}>Welcome back, {user?.firstName || "Publisher"}</p>
          </div>
          <button onClick={() => setShowUpload(true)} style={{
            background: "#7F77DD", color: "white", border: "none",
            borderRadius: "100px", padding: "10px 24px",
            fontSize: "13px", fontWeight: "500", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            + Upload Book
          </button>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
              {[
                { label: "Total books",   value: books.length,                        color: "#7F77DD" },
                { label: "Active books",  value: activeBooks,                          color: "#1D9E75" },
                { label: "Total queries", value: totalQueries.toLocaleString(),        color: "#378ADD" },
                { label: "Total revenue", value: `₹${totalRevenue.toLocaleString()}`, color: "#EF9F27" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{stat.label}</p>
                  <p style={{ fontSize: "26px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div style={{ background: "#EEEDFE", border: "1px solid #AFA9EC", borderRadius: "12px", padding: "16px 20px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: "500", color: "#26215C", margin: "0 0 2px" }}>AI Publishing Rights — 5 Year Exclusive Agreement</p>
                <p style={{ fontSize: "12px", color: "#534AB7", margin: 0 }}>All your books are protected under Firstchapter.ai exclusive AI publishing rights. Each book valid for 5 years from upload date.</p>
              </div>
              <span style={{ background: "#AFA9EC", color: "#26215C", borderRadius: "100px", padding: "3px 12px", fontSize: "11px", fontWeight: "500", whiteSpace: "nowrap" as const }}>Active</span>
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "0.5px solid #e5e4dc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Your books</p>
                <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>Click Analytics to see chapter breakdown</p>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9f9f7" }}>
                    {["Title", "Category", "Status", "Queries", "Revenue", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 24px", textAlign: "left", fontSize: "11px", color: "#888780", fontWeight: "500", borderBottom: "0.5px solid #e5e4dc" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {books.map((book, i) => (
                    <tr key={book.id} style={{ borderBottom: i < books.length - 1 ? "0.5px solid #f0efea" : "none" }}>
                      <td style={{ padding: "14px 24px" }}>
                        <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>{book.title}</p>
                        <p style={{ fontSize: "11px", color: "#888780", margin: "2px 0 0" }}>{book.author}</p>
                        <p style={{ fontSize: "10px", color: "#AFA9EC", margin: "2px 0 0" }}>Rights until {book.rightsExpiry}</p>
                      </td>
                      <td style={{ padding: "14px 24px" }}>
                        <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: "#EEEDFE", color: "#534AB7" }}>{book.category}</span>
                      </td>
                      <td style={{ padding: "14px 24px" }}>
                        <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: book.status === "active" ? "#E1F5EE" : "#FAEEDA", color: book.status === "active" ? "#0F6E56" : "#854F0B" }}>{book.status}</span>
                      </td>
                      <td style={{ padding: "14px 24px", fontSize: "13px", color: "#378ADD", fontWeight: "500" }}>{book.queries.toLocaleString()}</td>
                      <td style={{ padding: "14px 24px", fontSize: "13px", color: "#1D9E75", fontWeight: "500" }}>₹{book.revenue.toLocaleString()}</td>
                      <td style={{ padding: "14px 24px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {book.status === "active" && (
                            <button onClick={() => setShowBookDetail(book)} style={{ background: "#EEEDFE", color: "#534AB7", border: "none", borderRadius: "100px", padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Analytics</button>
                          )}
                          <button onClick={() => setShowRemoveConfirm(book)} style={{ background: "white", color: "#E24B4A", border: "1px solid #E24B4A", borderRadius: "100px", padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* MY BOOKS */}
        {activeTab === "books" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
            {books.map(book => (
              <div key={book.id} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "15px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 3px" }}>{book.title}</p>
                    <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{book.author}</p>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "100px", background: "#EEEDFE", color: "#534AB7" }}>{book.category}</span>
                      <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "100px", background: book.status === "active" ? "#E1F5EE" : "#FAEEDA", color: book.status === "active" ? "#0F6E56" : "#854F0B" }}>{book.status}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                  {[
                    { label: "Queries",  value: book.queries.toLocaleString(),        color: "#378ADD" },
                    { label: "Revenue",  value: `₹${book.revenue.toLocaleString()}`,  color: "#1D9E75" },
                    { label: "Chapters", value: book.chapters || "—",                 color: "#7F77DD" },
                  ].map((s, i) => (
                    <div key={i} style={{ background: "#f9f9f7", borderRadius: "8px", padding: "10px" }}>
                      <p style={{ fontSize: "10px", color: "#888780", margin: "0 0 3px" }}>{s.label}</p>
                      <p style={{ fontSize: "18px", fontFamily: "'DM Serif Display', serif", color: s.color, margin: 0 }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Rights expiry per book */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "100px", background: "#EEEDFE", color: "#534AB7" }}>AI Rights</span>
                  <p style={{ fontSize: "11px", color: "#888780", margin: 0 }}>Exclusive until {book.rightsExpiry}</p>
                </div>

                {book.isbn && (
                  <p style={{ fontSize: "11px", color: "#888780", margin: "0 0 10px" }}>ISBN: {book.isbn}</p>
                )}

                {book.topChapters.length > 0 && (
                  <div style={{ borderTop: "0.5px solid #f0efea", paddingTop: "12px", marginBottom: "12px" }}>
                    <p style={{ fontSize: "11px", color: "#888780", margin: "0 0 8px", fontWeight: "500" }}>Top queried chapters</p>
                    {book.topChapters.slice(0, 2).map((ch, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <p style={{ fontSize: "11px", color: "#5F5E5A", margin: 0, flex: 1, marginRight: "8px" }}>{ch.chapter}</p>
                        <p style={{ fontSize: "11px", color: "#378ADD", fontWeight: "500", margin: 0 }}>{ch.queries}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px" }}>
                  {book.status === "active" && (
                    <button onClick={() => setShowBookDetail(book)} style={{ flex: 1, background: "#EEEDFE", color: "#534AB7", border: "none", borderRadius: "100px", padding: "8px", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Full analytics</button>
                  )}
                  <button onClick={() => setShowRemoveConfirm(book)} style={{ flex: 1, background: "white", color: "#E24B4A", border: "1px solid #E24B4A", borderRadius: "100px", padding: "8px", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Remove book</button>
                </div>
              </div>
            ))}

            {/* Add book card */}
            <div onClick={() => setShowUpload(true)} style={{ background: "white", border: "1.5px dashed #e5e4dc", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", minHeight: "200px" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#7F77DD")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e4dc")}
            >
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", fontSize: "24px", color: "#7F77DD" }}>+</div>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#534AB7", margin: "0 0 4px" }}>Upload new book</p>
              <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>PDF or EPUB · Max 50MB</p>
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === "analytics" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>Queries by book</p>
              {books.filter(b => b.queries > 0).map((book, i) => (
                <div key={i} style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <p style={{ fontSize: "13px", color: "#2C2C2A", margin: 0 }}>{book.title}</p>
                    <p style={{ fontSize: "13px", color: "#378ADD", fontWeight: "500", margin: 0 }}>{book.queries.toLocaleString()}</p>
                  </div>
                  <div style={{ height: "6px", background: "#f0efea", borderRadius: "100px" }}>
                    <div style={{ height: "6px", borderRadius: "100px", background: "#378ADD", width: `${(book.queries / totalQueries) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>Revenue by book</p>
              {books.filter(b => b.revenue > 0).map((book, i) => (
                <div key={i} style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <p style={{ fontSize: "13px", color: "#2C2C2A", margin: 0 }}>{book.title}</p>
                    <p style={{ fontSize: "13px", color: "#1D9E75", fontWeight: "500", margin: 0 }}>₹{book.revenue.toLocaleString()}</p>
                  </div>
                  <div style={{ height: "6px", background: "#f0efea", borderRadius: "100px" }}>
                    <div style={{ height: "6px", borderRadius: "100px", background: "#1D9E75", width: `${(book.revenue / totalRevenue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>Top queried chapters — The Art of Selling</p>
              {mockBooks[0].topChapters.map((ch, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#534AB7", fontWeight: "500", flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "12px", color: "#2C2C2A", margin: "0 0 4px" }}>{ch.chapter}</p>
                    <div style={{ height: "4px", background: "#f0efea", borderRadius: "100px" }}>
                      <div style={{ height: "4px", borderRadius: "100px", background: "#7F77DD", width: `${(ch.queries / 312) * 100}%` }} />
                    </div>
                  </div>
                  <span style={{ fontSize: "12px", color: "#7F77DD", fontWeight: "500" }}>{ch.queries}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 20px" }}>Platform metrics</p>
              {[
                { label: "Daily average queries",    value: "71 queries"               },
                { label: "Most active book",         value: "The Art of Selling"        },
                { label: "Most active chapter",      value: "Ch 3 — Psychology of Selling" },
                { label: "Institutions using books", value: "3 institutions"            },
                { label: "Individual readers",       value: "47 users"                  },
                { label: "Average session length",   value: "8.3 queries"               },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 5 ? "0.5px solid #f0efea" : "none" }}>
                  <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: "13px", color: "#2C2C2A", fontWeight: "500", margin: 0 }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REVENUE */}
        {activeTab === "revenue" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "This month",     value: "₹620",  sub: "April 2026",   color: "#1D9E75" },
                { label: "Per query rate", value: "₹0.50", sub: "Standard rate", color: "#7F77DD" },
                { label: "Next payout",    value: "₹620",  sub: "May 1, 2026",  color: "#378ADD" },
              ].map((s, i) => (
                <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{s.label}</p>
                  <p style={{ fontSize: "28px", fontFamily: "'DM Serif Display', serif", color: s.color, margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: "11px", color: "#888780", margin: "4px 0 0" }}>{s.sub}</p>
                </div>
              ))}
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px", marginBottom: "20px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 16px" }}>Revenue breakdown — April 2026</p>
              {books.filter(b => b.revenue > 0).map((book, i) => (
                <div key={i} style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <p style={{ fontSize: "13px", color: "#2C2C2A", margin: 0 }}>{book.title}</p>
                    <p style={{ fontSize: "13px", color: "#1D9E75", fontWeight: "500", margin: 0 }}>₹{book.revenue.toLocaleString()}</p>
                  </div>
                  <div style={{ height: "6px", background: "#f0efea", borderRadius: "100px" }}>
                    <div style={{ height: "6px", borderRadius: "100px", background: "#1D9E75", width: `${(book.revenue / totalRevenue) * 100}%` }} />
                  </div>
                  <p style={{ fontSize: "11px", color: "#888780", margin: "4px 0 0" }}>{book.queries.toLocaleString()} queries × ₹0.50</p>
                </div>
              ))}
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "0.5px solid #e5e4dc" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Payout history</p>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9f9f7" }}>
                    {["Month", "Queries", "Amount", "Status", "Date"].map(h => (
                      <th key={h} style={{ padding: "12px 24px", textAlign: "left", fontSize: "11px", color: "#888780", fontWeight: "500", borderBottom: "0.5px solid #e5e4dc" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payoutHistory.map((payout, i) => (
                    <tr key={i} style={{ borderBottom: i < payoutHistory.length - 1 ? "0.5px solid #f0efea" : "none" }}>
                      <td style={{ padding: "14px 24px", fontSize: "13px", fontWeight: "500", color: "#2C2C2A" }}>{payout.month}</td>
                      <td style={{ padding: "14px 24px", fontSize: "13px", color: "#378ADD", fontWeight: "500" }}>{payout.queries.toLocaleString()}</td>
                      <td style={{ padding: "14px 24px", fontSize: "13px", color: "#1D9E75", fontWeight: "500" }}>₹{payout.amount.toLocaleString()}</td>
                      <td style={{ padding: "14px 24px" }}>
                        <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: "#E1F5EE", color: "#0F6E56" }}>{payout.status}</span>
                      </td>
                      <td style={{ padding: "14px 24px", fontSize: "13px", color: "#888780" }}>{payout.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "28px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 16px" }}>Publisher profile</p>

              <div style={{ background: "#E1F5EE", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", color: "#0F6E56", margin: 0 }}>
                  ✓ Fields pre-filled from your signup profile. Update as needed.
                </p>
              </div>

              {[
                { label: "Publisher / Author name", placeholder: "Your name or publishing house", prefill: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "" },
                { label: "Contact email",           placeholder: "your@email.com",                prefill: user?.primaryEmailAddress?.emailAddress || "" },
                { label: "Website",                 placeholder: "https://yourwebsite.com",       prefill: "" },
                { label: "Phone number",            placeholder: "10 digit mobile",               prefill: "" },
              ].map((field, i) => (
                <div key={i} style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>{field.label}</label>
                  <input type="text" placeholder={field.placeholder} defaultValue={field.prefill} style={inputStyle} />
                </div>
              ))}

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Publisher type</label>
                <select style={inputStyle}>
                  <option>Author-Publisher (I am the author)</option>
                  <option>Independent Publisher</option>
                  <option>Traditional Publisher</option>
                  <option>Academic / Institutional Publisher</option>
                </select>
              </div>

              <button style={{ background: "#7F77DD", color: "white", border: "none", borderRadius: "100px", padding: "10px 24px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Save profile
              </button>
            </div>

            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "28px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 24px" }}>Payout details</p>
              {[
                { label: "Account holder name", placeholder: "As per bank records"    },
                { label: "Bank name",           placeholder: "e.g. State Bank of India" },
                { label: "Account number",      placeholder: "Enter account number"   },
                { label: "IFSC code",           placeholder: "e.g. SBIN0001234"       },
                { label: "UPI ID (optional)",   placeholder: "yourname@upi"           },
                { label: "PAN number",          placeholder: "For TDS compliance"     },
              ].map((field, i) => (
                <div key={i} style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>{field.label}</label>
                  <input type="text" placeholder={field.placeholder} style={inputStyle} />
                </div>
              ))}
              <div style={{ background: "#E1F5EE", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", color: "#0F6E56", margin: 0 }}>✓ Payouts processed on the 1st of every month. Minimum payout threshold: ₹500. TDS deducted as per Indian tax law.</p>
              </div>
              <button style={{ background: "#1D9E75", color: "white", border: "none", borderRadius: "100px", padding: "10px 24px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Save payout details
              </button>
            </div>

            {/* AI Rights Agreement status */}
            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "28px", gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>AI Publishing Rights Agreement</p>
                <span style={{ background: "#E1F5EE", color: "#0F6E56", borderRadius: "100px", padding: "4px 14px", fontSize: "12px", fontWeight: "500" }}>Signed ✓</span>
              </div>
              {[
                { label: "Agreement type",    value: "Exclusive AI Publishing Rights"         },
                { label: "Duration",          value: "5 years per book from upload date"      },
                { label: "Revenue share",     value: "₹0.50 per query (50%)"                 },
                { label: "Scope",             value: "Worldwide — AI querying rights only"    },
                { label: "Your other rights", value: "Print, audio, translation, film — fully retained" },
                { label: "Early exit fee",    value: "₹2,000 per book processing fee"        },
                { label: "Governing law",     value: "Indian law — Chennai jurisdiction"      },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 6 ? "0.5px solid #f0efea" : "none" }}>
                  <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: "13px", color: "#2C2C2A", fontWeight: "500", margin: 0 }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div style={modalOverlay}>
          <div style={{ background: "white", borderRadius: "20px", padding: "32px", width: "520px", maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
              <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Upload a book</p>
              <button onClick={() => setShowUpload(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888780" }}>×</button>
            </div>

            {[
              { label: "Book title",   key: "title",       placeholder: "Enter full book title"  },
              { label: "Author name",  key: "author",      placeholder: "Author full name"       },
              { label: "ISBN",         key: "isbn",        placeholder: "ISBN (optional)"        },
              { label: "Description",  key: "description", placeholder: "Brief book description" },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>{field.label}</label>
                <input type="text" placeholder={field.placeholder} value={(uploadForm as any)[field.key]} onChange={e => setUploadForm(f => ({ ...f, [field.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Category</label>
              <select value={uploadForm.category} onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>PDF file</label>
              <div onClick={() => document.getElementById("fileInput")?.click()} style={{ border: "1.5px dashed #e5e4dc", borderRadius: "10px", padding: "24px", textAlign: "center", cursor: "pointer", background: uploadForm.file ? "#E1F5EE" : "#f9f9f7" }}>
                <input id="fileInput" type="file" accept=".pdf,.epub" style={{ display: "none" }} onChange={e => setUploadForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
                {uploadForm.file
                  ? <p style={{ fontSize: "13px", color: "#1D9E75", margin: 0 }}>✓ {uploadForm.file.name}</p>
                  : <><p style={{ fontSize: "13px", color: "#888780", margin: "0 0 4px" }}>Click to select PDF or EPUB</p><p style={{ fontSize: "11px", color: "#B4B2A9", margin: 0 }}>Maximum file size 50MB</p></>
                }
              </div>
            </div>

            <div style={{ background: "#EEEDFE", borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "#26215C", fontWeight: "500", margin: "0 0 6px" }}>AI Publishing Rights Declaration</p>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={agreementAccepted} onChange={e => setAgreementAccepted(e.target.checked)} style={{ marginTop: "2px", flexShrink: 0 }} />
                <p style={{ fontSize: "12px", color: "#534AB7", margin: 0, lineHeight: 1.5 }}>
                  I confirm I hold AI publishing rights for this book and agree to grant Firstchapter.ai exclusive AI querying rights for 5 years at ₹0.50 per query revenue share.{" "}
                  <span onClick={() => setShowAgreement(true)} style={{ textDecoration: "underline", cursor: "pointer" }}>View full agreement</span>
                </p>
              </label>
            </div>

            <div style={{ background: "#E1F5EE", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", color: "#0F6E56", margin: 0 }}>💰 You earn <strong>₹0.50 per query</strong>. Payouts on 1st of every month. Minimum ₹500.</p>
            </div>

            <button onClick={handleUpload} disabled={!uploadForm.title || !uploadForm.author || !uploadForm.file || !agreementAccepted || uploading} style={{
              width: "100%", color: "white", border: "none", borderRadius: "100px", padding: "12px",
              fontSize: "14px", fontWeight: "500", fontFamily: "'DM Sans', sans-serif",
              background: !uploadForm.title || !uploadForm.author || !uploadForm.file || !agreementAccepted ? "#B4B2A9" : "#7F77DD",
              cursor: !uploadForm.title || !uploadForm.author || !uploadForm.file || !agreementAccepted ? "not-allowed" : "pointer",
            }}>
              {uploading ? "Uploading and processing..." : "Upload book →"}
            </button>
          </div>
        </div>
      )}

      {/* AI Rights Agreement Modal */}
      {showAgreement && (
        <div style={modalOverlay}>
          <div style={{ background: "white", borderRadius: "20px", padding: "32px", width: "580px", maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
              <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>AI Publishing Rights Agreement</p>
              <button onClick={() => setShowAgreement(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888780" }}>×</button>
            </div>
            <div style={{ background: "#f9f9f7", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
              <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 16px" }}>FIRSTCHAPTER.AI — AI PUBLISHING RIGHTS AGREEMENT</p>
              {[
                { title: "1. Grant of Rights",  body: "Publisher grants Firstchapter.ai exclusive worldwide rights to convert, embed and make queryable the Work using AI technology for a period of 5 years from the date of upload." },
                { title: "2. Retained Rights",  body: "Publisher retains all print, audio, translation, film and all other rights not specifically granted herein. This agreement covers AI querying rights only." },
                { title: "3. Revenue Share",    body: "Platform shall pay Publisher ₹0.50 per query generated on the Work, paid monthly on the 1st of each month. Minimum payout threshold: ₹500." },
                { title: "4. Content Protection", body: "Platform shall not reproduce, distribute or expose raw content. All interactions are query-response only with full attribution to the Work and Author." },
                { title: "5. Exclusivity",      body: "Publisher shall not grant AI querying rights to any competing platform during the term of this agreement." },
                { title: "6. Termination",      body: "Either party may terminate with 90 days written notice. Early termination by Publisher incurs a processing fee of ₹2,000 to cover ingestion costs." },
                { title: "7. Governing Law",    body: "This agreement is governed by Indian law. Disputes resolved in Chennai jurisdiction." },
              ].map((clause, i) => (
                <div key={i} style={{ marginBottom: "16px" }}>
                  <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 4px" }}>{clause.title}</p>
                  <p style={{ fontSize: "12px", color: "#5F5E5A", margin: 0, lineHeight: 1.6 }}>{clause.body}</p>
                </div>
              ))}
            </div>
            <button onClick={() => { setAgreementAccepted(true); setShowAgreement(false); }} style={{ width: "100%", background: "#7F77DD", color: "white", border: "none", borderRadius: "100px", padding: "12px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              I accept this agreement ✓
            </button>
          </div>
        </div>
      )}

      {/* Book Analytics Modal */}
      {showBookDetail && (
        <div style={modalOverlay}>
          <div style={{ background: "white", borderRadius: "20px", padding: "32px", width: "560px", maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
              <div>
                <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 2px" }}>{showBookDetail.title}</p>
                <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>{showBookDetail.author}</p>
              </div>
              <button onClick={() => setShowBookDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888780" }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              {[
                { label: "Total queries", value: showBookDetail.queries.toLocaleString(),        color: "#378ADD" },
                { label: "Revenue",       value: `₹${showBookDetail.revenue.toLocaleString()}`,  color: "#1D9E75" },
                { label: "Chapters",      value: showBookDetail.chapters,                         color: "#7F77DD" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#f9f9f7", borderRadius: "10px", padding: "14px" }}>
                  <p style={{ fontSize: "11px", color: "#888780", margin: "0 0 4px" }}>{s.label}</p>
                  <p style={{ fontSize: "22px", fontFamily: "'DM Serif Display', serif", color: s.color, margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
              <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "100px", background: "#EEEDFE", color: "#534AB7" }}>AI Rights</span>
              <p style={{ fontSize: "12px", color: "#888780", margin: 0 }}>Exclusive until {showBookDetail.rightsExpiry}</p>
            </div>

            <p style={{ fontSize: "13px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 14px" }}>Chapter analytics</p>
            {showBookDetail.topChapters.map((ch: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <span style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#534AB7", fontWeight: "500", flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "12px", color: "#2C2C2A", margin: "0 0 4px" }}>{ch.chapter}</p>
                  <div style={{ height: "4px", background: "#f0efea", borderRadius: "100px" }}>
                    <div style={{ height: "4px", borderRadius: "100px", background: "#7F77DD", width: `${(ch.queries / showBookDetail.topChapters[0].queries) * 100}%` }} />
                  </div>
                </div>
                <span style={{ fontSize: "12px", color: "#7F77DD", fontWeight: "500" }}>{ch.queries} queries</span>
              </div>
            ))}

            <div style={{ background: "#E1F5EE", borderRadius: "10px", padding: "12px 16px", marginTop: "16px" }}>
              <p style={{ fontSize: "12px", color: "#0F6E56", margin: 0 }}>
                Revenue: {showBookDetail.queries.toLocaleString()} queries × ₹0.50 = <strong>₹{showBookDetail.revenue.toLocaleString()}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Remove Book Confirm Modal */}
      {showRemoveConfirm && (
        <div style={modalOverlay}>
          <div style={{ background: "white", borderRadius: "20px", padding: "32px", width: "420px", maxWidth: "90vw" }}>
            <p style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 8px" }}>Remove book</p>
            <p style={{ fontSize: "13px", color: "#888780", margin: "0 0 20px" }}>
              Are you sure you want to remove <strong>{showRemoveConfirm.title}</strong>? All vectors will be deleted and the book will no longer be queryable.
            </p>
            <div style={{ background: "#FCEBEB", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", color: "#A32D2D", margin: 0 }}>
                ⚠️ This cannot be undone. A processing fee of ₹2,000 applies for early removal as per your AI Publishing Rights Agreement.
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowRemoveConfirm(null)} style={{ flex: 1, background: "white", color: "#5F5E5A", border: "0.5px solid #e5e4dc", borderRadius: "100px", padding: "12px", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <button onClick={() => handleRemoveBook(showRemoveConfirm.id)} style={{ flex: 1, background: "#E24B4A", color: "white", border: "none", borderRadius: "100px", padding: "12px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Remove book</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
