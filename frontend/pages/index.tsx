import { useState } from "react";
import { useStore } from "../lib/store";
import { discoverBooks, queryBooks, exportToDoc, exportToPpt, createShareLink } from "../lib/api";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { Search, BookOpen, Send, Download, Share2, Save, Users, ChevronRight, X, FileText, Presentation } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

// ── Landing Page ──────────────────────────────────────────────────────────────

function LandingPage() {
  const router = useRouter();

  const roles = [
    {
      id:          "reader",
      emoji:       "📚",
      title:       "Reader",
      description: "Discover and query thousands of licensed books. Get instant cited answers on any topic. Free to start.",
      cta:         "Start reading free",
      color:       "#1D9E75",
      bg:          "#E1F5EE",
      path:        "/signup",
    },
    {
      id:          "publisher",
      emoji:       "✍️",
      title:       "Author / Publisher",
      description: "Upload your books and earn ₹0.50 per query. Reach thousands of readers at institutions across India.",
      cta:         "Publish your books",
      color:       "#7F77DD",
      bg:          "#EEEDFE",
      path:        "/sign-up?role=publisher",
    },
    {
      id:          "institution",
      emoji:       "🏛️",
      title:       "Institution / Library",
      description: "Give your students access to thousands of books. Subscription starting at ₹2,00,000 per year.",
      cta:         "Get institution access",
      color:       "#378ADD",
      bg:          "#E6F1FB",
      path:        "/sign-up?role=institution",
    },
  ];

  const stats = [
    { value: "10,000+", label: "Licensed books"       },
    { value: "50+",     label: "Institutions"          },
    { value: "1M+",     label: "Queries answered"      },
    { value: "₹0.50",   label: "Per query to authors"  },
  ];

  const features = [
    { icon: "🔍", title: "Discover by topic",     description: "Search any topic and instantly find the most relevant licensed books that cover it deeply." },
    { icon: "💬", title: "Ask the book",           description: "Have a full conversation with any book. Get cited answers from specific chapters." },
    { icon: "🧠", title: "AI with memory",         description: "Follow-up questions build on previous answers. Context is never lost in a session." },
    { icon: "📄", title: "Export and share",       description: "Export your research as Word or PowerPoint. Share sessions with classmates instantly." },
    { icon: "⚖️", title: "Licensed content",       description: "Every book is properly licensed. Publishers and authors are paid fairly per query." },
    { icon: "🏛️", title: "Built for institutions", description: "Bulk student management, usage analytics, and query budget tracking for admins." },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f9f9f7", minHeight: "100vh" }}>

      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 60px", background: "white",
        borderBottom: "0.5px solid #e5e4dc",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color: "#2C2C2A", margin: 0 }}>
          First<span style={{ color: "#1D9E75" }}>chapter</span>
          <span style={{ fontSize: "11px", color: "#1D9E75", marginLeft: "6px", fontFamily: "'DM Sans', sans-serif", fontWeight: "500" }}>.ai</span>
        </h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={() => router.push("/sign-in")} style={{
            background: "none", border: "none", fontSize: "14px",
            color: "#5F5E5A", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>
            Sign in
          </button>
          <button onClick={() => router.push("/signup")} style={{
            background: "#1D9E75", color: "white", border: "none",
            borderRadius: "100px", padding: "10px 24px",
            fontSize: "14px", fontWeight: "500", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Start free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "100px 60px 80px", textAlign: "center", background: "white" }}>
        <div style={{ display: "inline-block", background: "#E1F5EE", borderRadius: "100px", padding: "6px 16px", marginBottom: "24px" }}>
          <p style={{ fontSize: "12px", color: "#0F6E56", fontWeight: "500", margin: 0 }}>
            🚀 India's first AI-powered licensed book platform
          </p>
        </div>

        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "72px", lineHeight: 1.05,
          color: "#2C2C2A", margin: "0 0 24px",
          letterSpacing: "-2px",
          maxWidth: "900px", marginLeft: "auto", marginRight: "auto",
        }}>
          Every book.<br />
          Every <span style={{ color: "#1D9E75", fontStyle: "italic" }}>answer.</span>
        </h1>

        <p style={{
          fontSize: "20px", color: "#888780", lineHeight: 1.6,
          maxWidth: "600px", margin: "0 auto 48px", fontWeight: "300",
        }}>
          Ask any question. Get cited answers from thousands of licensed books.
          Built for readers, authors and institutions.
        </p>

        <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginBottom: "24px" }}>
          <button onClick={() => router.push("/signup")} style={{
            background: "#1D9E75", color: "white", border: "none",
            borderRadius: "100px", padding: "16px 40px",
            fontSize: "16px", fontWeight: "500", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Start reading free →
          </button>
          <button onClick={() => router.push("/sign-in")} style={{
            background: "white", color: "#2C2C2A", border: "1px solid #e5e4dc",
            borderRadius: "100px", padding: "16px 40px",
            fontSize: "16px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>
            Sign in
          </button>
        </div>

        <p style={{ fontSize: "13px", color: "#B4B2A9", margin: 0 }}>
          Free to start · No credit card required · 10 free queries every month
        </p>
      </section>

      {/* Stats bar */}
      <section style={{ background: "#2C2C2A", padding: "40px 60px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: "36px", color: "#1D9E75", margin: "0 0 4px" }}>{stat.value}</p>
            <p style={{ fontSize: "13px", color: "#888780", margin: 0 }}>{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Three roles */}
      <section style={{ padding: "100px 60px", background: "#f9f9f7" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <p style={{ fontSize: "12px", fontWeight: "500", letterSpacing: "2px", color: "#888780", textTransform: "uppercase" as const, marginBottom: "12px" }}>
            Who is Firstchapter for?
          </p>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "48px", color: "#2C2C2A", margin: 0, letterSpacing: "-1px" }}>
            Built for everyone in the<br />
            <span style={{ color: "#1D9E75", fontStyle: "italic" }}>knowledge ecosystem</span>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", maxWidth: "1100px", margin: "0 auto" }}>
          {roles.map((role, i) => (
            <div key={i}
              style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "20px", padding: "40px 32px", display: "flex", flexDirection: "column" as const, cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: role.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", marginBottom: "20px" }}>
                {role.emoji}
              </div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#2C2C2A", margin: "0 0 12px" }}>{role.title}</h3>
              <p style={{ fontSize: "15px", color: "#888780", lineHeight: 1.6, margin: "0 0 32px", flex: 1 }}>{role.description}</p>
              <button onClick={() => router.push(role.path)} style={{
                background: role.color, color: "white", border: "none",
                borderRadius: "100px", padding: "14px 28px",
                fontSize: "14px", fontWeight: "500", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", width: "100%",
              }}>
                {role.cta} →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "100px 60px", background: "white" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <p style={{ fontSize: "12px", fontWeight: "500", letterSpacing: "2px", color: "#888780", textTransform: "uppercase" as const, marginBottom: "12px" }}>
            How it works
          </p>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "48px", color: "#2C2C2A", margin: 0, letterSpacing: "-1px" }}>
            From question to <span style={{ color: "#1D9E75", fontStyle: "italic" }}>cited answer</span> in seconds
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "40px", maxWidth: "900px", margin: "0 auto" }}>
          {[
            { step: "01", title: "Search a topic",  desc: "Type any topic or question. Firstchapter finds the most relevant licensed books instantly." },
            { step: "02", title: "Select books",     desc: "Choose one or more books to discuss. See exactly how deeply each covers your topic." },
            { step: "03", title: "Ask anything",     desc: "Have a full conversation. Every answer is cited to the exact book and chapter." },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: "56px", color: "#e5e4dc", margin: "0 0 16px" }}>{item.step}</p>
              <h3 style={{ fontSize: "18px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 10px" }}>{item.title}</h3>
              <p style={{ fontSize: "14px", color: "#888780", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: "100px 60px", background: "#f9f9f7" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "48px", color: "#2C2C2A", margin: 0, letterSpacing: "-1px" }}>
            Everything you need to <span style={{ color: "#1D9E75", fontStyle: "italic" }}>read smarter</span>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", maxWidth: "1000px", margin: "0 auto" }}>
          {features.map((feat, i) => (
            <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "16px", padding: "28px 24px" }}>
              <p style={{ fontSize: "32px", margin: "0 0 14px" }}>{feat.icon}</p>
              <h3 style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 8px" }}>{feat.title}</h3>
              <p style={{ fontSize: "14px", color: "#888780", lineHeight: 1.6, margin: 0 }}>{feat.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Publisher CTA */}
      <section style={{ padding: "100px 60px", background: "#2C2C2A", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "48px", color: "white", margin: "0 0 16px", letterSpacing: "-1px" }}>
          Are you an author or publisher?
        </h2>
        <p style={{ fontSize: "18px", color: "#888780", margin: "0 auto 40px", maxWidth: "500px", lineHeight: 1.6 }}>
          Upload your books and earn ₹0.50 every time a reader queries your content. Paid monthly. No setup cost.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <button onClick={() => router.push("/sign-up?role=publisher")} style={{
            background: "#1D9E75", color: "white", border: "none",
            borderRadius: "100px", padding: "16px 40px",
            fontSize: "16px", fontWeight: "500", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Start publishing →
          </button>
          <button onClick={() => router.push("/sign-up?role=institution")} style={{
            background: "none", color: "white", border: "1px solid #5F5E5A",
            borderRadius: "100px", padding: "16px 40px",
            fontSize: "16px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>
            For institutions
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "40px 60px", background: "#1A1A18", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "20px", color: "white", margin: 0 }}>
          First<span style={{ color: "#1D9E75" }}>chapter</span>.ai
        </h1>
        <div style={{ display: "flex", gap: "32px" }}>
          {["For Readers", "For Publishers", "For Institutions", "Privacy", "Terms"].map((link, i) => (
            <p key={i} style={{ fontSize: "13px", color: "#888780", margin: 0, cursor: "pointer" }}>{link}</p>
          ))}
        </div>
        <p style={{ fontSize: "12px", color: "#5F5E5A", margin: 0 }}>© 2026 Firstchapter.ai — Chennai, India</p>
      </footer>
    </div>
  );
}

// ── Book Tile ─────────────────────────────────────────────────────────────────

function BookTile({ book, selected, onToggle }: any) {
  return (
    <div
      onClick={() => onToggle(book.book_id)}
      className={`relative cursor-pointer rounded-xl border p-4 transition-all ${
        selected ? "border-brand-400 bg-brand-50 shadow-sm" : "border-gray-200 bg-white hover:border-brand-100 hover:bg-gray-50"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-400 flex items-center justify-center">
          <span className="text-white text-xs font-bold">✓</span>
        </div>
      )}
      <div className="flex gap-3">
        <div className="w-10 h-14 rounded flex-shrink-0" style={{ background: stringToColor(book.book_title) }} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">{book.book_title}</p>
          <p className="text-xs text-gray-500 mb-2">{book.author}</p>
          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">{book.category}</span>
        </div>
      </div>
      {book.topic_coverage && (
        <p className="mt-3 text-xs text-gray-600 leading-relaxed line-clamp-3">{book.topic_coverage}</p>
      )}
      <div className="mt-2 flex items-center gap-1">
        <div className="h-1 rounded-full bg-brand-400" style={{ width: `${Math.round((book.score || 0.5) * 100)}%`, maxWidth: "100%" }} />
        <span className="text-xs text-gray-400 ml-1">{Math.round((book.score || 0.5) * 100)}% match</span>
      </div>
    </div>
  );
}

// ── Chat Message ──────────────────────────────────────────────────────────────

function ChatMessage({ message, onSuggestionClick }: { message: any; onSuggestionClick?: (s: string) => void }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? "order-2" : "order-1"}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "bg-brand-400 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}>
          {message.content}
        </div>
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.sources.map((s: any, i: number) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">
                {s.book_title} — {s.chapter}
              </span>
            ))}
          </div>
        )}
        {!isUser && message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            <p className="text-xs text-gray-400 ml-1">You might also ask:</p>
            {message.suggestions.map((s: string, i: number) => (
              <button key={i} onClick={() => onSuggestionClick && onSuggestionClick(s)}
                className="text-left text-xs px-3 py-2 rounded-xl border border-brand-100 text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors">
                → {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ view, onSetView }: any) {
  const { queriesLeft, resetChat } = useStore();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const navItems = [
    { id: "home",    label: "Home",    icon: Search   },
    { id: "history", label: "History", icon: BookOpen },
    { id: "saved",   label: "Saved",   icon: Save     },
  ];

  return (
    <aside className="w-56 border-r border-gray-100 bg-white flex flex-col h-full">
      <div className="p-5 border-b border-gray-100">
        <span className="font-serif text-xl text-gray-900">
          First<span className="text-brand-400">chapter</span>
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { onSetView(id); if (id === "home") resetChat(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${view === id ? "bg-brand-50 text-brand-600 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {user && (
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-600">
              {user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{user.firstName || "User"}</p>
              <p className="text-xs text-gray-400 truncate capitalize">{(user.publicMetadata?.role as string) || "reader"}</p>
            </div>
          </div>
          <button onClick={() => signOut()} className="w-full text-xs text-gray-400 hover:text-gray-600 text-left px-1">
            Sign out
          </button>
        </div>
      )}

      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Queries remaining</p>
          <p className="text-lg font-medium text-brand-400">{queriesLeft}</p>
          <div className="mt-1.5 h-1 bg-gray-200 rounded-full">
            <div className="h-1 bg-brand-400 rounded-full" style={{ width: `${Math.min((queriesLeft / 100) * 100, 100)}%` }} />
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function Home() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const {
    topic, setTopic,
    discoveredBooks, setDiscoveredBooks,
    selectedBookIds, toggleBookSelection,
    isDiscovering, setIsDiscovering,
    sessionId, setSessionId,
    messages, addMessage,
    isQuerying, setIsQuerying,
    queriesLeft, setQueriesLeft,
    view, setView, resetChat,
  } = useStore();

  const [inputValue, setInputValue]   = useState("");
  const [chatInput, setChatInput]     = useState("");
  const [showExport, setShowExport]   = useState(false);

  // Show landing page for logged-out users
  if (!isLoaded) return null;
  if (!user) return <LandingPage />;

  // Redirect based on role after login
  const role = user.publicMetadata?.role as string;
  if (role === "publisher"   && typeof window !== "undefined" && window.location.pathname === "/") {
    router.push("/publisher");
    return null;
  }
  if (role === "institution" && typeof window !== "undefined" && window.location.pathname === "/") {
    router.push("/institution");
    return null;
  }

  const handleDiscover = async () => {
    if (!inputValue.trim()) return;
    setTopic(inputValue);
    setIsDiscovering(true);
    setView("discover");
    try {
      const data = await discoverBooks(inputValue);
      setDiscoveredBooks(data.books || []);
    } catch (e) {
      toast.error("Could not find books. Try again.");
      setDiscoveredBooks([]);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleQuery = async () => {
    if (!chatInput.trim()) return;
    const question = chatInput.trim();
    setChatInput("");
    setView("chat");
    const userMsg = { id: uuidv4(), role: "user" as const, content: question, timestamp: new Date().toISOString() };
    addMessage(userMsg);
    setIsQuerying(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const data = await queryBooks(question, selectedBookIds.length > 0 ? selectedBookIds : null, sessionId, history);
      if (!sessionId) setSessionId(data.session_id);
      setQueriesLeft(data.queries_remaining);
      addMessage({ id: uuidv4(), role: "assistant", content: data.answer, sources: data.sources, suggestions: data.suggestions || [], timestamp: new Date().toISOString() });
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Query failed.";
      toast.error(msg);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleExportDoc = async () => {
    if (!sessionId) return;
    await exportToDoc(sessionId, topic || "Firstchapter Session");
    toast.success("Downloaded as Word document");
  };

  const handleExportPpt = async () => {
    if (!sessionId) return;
    await exportToPpt(sessionId, topic || "Firstchapter Session");
    toast.success("Downloaded as PowerPoint");
  };

  const handleShare = async () => {
    if (!sessionId) return;
    try {
      const data = await createShareLink("", sessionId);
      await navigator.clipboard.writeText(data.share_url);
      toast.success("Share link copied to clipboard");
    } catch {
      toast.error("Could not create share link");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar view={view} onSetView={setView} />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* HOME */}
        {view === "home" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <h1 className="font-serif text-4xl text-gray-900 mb-2 text-center">
              What do you want to <span className="text-brand-400 italic">explore</span> today?
            </h1>
            <p className="text-gray-500 mb-10 text-center text-sm">
              Type a topic or question — we'll find the books that answer it.
            </p>
            <div className="w-full max-w-xl">
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <Search size={18} className="text-gray-400 flex-shrink-0" />
                <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === "Enter" && handleDiscover()}
                  placeholder="e.g. What causes market bubbles?"
                  className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent" />
                <button onClick={handleDiscover} className="bg-brand-400 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
                  Search
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DISCOVER */}
        {view === "discover" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-white flex items-center gap-3">
              <button onClick={resetChat} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              <div>
                <p className="text-xs text-gray-400">Results for</p>
                <p className="font-medium text-gray-800 text-sm">"{topic}"</p>
              </div>
              {selectedBookIds.length > 0 && (
                <button onClick={() => setView("chat")} className="ml-auto flex items-center gap-2 bg-brand-400 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
                  Discuss {selectedBookIds.length} book{selectedBookIds.length > 1 ? "s" : ""} <ChevronRight size={16} />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {isDiscovering ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Finding relevant books...</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">{discoveredBooks.length} books found — select one or more to discuss</p>
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                    {discoveredBooks.map((book: any) => (
                      <BookTile key={book.book_id} book={book} selected={selectedBookIds.includes(book.book_id)} onToggle={toggleBookSelection} />
                    ))}
                  </div>
                </>
              )}
            </div>
            {!isDiscovering && (
              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleQuery()}
                    placeholder={selectedBookIds.length > 0 ? `Ask about ${selectedBookIds.length} selected book(s)...` : "Select books above or ask across all books..."}
                    className="flex-1 outline-none text-sm bg-transparent placeholder-gray-400" />
                  <button onClick={handleQuery} disabled={!chatInput.trim()} className="w-8 h-8 rounded-full bg-brand-400 flex items-center justify-center disabled:opacity-40 hover:bg-brand-600 transition-colors">
                    <Send size={14} className="text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHAT */}
        {view === "chat" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center gap-3">
              <button onClick={() => setView("discover")} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              <p className="text-sm text-gray-600 flex-1">{selectedBookIds.length > 0 ? `Discussing ${selectedBookIds.length} book(s)` : "All books"}</p>
              {sessionId && (
                <div className="flex items-center gap-2">
                  <button onClick={handleShare} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Share"><Share2 size={16} /></button>
                  <div className="relative">
                    <button onClick={() => setShowExport(!showExport)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Export"><Download size={16} /></button>
                    {showExport && (
                      <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 min-w-[160px]">
                        <button onClick={() => { handleExportDoc(); setShowExport(false); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <FileText size={14} /> Export to Word
                        </button>
                        <button onClick={() => { handleExportPpt(); setShowExport(false); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <Presentation size={14} /> Export to PPT
                        </button>
                      </div>
                    )}
                  </div>
                  <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Invite"><Users size={16} /></button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <BookOpen size={32} className="text-brand-400 mb-3" />
                  <p className="text-gray-700 font-medium text-sm mb-1">Ready to explore</p>
                  <p className="text-gray-400 text-xs mb-6">Try one of these to get started</p>
                  <div className="flex flex-col gap-2 w-full max-w-lg">
                    {["Give me an overview of this book", "What are the main ideas and arguments?", "What is the most important lesson from this book?", "Summarise the key concepts chapter by chapter", "What problems does this book try to solve?", "How is this book relevant to today's world?"].map((q, i) => (
                      <button key={i} onClick={() => setChatInput(q)}
                        className="text-left text-xs px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 bg-white hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all">
                        → {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(m => (
                <ChatMessage key={m.id} message={m} onSuggestionClick={s => setChatInput(s)} />
              ))}
              {isQuerying && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleQuery()}
                  placeholder="Ask a follow-up question..."
                  className="flex-1 outline-none text-sm bg-transparent placeholder-gray-400" />
                <button onClick={handleQuery} disabled={!chatInput.trim() || isQuerying}
                  className="w-8 h-8 rounded-full bg-brand-400 flex items-center justify-center disabled:opacity-40 hover:bg-brand-600 transition-colors">
                  <Send size={14} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {view === "history" && (
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="font-serif text-2xl text-gray-900 mb-6">Previous chats</h2>
            <p className="text-sm text-gray-500">Your query history will appear here.</p>
          </div>
        )}

        {/* SAVED */}
        {view === "saved" && (
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="font-serif text-2xl text-gray-900 mb-6">Saved answers</h2>
            <p className="text-sm text-gray-500">Answers you save will appear here.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function stringToColor(str: string): string {
  const colors = ["#5DCAA5", "#85B7EB", "#F0997B", "#AFA9EC", "#F4C0D1", "#97C459", "#FAC775", "#5DCAA5"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
