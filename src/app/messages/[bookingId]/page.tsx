"use client";
import { useEffect, useState, useRef, use } from "react";
import Navbar from "@/components/Navbar";

interface Message {
  id: string;
  content: string;
  isFiltered: boolean;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}

export default function MessagesPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserId(user.id || "");
    fetchMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }
    try {
      const res = await fetch(`/api/messages?bookingId=${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    const token = localStorage.getItem("token");
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId, content: newMessage }),
      });
      if (res.ok) {
        setNewMessage("");
        fetchMessages();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-4 flex flex-col" style={{ height: "100vh" }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold tracking-tight">Messages</h1>
          <a href="javascript:history.back()" className="text-sm text-cream-muted hover:text-cream transition-colors">
            ← Back
          </a>
        </div>

        <div className="bg-dark-card border border-dark-border p-3 mb-3 text-xs text-cream-muted">
          🔒 For your safety, all communication stays within Foodies. Contact information shared in messages will be automatically filtered.
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
          {loading ? (
            <p className="text-cream-muted text-center py-8">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-cream-muted text-center py-8">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender.id === userId;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-3 ${
                    isMine
                      ? "bg-gold/10 border border-gold/20"
                      : "bg-dark-card border border-dark-border"
                  }`}>
                    <p className="text-xs text-cream-muted mb-1 font-medium">
                      {isMine ? "You" : msg.sender.name}
                      {msg.sender.role === "CHEF" && !isMine && " (Chef)"}
                    </p>
                    <p className="text-sm text-cream">{msg.content}</p>
                    {msg.isFiltered && (
                      <p className="text-[10px] text-gold/60 mt-1">⚠ Contact info was filtered for safety</p>
                    )}
                    <p className="text-[10px] text-cream-muted/40 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 pb-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 border border-dark-border bg-dark px-4 py-3 text-cream placeholder:text-cream-muted/40"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="bg-gold text-dark px-6 py-3 font-semibold text-sm tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
