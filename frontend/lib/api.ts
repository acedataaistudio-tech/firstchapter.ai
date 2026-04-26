import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Try multiple sources for user ID
    const userId = 
      localStorage.getItem("fc_user_id") || 
      sessionStorage.getItem("fc_user_id") || 
      "anonymous";
    config.headers["x-user-id"] = userId;
  }
  return config;
});

// Helper to set user ID — call this after Clerk loads
export function setApiUserId(userId: string) {
  if (typeof window !== "undefined" && userId) {
    localStorage.setItem("fc_user_id", userId);
    sessionStorage.setItem("fc_user_id", userId);
  }
}

export async function discoverBooks(topic: string) {
  const res = await api.post("/api/discover", { topic });
  return res.data;
}

export async function queryBooks(
  question: string,
  bookIds: string[] | null,
  sessionId: string | null,
  chatHistory: any[] = [],
) {
  const res = await api.post("/api/query", {
    question,
    book_ids:     bookIds,
    session_id:   sessionId,
    chat_history: chatHistory,
  });
  return res.data;
}

export async function getHistory() {
  const res = await api.get("/api/history/");
  return res.data;
}

export async function saveAnswer(queryId: string, title: string) {
  const res = await api.post(`/api/history/save?query_id=${queryId}&title=${encodeURIComponent(title)}`);
  return res.data;
}

export async function getSavedAnswers() {
  const res = await api.get("/api/history/saved");
  return res.data;
}

export async function exportToDoc(sessionId: string, title: string) {
  const res = await api.post("/api/export/doc", 
    { session_id: sessionId, title }, 
    { responseType: "blob" }
  );
  const url  = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href     = url;
  link.download = `${title}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportToPpt(sessionId: string, title: string) {
  const res = await api.post("/api/export/ppt", 
    { session_id: sessionId, title }, 
    { responseType: "blob" }
  );
  const url  = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href     = url;
  link.download = `${title}.pptx`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function createShareLink(queryId: string, sessionId: string) {
  const res = await api.post("/api/share/", { 
    query_id:   queryId, 
    session_id: sessionId 
  });
  return res.data;
}

export async function getMe() {
  const res = await api.get("/api/users/me");
  return res.data;
}

export default api;