import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";
import { PublisherAccessGate } from "../../components/PublisherAccessGate";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


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
  const [uploadForm, setUploadForm]         = useState({
    title: "", author: "", category: "Business",
    isbn: "", description: "", file: null as File | null,
  });

  // ── Real data from backend ────────────────────────────────────
  const [meData, setMeData]             = useState<any>(null);
  const [books, setBooks]               = useState<any[]>([]);
  const [revenueData, setRevenueData]   = useState<any>(null);
  const [payoutData, setPayoutData]     = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingMe, setLoadingMe]       = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [fetchError, setFetchError]     = useState<string>("");

  const fetchAll = async () => {
    if (!user?.id) return;
    const headers = { "x-user-id": user.id };
    setFetchError("");

    // /publisher/me
    setLoadingMe(true);
    try {
      const r = await fetch(`${API_URL}/api/publisher/me`, { headers });
      if (r.ok) setMeData(await r.json());
      else setMeData(null);
    } catch (e) { setMeData(null); }
    finally { setLoadingMe(false); }

    // /publisher/books
    setLoadingBooks(true);
    try {
      const r = await fetch(`${API_URL}/api/publisher/books`, { headers });
      const d = r.ok ? await r.json() : { books: [] };
      setBooks(d.books || []);
    } catch (e) { setBooks([]); }
    finally { setLoadingBooks(false); }

    // /publisher/revenue
    setLoadingRevenue(true);
    try {
      const r = await fetch(`${API_URL}/api/publisher/revenue`, { headers });
      setRevenueData(r.ok ? await r.json() : null);
    } catch (e) { setRevenueData(null); }
    finally { setLoadingRevenue(false); }

    // /publisher/payouts
    setLoadingPayouts(true);
    try {
      const r = await fetch(`${API_URL}/api/publisher/payouts`, { headers });
      const d = r.ok ? await r.json() : { payouts: [] };
      setPayoutData(d.payouts || []);
    } catch (e) { setPayoutData([]); }
    finally { setLoadingPayouts(false); }

    // /publisher/analytics
    setLoadingAnalytics(true);
    try {
      const r = await fetch(`${API_URL}/api/publisher/analytics?days=30`, { headers });
      setAnalyticsData(r.ok ? await r.json() : null);
    } catch (e) { setAnalyticsData(null); }
    finally { setLoadingAnalytics(false); }
  };

  useEffect(() => {
    if (isLoaded && user?.id) fetchAll();
  }, [isLoaded, user?.id]);

  // ── Derived values from real data ─────────────────────────────
  const totalBooks   = meData?.total_books ?? books.length;
  const activeBooks  = meData?.active_books ?? books.filter(b => (b.status || "").toLowerCase() === "active").length;
  const totalQueries = meData?.total_queries ?? 0;
  const totalRevenue = Math.round((meData?.total_revenue_paisa ?? 0) / 100);
  const pendingPayout = Math.round((meData?.pending_payout_paisa ?? 0) / 100);
  const lastPayoutDate = meData?.last_payout_date;
  const ratePerMillion = meData?.payout_rate_per_million_tokens ?? 0;
  const paymentThresholdRupees = Math.round((meData?.payment_threshold_paisa ?? 0) / 100);

  // Publisher display name for sidebar
  const publisherDisplayName = meData?.publisher_name || (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Publisher");

  // Map API book shape to the legacy shape used throughout the JSX
  // so we don't have to rewrite every reference.
  const mappedBooks = books.map(b => {
    const createdAt = b.created_at ? new Date(b.created_at) : null;
    const expiryDate = createdAt ? new Date(createdAt) : null;
    if (expiryDate) expiryDate.setFullYear(expiryDate.getFullYear() + 5);
    return {
      id:           b.id,
      title:        b.title || "Untitled",
      author:       b.author || "Unknown",
      category:     b.category || "General",
      status:       (b.status || "active").toLowerCase(),
      queries:      b.queries || 0,
      revenue:      Math.round(b.revenue_rupees || 0),
      revenue_paisa: b.revenue_paisa || 0,
      tokens:       b.tokens_attributed || 0,
      chapters:     0,           // not tracked yet
      pages:        0,           // not tracked yet
      isbn:         b.isbn || "",
      cover_url:    b.cover_url || "",
      uploaded:     b.created_at ? b.created_at.split("T")[0] : "—",
      rightsExpiry: expiryDate ? expiryDate.toISOString().split("T")[0] : "—",
      topChapters:  [] as Array<{ chapter: string; queries: number }>,  // not tracked yet (Session 4 Analytics)
    };
  });

  // ── Editable Settings form ─────────────────────────────────────
  // Pre-populated from meData. Synced when meData arrives.
  const [profileForm, setProfileForm] = useState({
    contact_person: "", phone: "", website: "", bio: "",
  });
  const [payoutForm, setPayoutForm] = useState({
    bank_name: "", account_number: "", ifsc_code: "", upi_id: "", pan_number: "", gst_number: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPayout, setSavingPayout]   = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [payoutMessage, setPayoutMessage]   = useState<{ type: "success" | "error"; text: string } | null>(null);

  // When meData loads, pre-populate the forms
  useEffect(() => {
    if (meData) {
      setProfileForm({
        contact_person: meData.contact_person || "",
        phone:          meData.phone || "",
        website:        meData.website || "",
        bio:            meData.bio || "",
      });
      setPayoutForm({
        bank_name:      meData.bank_name || "",
        account_number: meData.account_number || "",
        ifsc_code:      meData.ifsc_code || "",
        upi_id:         meData.upi_id || "",
        pan_number:     meData.pan_number || "",
        gst_number:     meData.gst_number || "",
      });
    }
  }, [meData]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const r = await fetch(`${API_URL}/api/publisher/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": user!.id },
        body: JSON.stringify(profileForm),
      });
      const d = await r.json();
      if (!r.ok) {
        setProfileMessage({ type: "error", text: typeof d.detail === "string" ? d.detail : "Could not save changes" });
      } else {
        setProfileMessage({ type: "success", text: "Profile saved." });
        fetchAll();
      }
    } catch (e) {
      setProfileMessage({ type: "error", text: "Network error — please try again" });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePayout = async () => {
    setSavingPayout(true);
    setPayoutMessage(null);
    try {
      const r = await fetch(`${API_URL}/api/publisher/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": user!.id },
        body: JSON.stringify(payoutForm),
      });
      const d = await r.json();
      if (!r.ok) {
        setPayoutMessage({ type: "error", text: typeof d.detail === "string" ? d.detail : "Could not save payout details" });
      } else {
        setPayoutMessage({ type: "success", text: "Payout details saved." });
        fetchAll();
      }
    } catch (e) {
      setPayoutMessage({ type: "error", text: "Network error — please try again" });
    } finally {
      setSavingPayout(false);
    }
  };

  // ── Change password (Clerk-managed) ────────────────────────────
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Detect whether the user has password auth enabled in Clerk
  const hasPasswordAuth = user?.passwordEnabled ?? true;

  const changePassword = async () => {
    setPasswordMessage(null);

    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setPasswordMessage({ type: "error", text: "Fill all three fields" });
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordMessage({ type: "error", text: "New passwords don't match" });
      return;
    }
    if (passwordForm.next.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters" });
      return;
    }

    setChangingPassword(true);
    try {
      await user!.updatePassword({
        currentPassword: passwordForm.current,
        newPassword:     passwordForm.next,
      });
      setPasswordMessage({ type: "success", text: "Password updated successfully." });
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch (e: any) {
      const msg = e?.errors?.[0]?.message || e?.message || "Could not update password";
      setPasswordMessage({ type: "error", text: msg });
    } finally {
      setChangingPassword(false);
    }
  };

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

      const response = await fetch(`${API_URL}/api/books/upload`, {
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

      // Success — refresh data from backend (gets the actual stored row)
      setShowUpload(false);
      setUploadForm({ title: "", author: "", category: "Business", isbn: "", description: "", file: null });
      alert(`✅ "${uploadForm.title}" uploaded successfully!\n\n${data.chunks} chunks indexed.\nBook is now live and queryable by students.`);
      fetchAll();

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

  // ─── Auth-loading guard ───────────────────────────────────────
  // MUST come AFTER all useState/useEffect calls above, otherwise
  // React's rules-of-hooks ordering breaks on re-render (error #310).
  if (!isLoaded) {
    return (
      <div style={{
        minHeight: "100vh", background: "#f9f9f7",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <p style={{ fontSize: "14px", color: "#888780" }}>Loading...</p>
      </div>
    );
  }

  return (
    <PublisherAccessGate>
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
          <p style={{ fontSize: "11px", color: "#888780", margin: 0 }}>
            {lastPayoutDate
              ? `Last paid ${new Date(lastPayoutDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
              : "No payouts yet"}
          </p>
        </div>

        <div style={{ padding: "16px", borderTop: "0.5px solid #e5e4dc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: "#EEEDFE", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "12px", fontWeight: "500", color: "#534AB7",
            }}>
              {publisherDisplayName?.[0] || "P"}
            </div>
            <div>
              <p style={{ fontSize: "12px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>{publisherDisplayName}</p>
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
            <p style={{ fontSize: "13px", color: "#888780", margin: "4px 0 0" }}>Welcome back, {publisherDisplayName}</p>
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
                { label: "Total books",   value: totalBooks,                        color: "#7F77DD" },
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
                  {mappedBooks.map((book, i) => (
                    <tr key={book.id} style={{ borderBottom: i < mappedBooks.length - 1 ? "0.5px solid #f0efea" : "none" }}>
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
          <>
            {loadingBooks ? (
              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "60px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "#888780" }}>Loading your books...</p>
              </div>
            ) : mappedBooks.length === 0 ? (
              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "60px", textAlign: "center" }}>
                <p style={{ fontSize: "32px", margin: "0 0 12px" }}>📚</p>
                <p style={{ fontSize: "16px", fontWeight: 500, color: "#2C2C2A", margin: "0 0 8px", fontFamily: "'DM Serif Display', serif" }}>No books uploaded yet</p>
                <p style={{ fontSize: "13px", color: "#888780", margin: "0 0 20px" }}>Upload your first book to start earning royalties from student queries.</p>
                <button onClick={() => setShowUpload(true)} style={{ background: "#7F77DD", color: "white", border: "none", borderRadius: "100px", padding: "10px 24px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  + Upload Book
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
                {mappedBooks.map(book => (
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
          </>
        )}

        {/* ANALYTICS */}
        {activeTab === "analytics" && (
          <div>
            {loadingAnalytics ? (
              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "60px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "#888780" }}>Loading analytics...</p>
              </div>
            ) : !analyticsData ? (
              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "60px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>Analytics could not be loaded right now. Please try refreshing.</p>
              </div>
            ) : (
              <>
                {/* Honest empty/sparse state message — shows above the data */}
                {(analyticsData.summary?.total_queries ?? 0) < 10 && (
                  <div style={{
                    background: "#FFFBEC", border: "1px solid #FFE4A3",
                    borderRadius: "10px", padding: "14px 18px", marginBottom: "20px",
                  }}>
                    <p style={{ fontSize: "12px", color: "#854F0B", margin: 0, lineHeight: 1.6 }}>
                      <strong>Activity is just getting started.</strong>{" "}
                      Your books have received {analyticsData.summary?.total_queries ?? 0} {analyticsData.summary?.total_queries === 1 ? "query" : "queries"} so far. These charts will become more useful as readers engage with your content.
                    </p>
                  </div>
                )}

                {/* Summary stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
                  {[
                    { label: "Queries (30d)",      value: (analyticsData.summary?.total_queries ?? 0).toLocaleString(),       color: "#7F77DD" },
                    { label: "Output tokens (30d)", value: (analyticsData.summary?.total_output_tokens ?? 0).toLocaleString(), color: "#1D9E75" },
                    { label: "Input tokens (30d)",  value: (analyticsData.summary?.total_input_tokens ?? 0).toLocaleString(),  color: "#378ADD" },
                    { label: "Active days",         value: `${analyticsData.summary?.days_with_activity ?? 0} / ${analyticsData.window_days ?? 30}`, color: "#EF9F27" },
                  ].map((stat, i) => (
                    <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "20px" }}>
                      <p style={{ fontSize: "11px", color: "#888780", margin: "0 0 6px", textTransform: "uppercase" as const, letterSpacing: "0.4px" }}>{stat.label}</p>
                      <p style={{ fontSize: "22px", fontFamily: "'DM Serif Display', serif", color: stat.color, margin: 0 }}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Daily queries chart */}
                <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px", marginBottom: "20px" }}>
                  <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 4px" }}>Daily queries — last {analyticsData.window_days} days</p>
                  <p style={{ fontSize: "11px", color: "#888780", margin: "0 0 18px" }}>
                    {analyticsData.start_date} → {analyticsData.end_date}
                  </p>

                  {(() => {
                    const daily = analyticsData.daily_totals || [];
                    const maxQueries = Math.max(1, ...daily.map((d: any) => d.queries));
                    return (
                      <>
                        {/* Bar chart */}
                        <div style={{
                          display: "flex", alignItems: "flex-end", gap: "2px",
                          height: "120px", padding: "8px 0",
                          borderBottom: "1px solid #f0efea",
                        }}>
                          {daily.map((d: any, i: number) => {
                            const heightPct = d.queries > 0 ? (d.queries / maxQueries) * 100 : 0;
                            return (
                              <div
                                key={i}
                                title={`${d.date}: ${d.queries} ${d.queries === 1 ? "query" : "queries"}`}
                                style={{
                                  flex: 1,
                                  height: d.queries > 0 ? `${Math.max(heightPct, 4)}%` : "1px",
                                  background: d.queries > 0 ? "#7F77DD" : "#e5e4dc",
                                  borderRadius: "2px 2px 0 0",
                                  minHeight: d.queries > 0 ? "4px" : "1px",
                                  transition: "background 0.2s",
                                }}
                              />
                            );
                          })}
                        </div>

                        {/* Date axis labels — show only endpoints + middle */}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                          <p style={{ fontSize: "10px", color: "#888780", margin: 0 }}>
                            {daily[0]?.date ? new Date(daily[0].date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                          </p>
                          <p style={{ fontSize: "10px", color: "#888780", margin: 0 }}>
                            {daily[Math.floor(daily.length / 2)]?.date ? new Date(daily[Math.floor(daily.length / 2)].date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                          </p>
                          <p style={{ fontSize: "10px", color: "#888780", margin: 0 }}>
                            {daily[daily.length - 1]?.date ? new Date(daily[daily.length - 1].date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Per-book breakdown */}
                <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden" }}>
                  <div style={{ padding: "20px 24px", borderBottom: "0.5px solid #e5e4dc" }}>
                    <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Per-book activity</p>
                    <p style={{ fontSize: "11px", color: "#888780", margin: "4px 0 0" }}>Sorted by query volume in the last {analyticsData.window_days} days</p>
                  </div>

                  {analyticsData.per_book_totals && analyticsData.per_book_totals.length > 0 ? (
                    <div>
                      {analyticsData.per_book_totals.map((b: any, idx: number) => {
                        const maxDaily = Math.max(1, ...b.daily.map((d: any) => d.queries));
                        return (
                          <div key={b.book_id} style={{ padding: "18px 24px", borderBottom: idx < analyticsData.per_book_totals.length - 1 ? "0.5px solid #f0efea" : "none" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "16px" }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: "13px", fontWeight: 500, color: "#2C2C2A", margin: 0 }}>{b.book_title}</p>
                                <p style={{ fontSize: "11px", color: "#888780", margin: "3px 0 0" }}>
                                  {b.queries} {b.queries === 1 ? "query" : "queries"} · {b.output_tokens.toLocaleString()} output tokens
                                </p>
                              </div>
                            </div>
                            {/* Sparkline */}
                            <div style={{
                              display: "flex", alignItems: "flex-end", gap: "1px",
                              height: "32px", padding: "2px 0",
                            }}>
                              {b.daily.map((d: any, i: number) => {
                                const heightPct = d.queries > 0 ? (d.queries / maxDaily) * 100 : 0;
                                return (
                                  <div
                                    key={i}
                                    title={`${d.date}: ${d.queries}`}
                                    style={{
                                      flex: 1,
                                      height: d.queries > 0 ? `${Math.max(heightPct, 8)}%` : "1px",
                                      background: d.queries > 0 ? "#1D9E75" : "#f0efea",
                                      borderRadius: "1px",
                                      minHeight: d.queries > 0 ? "2px" : "1px",
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: "32px", textAlign: "center" as const }}>
                      <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>
                        No book activity in this period. Once your books are queried by readers, per-book trends will appear here.
                      </p>
                    </div>
                  )}
                </div>

                {/* Honest disclosure about what's NOT here yet */}
                <div style={{
                  background: "white", border: "0.5px dashed #e5e4dc",
                  borderRadius: "12px", padding: "18px 22px", marginTop: "20px",
                }}>
                  <p style={{ fontSize: "12px", color: "#888780", margin: 0, lineHeight: 1.6 }}>
                    <strong style={{ color: "#5F5E5A" }}>Coming later:</strong>{" "}
                    chapter-level breakdowns, top-queried passages, and reader composition (institutional vs individual). These require additional data tracking we'll roll out as the platform matures.
                  </p>
                </div>
              </>
            )}
          </div>
        )}


        {/* REVENUE */}
        {activeTab === "revenue" && (
          <div>
            {loadingRevenue || loadingMe ? (
              <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "60px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "#888780" }}>Loading revenue data...</p>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
                  {(() => {
                    const latestMonth = revenueData?.monthly_breakdown?.[0];
                    const thisMonthRevenue = latestMonth ? Math.round(latestMonth.revenue_rupees) : 0;
                    const thisMonthLabel = latestMonth?.month
                      ? new Date(latestMonth.month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })
                      : "No activity yet";
                    return [
                      { label: "This month",       value: `₹${thisMonthRevenue.toLocaleString()}`, sub: thisMonthLabel,                          color: "#1D9E75" },
                      { label: "Rate per 1M tokens", value: `₹${ratePerMillion}`,                  sub: "Your approved royalty rate",          color: "#7F77DD" },
                      { label: "Pending payout",   value: `₹${pendingPayout.toLocaleString()}`,    sub: paymentThresholdRupees > 0 ? `Min ₹${paymentThresholdRupees} to release` : "Awaiting threshold", color: "#378ADD" },
                    ];
                  })().map((s, i) => (
                    <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px" }}>
                      <p style={{ fontSize: "12px", color: "#888780", margin: "0 0 8px" }}>{s.label}</p>
                      <p style={{ fontSize: "28px", fontFamily: "'DM Serif Display', serif", color: s.color, margin: 0 }}>{s.value}</p>
                      <p style={{ fontSize: "11px", color: "#888780", margin: "4px 0 0" }}>{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Revenue breakdown — latest month */}
                {(() => {
                  const latestMonth = revenueData?.monthly_breakdown?.[0];
                  if (!latestMonth || !latestMonth.books || latestMonth.books.length === 0) {
                    return (
                      <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "32px", textAlign: "center", marginBottom: "20px" }}>
                        <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>
                          Revenue tracking starts when your books are queried by readers. Your earnings will appear here once activity begins.
                        </p>
                      </div>
                    );
                  }
                  const monthLabel = latestMonth.month
                    ? new Date(latestMonth.month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })
                    : "Latest";
                  const monthTotalRevenue = latestMonth.revenue_rupees || 1;
                  return (
                    <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "24px", marginBottom: "20px" }}>
                      <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 16px" }}>Revenue breakdown — {monthLabel}</p>
                      {latestMonth.books.map((book: any, i: number) => (
                        <div key={i} style={{ marginBottom: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <p style={{ fontSize: "13px", color: "#2C2C2A", margin: 0 }}>{book.book_title}</p>
                            <p style={{ fontSize: "13px", color: "#1D9E75", fontWeight: "500", margin: 0 }}>₹{Math.round(book.revenue_rupees).toLocaleString()}</p>
                          </div>
                          <div style={{ height: "6px", background: "#f0efea", borderRadius: "100px" }}>
                            <div style={{ height: "6px", borderRadius: "100px", background: "#1D9E75", width: `${Math.max(2, (book.revenue_rupees / monthTotalRevenue) * 100)}%` }} />
                          </div>
                          <p style={{ fontSize: "11px", color: "#888780", margin: "4px 0 0" }}>{book.tokens.toLocaleString()} output tokens × ₹{ratePerMillion}/M</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Payout history */}
                <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", overflow: "hidden" }}>
                  <div style={{ padding: "20px 24px", borderBottom: "0.5px solid #e5e4dc" }}>
                    <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>Payout history</p>
                  </div>
                  {loadingPayouts ? (
                    <div style={{ padding: "32px", textAlign: "center" }}>
                      <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>Loading...</p>
                    </div>
                  ) : payoutData.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center" }}>
                      <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>No payouts yet. Earnings accumulate here once they cross the minimum threshold of ₹{paymentThresholdRupees || 500}.</p>
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f9f9f7" }}>
                          {["Period", "Output tokens", "Amount", "Status", "Payment date"].map(h => (
                            <th key={h} style={{ padding: "12px 24px", textAlign: "left" as const, fontSize: "11px", color: "#888780", fontWeight: "500", borderBottom: "0.5px solid #e5e4dc" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {payoutData.map((payout, i) => {
                          const start = payout.period_start ? new Date(payout.period_start).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
                          const end = payout.period_end ? new Date(payout.period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
                          const statusColors: any = {
                            paid:    { bg: "#E1F5EE", fg: "#0F6E56" },
                            pending: { bg: "#FAEEDA", fg: "#854F0B" },
                            failed:  { bg: "#FCEBEB", fg: "#A32D2D" },
                          };
                          const sc = statusColors[payout.payment_status] || statusColors.pending;
                          return (
                            <tr key={payout.id || i} style={{ borderBottom: i < payoutData.length - 1 ? "0.5px solid #f0efea" : "none" }}>
                              <td style={{ padding: "14px 24px", fontSize: "13px", fontWeight: "500", color: "#2C2C2A" }}>{start} – {end}</td>
                              <td style={{ padding: "14px 24px", fontSize: "13px", color: "#378ADD", fontWeight: "500" }}>{(payout.total_output_tokens || 0).toLocaleString()}</td>
                              <td style={{ padding: "14px 24px", fontSize: "13px", color: "#1D9E75", fontWeight: "500" }}>₹{Math.round(payout.revenue_rupees).toLocaleString()}</td>
                              <td style={{ padding: "14px 24px" }}>
                                <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "100px", background: sc.bg, color: sc.fg, textTransform: "capitalize" as const }}>{payout.payment_status || "pending"}</span>
                              </td>
                              <td style={{ padding: "14px 24px", fontSize: "13px", color: "#888780" }}>{payout.payment_date ? new Date(payout.payment_date).toLocaleDateString("en-IN") : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

            {/* ── Publisher profile (editable) ── */}
            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "28px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 16px" }}>Publisher profile</p>

              {/* Read-only fields (admin-controlled) */}
              <div style={{ background: "#f9f9f7", border: "0.5px solid #e5e4dc", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", color: "#888780", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Read-only · contact admin to change</p>
                <div style={{ display: "grid", gap: "6px", fontSize: "13px", color: "#3D3D3A" }}>
                  <div><strong>Publisher name:</strong> {meData?.publisher_name || "—"}</div>
                  <div><strong>Email:</strong> {meData?.email || "—"}</div>
                  <div><strong>Type:</strong> {meData?.publisher_type || "—"}</div>
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Contact person</label>
                <input type="text" placeholder="Your name" value={profileForm.contact_person}
                  onChange={e => setProfileForm(p => ({ ...p, contact_person: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Phone number</label>
                <input type="text" placeholder="10 digit mobile" value={profileForm.phone}
                  onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Website</label>
                <input type="text" placeholder="https://yourwebsite.com" value={profileForm.website}
                  onChange={e => setProfileForm(p => ({ ...p, website: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Bio <span style={{ color: "#B4B2A9" }}>(optional)</span></label>
                <textarea placeholder="Brief description..." value={profileForm.bio}
                  onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "none" as const }} />
              </div>

              {profileMessage && (
                <div style={{
                  padding: "8px 12px", borderRadius: "8px", marginBottom: "12px", fontSize: "12px",
                  background: profileMessage.type === "success" ? "#E1F5EE" : "#FDEDEC",
                  color: profileMessage.type === "success" ? "#0F6E56" : "#922B21",
                }}>
                  {profileMessage.text}
                </div>
              )}

              <button onClick={saveProfile} disabled={savingProfile} style={{
                background: savingProfile ? "#C8C5F0" : "#7F77DD", color: "white", border: "none",
                borderRadius: "100px", padding: "10px 24px", fontSize: "13px", fontWeight: "500",
                cursor: savingProfile ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>
                {savingProfile ? "Saving..." : "Save profile"}
              </button>
            </div>

            {/* ── Payout details (editable) ── */}
            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "28px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 16px" }}>Payout details</p>

              <div style={{ background: "#FFFBEC", border: "1px solid #FFE4A3", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", color: "#854F0B", margin: 0 }}>
                  Changes to payout details may require admin re-verification before next payout.
                </p>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Bank name</label>
                <input type="text" placeholder="e.g. State Bank of India" value={payoutForm.bank_name}
                  onChange={e => setPayoutForm(p => ({ ...p, bank_name: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Account number</label>
                <input type="text" placeholder="Enter account number" value={payoutForm.account_number}
                  onChange={e => setPayoutForm(p => ({ ...p, account_number: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>IFSC code</label>
                <input type="text" placeholder="e.g. SBIN0001234" value={payoutForm.ifsc_code}
                  onChange={e => setPayoutForm(p => ({ ...p, ifsc_code: e.target.value.toUpperCase() }))} style={inputStyle} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>UPI ID (optional)</label>
                <input type="text" placeholder="yourname@upi" value={payoutForm.upi_id}
                  onChange={e => setPayoutForm(p => ({ ...p, upi_id: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>PAN number</label>
                <input type="text" placeholder="ABCDE1234F" value={payoutForm.pan_number}
                  onChange={e => setPayoutForm(p => ({ ...p, pan_number: e.target.value.toUpperCase() }))} style={inputStyle} />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>GST number <span style={{ color: "#B4B2A9" }}>(optional)</span></label>
                <input type="text" placeholder="GSTIN" value={payoutForm.gst_number}
                  onChange={e => setPayoutForm(p => ({ ...p, gst_number: e.target.value.toUpperCase() }))} style={inputStyle} />
              </div>

              <div style={{ background: "#E1F5EE", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", color: "#0F6E56", margin: 0 }}>
                  ✓ Payouts processed monthly once minimum threshold of ₹{paymentThresholdRupees || 500} is reached. TDS deducted as per Indian tax law.
                </p>
              </div>

              {payoutMessage && (
                <div style={{
                  padding: "8px 12px", borderRadius: "8px", marginBottom: "12px", fontSize: "12px",
                  background: payoutMessage.type === "success" ? "#E1F5EE" : "#FDEDEC",
                  color: payoutMessage.type === "success" ? "#0F6E56" : "#922B21",
                }}>
                  {payoutMessage.text}
                </div>
              )}

              <button onClick={savePayout} disabled={savingPayout} style={{
                background: savingPayout ? "#9FE1CB" : "#1D9E75", color: "white", border: "none",
                borderRadius: "100px", padding: "10px 24px", fontSize: "13px", fontWeight: "500",
                cursor: savingPayout ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>
                {savingPayout ? "Saving..." : "Save payout details"}
              </button>
            </div>

            {/* ── Change password ── */}
            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "28px", gridColumn: "1 / -1" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 16px" }}>Change password</p>

              {!hasPasswordAuth ? (
                <div style={{ background: "#f9f9f7", borderRadius: "10px", padding: "16px", fontSize: "13px", color: "#5F5E5A" }}>
                  You signed in with a social login (Google, etc.). Your password is managed by your identity provider.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", alignItems: "end" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Current password</label>
                    <input type="password" value={passwordForm.current}
                      onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>New password</label>
                    <input type="password" value={passwordForm.next}
                      onChange={e => setPasswordForm(p => ({ ...p, next: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "#888780", display: "block", marginBottom: "6px" }}>Confirm new password</label>
                    <input type="password" value={passwordForm.confirm}
                      onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} style={inputStyle} />
                  </div>

                  {passwordMessage && (
                    <div style={{
                      gridColumn: "1 / -1",
                      padding: "8px 12px", borderRadius: "8px", marginTop: "8px", fontSize: "12px",
                      background: passwordMessage.type === "success" ? "#E1F5EE" : "#FDEDEC",
                      color: passwordMessage.type === "success" ? "#0F6E56" : "#922B21",
                    }}>
                      {passwordMessage.text}
                    </div>
                  )}

                  <div style={{ gridColumn: "1 / -1" }}>
                    <button onClick={changePassword} disabled={changingPassword} style={{
                      background: changingPassword ? "#C8C5F0" : "#7F77DD", color: "white", border: "none",
                      borderRadius: "100px", padding: "10px 24px", fontSize: "13px", fontWeight: "500",
                      cursor: changingPassword ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}>
                      {changingPassword ? "Updating..." : "Update password"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── AI Rights Agreement (display only) ── */}
            <div style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "12px", padding: "28px", gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "#2C2C2A", margin: 0 }}>AI Publishing Rights Agreement</p>
                <span style={{ background: "#E1F5EE", color: "#0F6E56", borderRadius: "100px", padding: "4px 14px", fontSize: "12px", fontWeight: "500" }}>Signed ✓</span>
              </div>
              {[
                { label: "Agreement type",    value: "Exclusive AI Publishing Rights"         },
                { label: "Duration",          value: "5 years per book from upload date"      },
                { label: "Revenue share",     value: `₹${ratePerMillion}/M output tokens (set at approval)` },
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
                  I confirm I hold AI publishing rights for this book and agree to grant Firstchapter.ai exclusive AI querying rights for 5 years. Royalty paid per million output tokens generated against this book, at the rate communicated during publisher onboarding approval.{" "}
                  <span onClick={() => setShowAgreement(true)} style={{ textDecoration: "underline", cursor: "pointer" }}>View full agreement</span>
                </p>
              </label>
            </div>

            <div style={{ background: "#E1F5EE", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", color: "#0F6E56", margin: 0 }}>💰 You earn based on output tokens generated, at your approved rate. Payouts processed monthly once minimum threshold (₹500) is reached.</p>
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
                { title: "3. Revenue Share",    body: "Platform shall pay Publisher per-token royalty for queries generated against the Work. Rate is set during publisher onboarding approval (typically ₹5–₹10 per million output tokens) and may be reviewed periodically. Paid monthly when minimum payout threshold (₹500) is reached, otherwise quarterly." },
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
    </PublisherAccessGate>
  );
}
