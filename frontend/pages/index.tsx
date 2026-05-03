import { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "../lib/store";
import { discoverBooks, queryBooks, exportToDoc, exportToPpt, createShareLink, setApiUserId } from "../lib/api";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { Search, BookOpen, Send, Download, Share2, Save, Users, ChevronRight, X, FileText, Presentation, ChevronDown, Trash2, Bookmark, User, Settings as SettingsIcon, TrendingUp, LogOut } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Landing Page ──────────────────────────────────────────────────────────────

function LandingPage() {
  const router = useRouter();
  const [showSignInMenu, setShowSignInMenu] = useState(false);
  const [showHeroSignInMenu, setShowHeroSignInMenu] = useState(false);
  const signInRef = useRef<HTMLDivElement>(null);
  const heroSignInRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (signInRef.current && !signInRef.current.contains(e.target as Node)) setShowSignInMenu(false);
      if (heroSignInRef.current && !heroSignInRef.current.contains(e.target as Node)) setShowHeroSignInMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const signInOptions = [
    { label: "Reader",      icon: "📚", path: "/sign-in"                 },
    { label: "Publisher",   icon: "✍️", path: "/sign-in?role=publisher"   },
    { label: "Institution", icon: "🏛️", path: "/institution/sign-in"      },
  ];

  const roles = [
    {
      emoji:       "📚",
      title:       "Reader",
      description: "Discover and query thousands of licensed books. Get instant cited answers on any topic. Free to start.",
      cta:         "Start reading free",
      color:       "#1D9E75",
      bg:          "#E1F5EE",
      path:        "/sign-up",
    },
    {
      emoji:       "✍️",
      title:       "Author / Publisher",
      description: "Upload your books and earn ₹0.50 per query. Reach thousands of readers at institutions across India.",
      cta:         "Start publishing",
      color:       "#7F77DD",
      bg:          "#EEEDFE",
      path:        "/publisher-signup",
    },
    {
      emoji:       "🏛️",
      title:       "Institution / Library",
      description: "Give your students access to thousands of books. Subscription starting at ₹2,00,000 per year.",
      cta:         "Get institution access",
      color:       "#378ADD",
      bg:          "#E6F1FB",
      path:        "/institution/sign-up",
    },
  ];

  const features = [
    { icon: "🔍", title: "Discover by topic",     description: "Search any topic and find the most relevant licensed books that cover it deeply." },
    { icon: "💬", title: "Ask the book",           description: "Have a full conversation with any book. Get cited answers from specific chapters." },
    { icon: "🧠", title: "AI with memory",         description: "Follow-up questions build on previous answers. Context is never lost." },
    { icon: "📄", title: "Export and share",       description: "Export research as Word or PowerPoint. Share sessions with classmates." },
    { icon: "⚖️", title: "Licensed content",       description: "Every book is properly licensed. Publishers are paid fairly per query." },
    { icon: "🏛️", title: "Built for institutions", description: "Bulk student management, usage analytics, and query budget tracking." },
  ];

  const DropdownMenu = ({ options, show, ref: menuRef }: any) => (
    show ? (
      <div ref={menuRef} style={{
        position: "absolute", top: "calc(100% + 8px)", right: 0,
        background: "white", border: "0.5px solid #e5e4dc",
        borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        overflow: "hidden", zIndex: 100, minWidth: "180px",
      }}>
        {options.map((opt: any, i: number) => (
          <button key={i} onClick={() => router.push(opt.path)} style={{
            width: "100%", padding: "12px 16px", border: "none",
            background: "none", display: "flex", alignItems: "center", gap: "10px",
            fontSize: "14px", color: "#2C2C2A", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", textAlign: "left" as const,
            borderBottom: i < options.length - 1 ? "0.5px solid #f0efea" : "none",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#f9f9f7"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    ) : null
  );

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f9f9f7", minHeight: "100vh" }}>

      {/* Nav — Black */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 40px", background: "#1A1A18",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color: "white", margin: 0 }}>
          First<span style={{ color: "#1D9E75" }}>chapter</span>
          <span style={{ fontSize: "11px", color: "#1D9E75", marginLeft: "6px", fontFamily: "'DM Sans', sans-serif", fontWeight: "500" }}>.ai</span>
        </h1>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Sign in dropdown */}
          <div ref={signInRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowSignInMenu(!showSignInMenu)}
              style={{
                background: "none", border: "0.5px solid #3C3C3A", fontSize: "14px",
                color: "white", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                borderRadius: "100px", padding: "10px 18px",
                display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              Sign in <ChevronDown size={14} />
            </button>
            <DropdownMenu options={signInOptions} show={showSignInMenu} ref={signInRef} />
          </div>

          <button onClick={() => router.push("/sign-up")} style={{
            background: "#1D9E75", color: "white", border: "none",
            borderRadius: "100px", padding: "10px 20px",
            fontSize: "14px", fontWeight: "500", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Start reading free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "80px 40px 60px", textAlign: "center", background: "white" }}>
        <div style={{ display: "inline-block", background: "#E1F5EE", borderRadius: "100px", padding: "6px 16px", marginBottom: "24px" }}>
          <p style={{ fontSize: "12px", color: "#0F6E56", fontWeight: "500", margin: 0 }}>
            🚀 India's first AI-powered licensed book platform
          </p>
        </div>

        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "clamp(40px, 8vw, 80px)", lineHeight: 1.05,
          color: "#2C2C2A", margin: "0 0 24px",
          letterSpacing: "-2px",
          maxWidth: "900px", marginLeft: "auto", marginRight: "auto",
        }}>
          Every book.<br />
          Every <span style={{ color: "#1D9E75", fontStyle: "italic" }}>answer.</span>
        </h1>

        <p style={{
          fontSize: "clamp(16px, 3vw, 20px)", color: "#888780", lineHeight: 1.6,
          maxWidth: "560px", margin: "0 auto 48px", fontWeight: "300",
        }}>
          Ask any question. Get cited answers from thousands of licensed books.
          Built for readers, authors and institutions.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", marginBottom: "24px" }}>
          {/* Start reading free */}
          <button onClick={() => router.push("/sign-up")} style={{
            background: "#1D9E75", color: "white", border: "none",
            borderRadius: "100px", padding: "16px 36px",
            fontSize: "16px", fontWeight: "500", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Start reading free →
          </button>

          {/* Sign in dropdown in hero */}
          <div ref={heroSignInRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowHeroSignInMenu(!showHeroSignInMenu)}
              style={{
                background: "white", color: "#2C2C2A", border: "1px solid #e5e4dc",
                borderRadius: "100px", padding: "16px 36px",
                fontSize: "16px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", gap: "8px",
              }}
            >
              Sign in <ChevronDown size={16} />
            </button>
            <DropdownMenu options={signInOptions} show={showHeroSignInMenu} ref={heroSignInRef} />
          </div>
        </div>

        <p style={{ fontSize: "13px", color: "#B4B2A9", margin: 0 }}>
          Free to start · No credit card required · 10 free queries every month
        </p>
      </section>

      {/* Three roles */}
      <section style={{ padding: "60px 40px", background: "#f9f9f7" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={{ fontSize: "12px", fontWeight: "500", letterSpacing: "2px", color: "#888780", textTransform: "uppercase" as const, marginBottom: "12px" }}>
            Who is Firstchapter for?
          </p>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 6vw, 48px)", color: "#2C2C2A", margin: 0, letterSpacing: "-1px" }}>
            Built for everyone in the<br />
            <span style={{ color: "#1D9E75", fontStyle: "italic" }}>knowledge ecosystem</span>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", maxWidth: "1100px", margin: "0 auto" }}>
          {roles.map((role, i) => (
            <div key={i} style={{
              background: "white", border: "0.5px solid #e5e4dc",
              borderRadius: "20px", padding: "32px 24px",
              display: "flex", flexDirection: "column" as const,
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: role.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", marginBottom: "20px" }}>
                {role.emoji}
              </div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "26px", color: "#2C2C2A", margin: "0 0 12px" }}>{role.title}</h3>
              <p style={{ fontSize: "15px", color: "#888780", lineHeight: 1.6, margin: "0 0 28px", flex: 1 }}>{role.description}</p>
              <button onClick={() => router.push(role.path)} style={{
                background: role.color, color: "white", border: "none",
                borderRadius: "100px", padding: "13px 24px",
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
      <section style={{ padding: "60px 40px", background: "white" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={{ fontSize: "12px", fontWeight: "500", letterSpacing: "2px", color: "#888780", textTransform: "uppercase" as const, marginBottom: "12px" }}>
            How it works
          </p>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 5vw, 48px)", color: "#2C2C2A", margin: 0, letterSpacing: "-1px" }}>
            From question to <span style={{ color: "#1D9E75", fontStyle: "italic" }}>cited answer</span> in seconds
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "32px", maxWidth: "900px", margin: "0 auto" }}>
          {[
            { step: "01", title: "Search a topic", desc: "Type any topic or question. Firstchapter finds the most relevant licensed books instantly." },
            { step: "02", title: "Select books",    desc: "Choose one or more books to discuss. See exactly how deeply each covers your topic." },
            { step: "03", title: "Ask anything",    desc: "Have a full conversation. Every answer is cited to the exact book and chapter." },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: "56px", color: "#e5e4dc", margin: "0 0 16px" }}>{item.step}</p>
              <h3 style={{ fontSize: "18px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 10px" }}>{item.title}</h3>
              <p style={{ fontSize: "14px", color: "#888780", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "60px 40px", background: "#f9f9f7" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 5vw, 48px)", color: "#2C2C2A", margin: 0, letterSpacing: "-1px" }}>
            Everything you need to <span style={{ color: "#1D9E75", fontStyle: "italic" }}>read smarter</span>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", maxWidth: "1000px", margin: "0 auto" }}>
          {features.map((feat, i) => (
            <div key={i} style={{ background: "white", border: "0.5px solid #e5e4dc", borderRadius: "16px", padding: "24px" }}>
              <p style={{ fontSize: "32px", margin: "0 0 14px" }}>{feat.icon}</p>
              <h3 style={{ fontSize: "16px", fontWeight: "500", color: "#2C2C2A", margin: "0 0 8px" }}>{feat.title}</h3>
              <p style={{ fontSize: "14px", color: "#888780", lineHeight: 1.6, margin: 0 }}>{feat.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA — Publishers and Institutions */}
      <section style={{ padding: "60px 40px", background: "#1A1A18" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 5vw, 48px)", color: "white", margin: "0 0 16px", letterSpacing: "-1px" }}>
              Join the knowledge ecosystem
            </h2>
            <p style={{ fontSize: "18px", color: "#888780", margin: 0, lineHeight: 1.6 }}>
              Whether you create knowledge or distribute it — Firstchapter is built for you.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {/* Publisher CTA */}
            <div style={{ background: "#2C2C2A", borderRadius: "20px", padding: "32px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", marginBottom: "16px" }}>
                ✍️
              </div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color: "white", margin: "0 0 10px" }}>
                Authors & Publishers
              </h3>
              <p style={{ fontSize: "14px", color: "#888780", lineHeight: 1.6, margin: "0 0 24px" }}>
                Upload your books and earn ₹0.50 every time a reader queries your content. Paid monthly. No setup cost.
              </p>
              <button onClick={() => router.push("/publisher-signup")} style={{
                background: "#7F77DD", color: "white", border: "none",
                borderRadius: "100px", padding: "13px 28px",
                fontSize: "14px", fontWeight: "500", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", width: "100%",
              }}>
                Start publishing →
              </button>
            </div>

            {/* Institution CTA */}
            <div style={{ background: "#2C2C2A", borderRadius: "20px", padding: "32px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", marginBottom: "16px" }}>
                🏛️
              </div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color: "white", margin: "0 0 10px" }}>
                Institutions & Libraries
              </h3>
              <p style={{ fontSize: "14px", color: "#888780", lineHeight: 1.6, margin: "0 0 24px" }}>
                Give your students access to thousands of books. Flat annual subscription. Starting at ₹2,00,000/year.
              </p>
              <button onClick={() => router.push("/institution-signup")} style={{
                background: "#378ADD", color: "white", border: "none",
                borderRadius: "100px", padding: "13px 28px",
                fontSize: "14px", fontWeight: "500", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", width: "100%",
              }}>
                Get institution access →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px 40px", background: "#111110", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "20px", color: "white", margin: 0 }}>
          First<span style={{ color: "#1D9E75" }}>chapter</span>.ai
        </h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
          {["For Readers", "For Publishers", "For Institutions", "Privacy", "Terms"].map((link, i) => (
            <p key={i} style={{ fontSize: "13px", color: "#5F5E5A", margin: 0, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.color = "#888780"}
              onMouseLeave={e => e.currentTarget.style.color = "#5F5E5A"}
            >{link}</p>
          ))}
        </div>
        <p style={{ fontSize: "12px", color: "#3C3C3A", margin: 0 }}>© 2026 Firstchapter.ai — Chennai, India</p>
      </footer>
    </div>
  );
}

// ── Book Tile ─────────────────────────────────────────────────────────────────
function BookTile({ book, selected, onToggle }: any) {
  return (
    <div onClick={() => onToggle(book.book_id)} className={`relative cursor-pointer rounded-xl border p-4 transition-all ${selected ? "border-brand-400 bg-brand-50 shadow-sm" : "border-gray-200 bg-white hover:border-brand-100 hover:bg-gray-50"}`}>
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
      {book.topic_coverage && <p className="mt-3 text-xs text-gray-600 leading-relaxed line-clamp-3">{book.topic_coverage}</p>}
      <div className="mt-2 flex items-center gap-1">
        <div className="h-1 rounded-full bg-brand-400" style={{ width: `${Math.round((book.score || 0.5) * 100)}%`, maxWidth: "100%" }} />
        <span className="text-xs text-gray-400 ml-1">{Math.round((book.score || 0.5) * 100)}% match</span>
      </div>
    </div>
  );
}

// ── Chat Message ──────────────────────────────────────────────────────────────
function ChatMessage({ message, onSuggestionClick, onSave }: { message: any; onSuggestionClick?: (s: string) => void; onSave?: (msg: any) => void }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? "order-2" : "order-1"}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "bg-brand-400 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}>
          {message.content}
        </div>
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1 items-center">
            {message.sources.map((s: any, i: number) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">{s.book_title} — {s.chapter}</span>
            ))}
            {onSave && (
              <button onClick={() => onSave(message)} className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-100 transition-all flex items-center gap-1">
                <Bookmark size={10} /> Save
              </button>
            )}
          </div>
        )}
        {!isUser && message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            <p className="text-xs text-gray-400 ml-1">You might also ask:</p>
            {message.suggestions.map((s: string, i: number) => (
              <button key={i} onClick={() => onSuggestionClick && onSuggestionClick(s)} className="text-left text-xs px-3 py-2 rounded-xl border border-brand-100 text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors">
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [tokenUsagePercent, setTokenUsagePercent] = useState(0);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  
  // Fetch token usage
  useEffect(() => {
    const fetchTokenUsage = async () => {
      if (!user?.id) return;
      
      try {
        setLoadingTokens(true);
        const response = await fetch(`/api/usage/tokens?user_id=${user.id}&days=30`);
        const data = await response.json();
        
        const totalAllocated = (data.tokens_allocated || 0);
        const totalUsed = (data.total_input_tokens || 0) + (data.total_output_tokens || 0);
        
        if (totalAllocated > 0) {
          const percentage = Math.round((totalUsed / totalAllocated) * 100);
          setTokenUsagePercent(Math.min(percentage, 100));
        } else {
          setTokenUsagePercent(0);
        }
      } catch (error) {
        console.error('Failed to fetch token usage:', error);
        setTokenUsagePercent(0);
      } finally {
        setLoadingTokens(false);
      }
    };
    
    fetchTokenUsage();
  }, [user?.id]);
  
  const navItems = [
    { id: "home",    label: "Home",    icon: Search   },
    { id: "history", label: "History", icon: BookOpen },
    { id: "saved",   label: "Saved",   icon: Save     },
  ];
  return (
    <aside className="w-56 border-r border-gray-100 bg-white flex flex-col h-full">
      <div className="p-5 border-b border-gray-100">
        <span className="font-serif text-xl text-gray-900">First<span className="text-brand-400">chapter</span></span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { onSetView(id); if (id === "home") resetChat(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${view === id ? "bg-brand-50 text-brand-600 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </nav>
      {user && (
        <div className="p-4 border-t border-gray-100" ref={profileMenuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center gap-2 hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-medium text-brand-600 flex-shrink-0">
              {user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-800 truncate">{user.firstName || "User"}</p>
              <p className="text-xs text-gray-400 truncate">{user.emailAddresses[0]?.emailAddress}</p>
            </div>
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}
            />
          </button>
          
          {/* Dropdown Menu */}
          {showProfileMenu && (
            <div className="mt-2 py-1 bg-white border border-gray-200 rounded-lg shadow-lg">
              <button
                onClick={() => {
                  router.push('/reader');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User size={14} className="text-gray-400" />
                <span>Dashboard</span>
              </button>
              
              <button
                onClick={() => {
                  router.push('/reader?tab=usage');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <TrendingUp size={14} className="text-gray-400" />
                <span>Usage</span>
              </button>
              
              <button
                onClick={() => {
                  router.push('/reader?tab=settings');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <SettingsIcon size={14} className="text-gray-400" />
                <span>Settings</span>
              </button>
              
              <div className="h-px bg-gray-200 my-1" />
              
              <button
                onClick={() => {
                  signOut();
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Tokens used</p>
          {loadingTokens ? (
            <p className="text-lg font-medium text-gray-400">...</p>
          ) : (
            <p className="text-lg font-medium text-brand-400">{tokenUsagePercent}%</p>
          )}
          <div className="mt-1.5 h-1 bg-gray-200 rounded-full">
            <div 
              className={`h-1 rounded-full transition-all ${
                tokenUsagePercent >= 95 ? 'bg-red-500' :
                tokenUsagePercent >= 90 ? 'bg-orange-500' :
                tokenUsagePercent >= 80 ? 'bg-yellow-500' :
                'bg-brand-400'
              }`}
              style={{ width: `${tokenUsagePercent}%` }} 
            />
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
  const { topic, setTopic, discoveredBooks, setDiscoveredBooks, selectedBookIds, toggleBookSelection, isDiscovering, setIsDiscovering, sessionId, setSessionId, messages, addMessage, isQuerying, setIsQuerying, queriesLeft, setQueriesLeft, view, setView, resetChat } = useStore();
  const [inputValue, setInputValue] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [showExport, setShowExport] = useState(false);

  if (!isLoaded) return null;
  if (!user) return <LandingPage />;

  const role = (user.unsafeMetadata?.role || user.publicMetadata?.role) as string;
  if (role === "publisher"   && typeof window !== "undefined" && window.location.pathname === "/") { router.push("/publisher");   return null; }
  if (role === "institution" && typeof window !== "undefined" && window.location.pathname === "/") { router.push("/institution"); return null; }
  if (!role && typeof window !== "undefined" && window.location.pathname === "/") { router.push("/onboarding"); return null; }

  // Save user ID for API calls
  setApiUserId(user.id);

  const handleDiscover = async () => {
    if (!inputValue.trim()) return;
    setTopic(inputValue); setIsDiscovering(true); setView("discover");
    try {
      const data = await discoverBooks(inputValue);
      setDiscoveredBooks(data.books || []);
    } catch { toast.error("Could not find books. Try again."); setDiscoveredBooks([]); }
    finally { setIsDiscovering(false); }
  };

  const handleQuery = async () => {
    if (!chatInput.trim()) return;
    const question = chatInput.trim(); setChatInput(""); setView("chat");
    addMessage({ id: uuidv4(), role: "user" as const, content: question, timestamp: new Date().toISOString() });
    setIsQuerying(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const data = await queryBooks(question, selectedBookIds.length > 0 ? selectedBookIds : null, sessionId, history);
      if (!sessionId) setSessionId(data.session_id);
      setQueriesLeft(data.queries_remaining);
      addMessage({ id: uuidv4(), role: "assistant", content: data.answer, sources: data.sources, suggestions: data.suggestions || [], timestamp: new Date().toISOString() });
    } catch (e: any) { toast.error(e?.message || "Query failed."); }
    finally { setIsQuerying(false); }
  };

  const handleExportDoc = async () => { if (!sessionId) return; await exportToDoc(sessionId, topic || "Firstchapter Session"); toast.success("Downloaded as Word document"); };
  const handleExportPpt = async () => { if (!sessionId) return; await exportToPpt(sessionId, topic || "Firstchapter Session"); toast.success("Downloaded as PowerPoint"); };
  const handleShare = async () => {
    if (!sessionId) return;
    try { const data = await createShareLink("", sessionId); await navigator.clipboard.writeText(data.share_url); toast.success("Share link copied!"); }
    catch { toast.error("Could not create share link"); }
  };

  const handleSaveAnswer = async (message: any) => {
    if (!message.sources || message.sources.length === 0) return;
    const source = message.sources[0];
    try {
      await fetch(`${API_URL}/api/saved/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({
  query_id: message.id,
  title:    message.content.slice(0, 80),
  question: messages[messages.indexOf(message) - 1]?.content || "",
  answer:   message.content,
  book:     source.book_title || "",
  chapter:  source.chapter || "",
  book_id:  source.book_id || "",
}),
      });
      toast.success("Answer saved! ✓");
    } catch { toast.error("Could not save answer"); }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <div className="hidden md:flex"><Sidebar view={view} onSetView={setView} /></div>
      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">

        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <span className="font-serif text-xl text-gray-900">First<span className="text-brand-400">chapter</span></span>
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-600">{user?.firstName?.[0] || "U"}</div>
        </div>

        {/* HOME */}
        {view === "home" && (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <h1 className="font-serif text-3xl md:text-4xl text-gray-900 mb-2 text-center">
              What do you want to <span className="text-brand-400 italic">explore</span> today?
            </h1>
            <p className="text-gray-500 mb-8 text-center text-sm">Type a topic or question — we'll find the books that answer it.</p>
            <div className="w-full max-w-xl">
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <Search size={18} className="text-gray-400 flex-shrink-0" />
                <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === "Enter" && handleDiscover()}
                  placeholder="e.g. What causes market bubbles?"
                  className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent" />
                <button onClick={handleDiscover} className="bg-brand-400 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">Search</button>
              </div>
            </div>
          </div>
        )}

        {/* DISCOVER */}
        {view === "discover" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-3">
              <button onClick={resetChat} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              <div>
                <p className="text-xs text-gray-400">Results for</p>
                <p className="font-medium text-gray-800 text-sm">"{topic}"</p>
              </div>
              {selectedBookIds.length > 0 && (
                <button onClick={() => setView("chat")} className="ml-auto flex items-center gap-2 bg-brand-400 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
                  Discuss {selectedBookIds.length} <ChevronRight size={16} />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {isDiscovering ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Finding relevant books...</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">{discoveredBooks.length} books found — select one or more to discuss</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
            <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-3">
              <button onClick={() => setView("discover")} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              <p className="text-sm text-gray-600 flex-1 truncate">{selectedBookIds.length > 0 ? `Discussing ${selectedBookIds.length} book(s)` : "All books"}</p>
              {sessionId && (
                <div className="flex items-center gap-1">
                  <button onClick={handleShare} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Share2 size={16} /></button>
                  <div className="relative">
                    <button onClick={() => setShowExport(!showExport)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Download size={16} /></button>
                    {showExport && (
                      <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 min-w-[160px]">
                        <button onClick={() => { handleExportDoc(); setShowExport(false); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><FileText size={14} /> Export to Word</button>
                        <button onClick={() => { handleExportPpt(); setShowExport(false); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><Presentation size={14} /> Export to PPT</button>
                      </div>
                    )}
                  </div>
                  <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Users size={16} /></button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <BookOpen size={32} className="text-brand-400 mb-3" />
                  <p className="text-gray-700 font-medium text-sm mb-1">Ready to explore</p>
                  <p className="text-gray-400 text-xs mb-6">Try one of these to get started</p>
                  <div className="flex flex-col gap-2 w-full max-w-lg">
                    {["Give me an overview of this book", "What are the main ideas and arguments?", "What is the most important lesson?", "Summarise the key concepts chapter by chapter", "What problems does this book solve?", "How is this book relevant to today's world?"].map((q, i) => (
                      <button key={i} onClick={() => setChatInput(q)} className="text-left text-xs px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 bg-white hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all">→ {q}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(m => <ChatMessage key={m.id} message={m} onSuggestionClick={s => setChatInput(s)} onSave={handleSaveAnswer} />)}
              {isQuerying && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
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
                <button onClick={handleQuery} disabled={!chatInput.trim() || isQuerying} className="w-8 h-8 rounded-full bg-brand-400 flex items-center justify-center disabled:opacity-40 hover:bg-brand-600 transition-colors">
                  <Send size={14} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {view === "history" && (
          <HistoryView userId={user.id} onResumeSession={(topic, sessionId, msgs) => {
            resetChat();
            setTopic(topic);
            setSessionId(sessionId);
            msgs.forEach(msg => {
              addMessage({ id: uuidv4(), role: "user" as const, content: msg.question, timestamp: msg.created_at });
              addMessage({ id: uuidv4(), role: "assistant" as const, content: msg.answer, sources: msg.sources || [], suggestions: [], timestamp: msg.created_at });
            });
            setView("chat");
          }} />
        )}

        {/* SAVED */}
        {view === "saved" && (
  <SavedView userId={user.id} onOpenSaved={(item) => {
    resetChat();
    setTopic(item.question);
    // Find book_id from saved answer sources
    if (item.book_id) toggleBookSelection(item.book_id);
    addMessage({ id: uuidv4(), role: "user" as const, content: item.question, timestamp: item.created_at });
    addMessage({ 
      id: uuidv4(), 
      role: "assistant" as const, 
      content: item.answer, 
      sources: item.book ? [{ book_title: item.book, chapter: item.chapter }] : [],
      suggestions: [],
      timestamp: item.created_at 
    });
    setView("chat");
  }} />
)}
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 py-2 z-50">
        <button onClick={() => { setView("home"); resetChat(); }} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${view === "home" ? "text-brand-400" : "text-gray-400"}`}>
          <Search size={20} /><span className="text-xs">Home</span>
        </button>
        <button onClick={() => setView("history")} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${view === "history" ? "text-brand-400" : "text-gray-400"}`}>
          <BookOpen size={20} /><span className="text-xs">History</span>
        </button>
        <button onClick={() => setView("saved")} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${view === "saved" ? "text-brand-400" : "text-gray-400"}`}>
          <Save size={20} /><span className="text-xs">Saved</span>
        </button>
        <div className="flex flex-col items-center gap-1 px-4 py-2">
          <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-600">{user?.firstName?.[0] || "U"}</div>
          <span className="text-xs text-gray-400">{user?.firstName || "Me"}</span>
        </div>
      </div>
    </div>
  );
}

// ── History View ──────────────────────────────────────────────────────────────
function HistoryView({ userId, onResumeSession }: { 
  userId: string; 
  onResumeSession: (topic: string, sessionId: string, messages: any[]) => void;
}) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSession, setLoadingSession] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/history/`, {
        headers: { "x-user-id": userId },
      });
      const data = await res.json();
      setSessions(data.history || []);
    } catch (e) {
      console.error("Failed to fetch history:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleResume = async (sessionId: string, topic: string) => {
    setLoadingSession(sessionId);
    try {
      const res = await fetch(`${API_URL}/api/history/${sessionId}`, {
        headers: { "x-user-id": userId },
      });
      const data = await res.json();
      onResumeSession(topic, sessionId, data.messages || []);
    } catch {
      onResumeSession(topic, sessionId, []);
    } finally {
      setLoadingSession(null);
    }
  };

  const handleDelete = async (sessionId: string) => {
    try {
      await fetch(`${API_URL}/api/history/${sessionId}`, {
        method: "DELETE",
        headers: { "x-user-id": userId },
      });
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      toast.success("Session deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="font-serif text-2xl text-gray-900 mb-6">Previous chats</h2>
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <BookOpen size={32} className="text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium text-sm">No history yet</p>
          <p className="text-gray-400 text-xs mt-1">Your past conversations will appear here</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {sessions.map((session, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-brand-100 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleResume(session.session_id, session.topic)}>
                  {loadingSession === session.session_id ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-gray-400">Loading conversation...</p>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-sm text-gray-900 truncate">{session.topic}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(session.books || []).slice(0, 3).map((book: string, j: number) => (
                          <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">{book}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{formatDate(session.date)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{session.queries} {session.queries === 1 ? "query" : "queries"}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(session.session_id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Saved View ────────────────────────────────────────────────────────────────
function SavedView({ userId, onOpenSaved }: { userId: string; onOpenSaved: (item: any) => void }): JSX.Element {
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/saved/`, {
        headers: { "x-user-id": userId },
      });
      const data = await res.json();
      setSaved(data.saved || []);
    } catch (e) {
      console.error("Failed to fetch saved:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const handleUnsave = async (savedId: string) => {
    try {
      await fetch(`${API_URL}/api/saved/${savedId}`, {
        method: "DELETE",
        headers: { "x-user-id": userId },
      });
      setSaved(prev => prev.filter(s => s.id !== savedId));
      toast.success("Removed from saved");
    } catch { toast.error("Failed to remove"); }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="font-serif text-2xl text-gray-900 mb-6">Saved answers</h2>
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : saved.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Bookmark size={32} className="text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium text-sm">No saved answers yet</p>
          <p className="text-gray-400 text-xs mt-1">Save answers from your conversations to find them here</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {saved.map((item, i) => (
  <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 group cursor-pointer hover:border-brand-100 hover:shadow-sm transition-all"
    onClick={() => onOpenSaved(item)}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-medium text-sm text-gray-900 flex-1">{item.question}</p>
                <button
  onClick={(e) => { e.stopPropagation(); handleUnsave(item.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-3">{item.answer}</p>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-1 flex-wrap">
                  {item.book && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">{item.book}</span>
                  )}
                  {item.chapter && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">{item.chapter}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{formatDate(item.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function stringToColor(str: string): string {
  const colors = ["#5DCAA5", "#85B7EB", "#F0997B", "#AFA9EC", "#F4C0D1", "#97C459", "#FAC775", "#5DCAA5"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
