import { create } from "zustand";

interface Book {
  book_id:        string;
  book_title:     string;
  author:         string;
  cover_url:      string;
  category:       string;
  score:          number;
  topic_coverage: string;
}

interface Message {
    id:          string;
    role:        "user" | "assistant";
    content:     string;
    sources?:    any[];
    suggestions?: string[];
    timestamp:   string;
}

interface AppState {
  // Discovery
  topic:          string;
  discoveredBooks: Book[];
  selectedBookIds: string[];
  isDiscovering:  boolean;

  // Chat
  sessionId:      string | null;
  messages:       Message[];
  isQuerying:     boolean;
  queriesLeft:    number;

  // UI
  view: "home" | "discover" | "chat" | "history" | "saved";

  // Actions
  setTopic:           (t: string) => void;
  setDiscoveredBooks: (b: Book[]) => void;
  toggleBookSelection:(id: string) => void;
  clearSelection:     () => void;
  setIsDiscovering:   (v: boolean) => void;
  setSessionId:       (id: string) => void;
  addMessage:         (m: Message) => void;
  setIsQuerying:      (v: boolean) => void;
  setQueriesLeft:     (n: number) => void;
  setView:            (v: AppState["view"]) => void;
  resetChat:          () => void;
}

export const useStore = create<AppState>((set) => ({
  topic:            "",
  discoveredBooks:  [],
  selectedBookIds:  [],
  isDiscovering:    false,
  sessionId:        null,
  messages:         [],
  isQuerying:       false,
  queriesLeft:      100,
  view:             "home",

  setTopic:           (t) => set({ topic: t }),
  setDiscoveredBooks: (b) => set({ discoveredBooks: b }),
  toggleBookSelection: (id) => set((s) => ({
    selectedBookIds: s.selectedBookIds.includes(id)
      ? s.selectedBookIds.filter((x) => x !== id)
      : [...s.selectedBookIds, id],
  })),
  clearSelection:   () => set({ selectedBookIds: [] }),
  setIsDiscovering: (v) => set({ isDiscovering: v }),
  setSessionId:     (id) => set({ sessionId: id }),
  addMessage:       (m) => set((s) => ({ messages: [...s.messages, m] })),
  setIsQuerying:    (v) => set({ isQuerying: v }),
  setQueriesLeft:   (n) => set({ queriesLeft: n }),
  setView:          (v) => set({ view: v }),
  resetChat:        () => set({ messages: [], sessionId: null, selectedBookIds: [], discoveredBooks: [], topic: "", view: "home" }),
}));
