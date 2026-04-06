import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  results?: ActionResult[];
  loading?: boolean;
};

type ActionResult = {
  action: string;
  success: boolean;
  error?: string;
};

export function AdminAiChat({ onChanged }: { onChanged: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      loading: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      // Build conversation history for context
      const history = messages
        .filter((m) => !m.loading)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      history.push({ role: "user", content: text });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("غير مصرح");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ prompt: text, history }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "فشل الطلب" }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      // Check if streaming
      const contentType = response.headers.get("content-type") || "";
      
      if (contentType.includes("text/event-stream") && response.body) {
        // Streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let actionResults: ActionResult[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);

            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              
              // Handle streaming text
              if (parsed.type === "delta") {
                fullContent += parsed.content || "";
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: fullContent, loading: false }
                      : m
                  )
                );
              }
              
              // Handle action results
              if (parsed.type === "results") {
                actionResults = parsed.results || [];
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, results: actionResults }
                      : m
                  )
                );
                if (actionResults.length > 0) onChanged();
              }
            } catch {
              // partial JSON, wait for more
            }
          }
        }
      } else {
        // Non-streaming JSON response (fallback)
        const data = await response.json();
        
        // Simulate typing effect
        const reply = data.reply || "تم تنفيذ الطلب";
        let typed = "";
        for (let i = 0; i < reply.length; i++) {
          typed += reply[i];
          const current = typed;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: current, loading: false }
                : m
            )
          );
          await new Promise((r) => setTimeout(r, 15));
        }

        if (data.results?.length > 0) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, results: data.results }
                : m
            )
          );
          onChanged();
        }
      }
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `❌ خطأ: ${e.message}`, loading: false }
            : m
        )
      );
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }

    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="mt-8 glass-strong rounded-2xl neon-border overflow-hidden flex flex-col" style={{ height: "600px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
        <h3 className="text-lg font-bold text-foreground neon-text flex items-center gap-2">
          <Bot size={20} className="text-primary" />
          وكيل AI التفاعلي
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          disabled={messages.length === 0 || isStreaming}
          className="gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={14} /> مسح المحادثة
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
            <Sparkles size={40} className="text-primary" />
            <div>
              <p className="text-foreground font-bold text-lg">مرحباً بك في وكيل AI</p>
              <p className="text-muted-foreground text-sm mt-1">
                اكتب أي طلب مثل: "أضف أنمي Naruto" أو "غير لون الموقع للأخضر"
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {[
                "كم أنمي عندي؟",
                "أضف أنمي Attack on Titan",
                "غير عنوان الموقع إلى أنمي بلس",
                "أضف 3 مواسم لآخر أنمي",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="text-xs px-3 py-1.5 rounded-full glass border border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === "user"
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>

            <div
              className={`max-w-[80%] space-y-2 ${
                msg.role === "user" ? "text-right" : "text-right"
              }`}
            >
              <div
                className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "glass border border-border/30 text-foreground rounded-bl-md"
                }`}
              >
                {msg.loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-muted-foreground">جاري التفكير...</span>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>

              {/* Action Results */}
              {msg.results && msg.results.length > 0 && (
                <div className="space-y-1">
                  {msg.results.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                        r.success
                          ? "bg-green-500/10 text-green-400"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {r.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      <span dir="ltr">{r.action}</span>
                      {r.error && <span>— {typeof r.error === 'string' ? r.error : JSON.stringify(r.error)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-border/30 px-4 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب طلبك هنا..."
            rows={1}
            className="flex-1 resize-none rounded-xl glass border border-border/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px] max-h-[120px]"
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="shrink-0 rounded-xl h-[44px] w-[44px]"
          >
            {isStreaming ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} className="rtl:rotate-180" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
