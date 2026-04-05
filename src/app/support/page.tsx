"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { usePageTitle } from "@/hooks/usePageTitle";
import toast from "react-hot-toast";

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface Chat {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  admin: { name: string } | null;
  messages: ChatMessage[];
}

export default function SupportPage() {
  usePageTitle("Support");
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<(Chat & { user?: { name: string; role: string } }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUserId(JSON.parse(stored).userId); } catch { /* ignore */ }
    }
    fetchChats();
  }, []);

  // Poll for new messages when chat is open
  useEffect(() => {
    if (!activeChat) return;
    const interval = setInterval(() => {
      if (!document.hidden) loadChat(activeChat.id);
    }, 10_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.id]);

  const fetchChats = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/admin-chat", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setChats(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadChat = async (chatId: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/admin-chat?chatId=${chatId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setActiveChat(await res.json());
    } catch { /* ignore */ }
  };

  const createChat = async () => {
    if (!newSubject.trim() || !newMessage.trim()) { toast.error("Subject and message required"); return; }
    const token = localStorage.getItem("token");
    setCreating(true);
    try {
      const res = await fetch("/api/admin-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: newSubject.trim(), content: newMessage.trim() }),
      });
      if (res.ok) {
        const chat = await res.json();
        setNewSubject("");
        setNewMessage("");
        toast.success("Support chat created! An admin will respond soon.");
        fetchChats();
        loadChat(chat.id);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create chat");
      }
    } finally { setCreating(false); }
  };

  const sendReply = async () => {
    if (!activeChat || !replyMessage.trim()) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/admin-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chatId: activeChat.id, content: replyMessage.trim() }),
      });
      if (res.ok) {
        setReplyMessage("");
        loadChat(activeChat.id);
      }
    } catch { toast.error("Failed to send message"); }
  };

  const statusColors: Record<string, string> = {
    OPEN: "text-gold bg-gold/10",
    ASSIGNED: "text-blue-400 bg-blue-500/10",
    RESOLVED: "text-emerald-400 bg-emerald-500/10",
    CLOSED: "text-cream-muted bg-dark-border",
  };

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-16">
        <h1 className="text-3xl font-bold mb-6 tracking-tight">Support</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chat list sidebar */}
          <div className="space-y-3">
            <button
              onClick={() => setActiveChat(null)}
              className="w-full bg-gold text-dark px-4 py-3 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
            >
              + New Chat
            </button>

            {loading ? (
              <p className="text-cream-muted text-sm">Loading...</p>
            ) : chats.length === 0 ? (
              <p className="text-cream-muted text-sm">No support chats yet.</p>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
                  className={`w-full text-left p-4 border transition-colors ${
                    activeChat?.id === chat.id
                      ? "border-gold/50 bg-gold/5"
                      : "border-dark-border bg-dark-card hover:border-gold/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{chat.subject}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 ${statusColors[chat.status] || ""}`}>
                      {chat.status}
                    </span>
                  </div>
                  {chat.messages[0] && (
                    <p className="text-xs text-cream-muted truncate">{chat.messages[0].content}</p>
                  )}
                  <p className="text-[10px] text-cream-muted/50 mt-1">
                    {new Date(chat.createdAt).toLocaleDateString()}
                    {chat.admin && ` · ${chat.admin.name}`}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Chat area */}
          <div className="md:col-span-2">
            {activeChat ? (
              <div className="bg-dark-card border border-dark-border">
                <div className="p-4 border-b border-dark-border flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{activeChat.subject}</h3>
                    <p className="text-xs text-cream-muted">
                      {activeChat.admin ? `Assigned to ${activeChat.admin.name}` : "Waiting for admin..."}
                      {" · "}{activeChat.status}
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {activeChat.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === userId ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] px-4 py-3 ${
                        msg.senderId === userId
                          ? "bg-gold/10 border border-gold/20"
                          : "bg-dark border border-dark-border"
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-[10px] text-cream-muted/50 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {activeChat.status !== "CLOSED" && (
                  <div className="p-4 border-t border-dark-border flex gap-2">
                    <input
                      type="text"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendReply()}
                      placeholder="Type a message..."
                      className="flex-1 border border-dark-border bg-dark px-4 py-3 text-cream text-sm"
                    />
                    <button
                      onClick={sendReply}
                      disabled={!replyMessage.trim()}
                      className="bg-gold text-dark px-5 py-3 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* New chat form */
              <div className="bg-dark-card border border-dark-border p-6 space-y-4">
                <h3 className="font-semibold text-lg">Contact Support</h3>
                <p className="text-sm text-cream-muted">
                  Have a question or issue? Start a chat and an admin will respond as soon as possible.
                </p>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Subject</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g., Booking issue, Payment question..."
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Message</label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Describe your issue..."
                    className="w-full border border-dark-border bg-dark px-4 py-3 h-32 text-cream"
                  />
                </div>
                <button
                  onClick={createChat}
                  disabled={creating || !newSubject.trim() || !newMessage.trim()}
                  className="bg-gold text-dark px-6 py-3 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
                >
                  {creating ? "Sending..." : "Start Chat"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
