"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { getChatResponse, suggestedQuestions } from "@/lib/chatbot-engine";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  User,
  ChevronDown,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-foreground/70">$1</em>')
    .replace(/_(.*?)_/g, '<em class="text-muted">$1</em>')
    .replace(/\n\n/g, '<div class="h-3"></div>')
    .replace(/\n/g, "<br/>")
    .replace(/• /g, '<span class="text-accent-blue mr-1">›</span> ');
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your **Working Capital AI Assistant**. Ask me about any KPI on this dashboard — I'll tell you the current situation, what the numbers mean, and what needs attention.\n\nTry one of the questions below, or type your own.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSend = useCallback(
    (text?: string) => {
      const query = (text || input).trim();
      if (!query) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: query,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      setTimeout(() => {
        const response = getChatResponse(query);
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
      }, 400 + Math.random() * 400);
    },
    [input]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const chatPanel = (
    <>
      {/* Backdrop on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full flex items-center justify-center",
          "shadow-lg shadow-accent-purple/20 transition-all duration-300",
          isOpen
            ? "bg-card border border-border scale-90"
            : "bg-gradient-to-br from-accent-purple to-accent-blue hover:scale-110 active:scale-95"
        )}
        aria-label={isOpen ? "Close chat" : "Open AI assistant"}
      >
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-muted" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Panel — full screen on mobile, floating on desktop */}
      <div
        className={cn(
          "fixed z-[95] flex flex-col bg-card border border-border overflow-hidden transition-all duration-300",
          // Mobile: full screen sheet from bottom
          "inset-x-0 bottom-0 top-0 sm:inset-auto",
          // Desktop: floating panel
          "sm:bottom-24 sm:right-6 sm:w-[380px] sm:max-h-[560px] sm:rounded-2xl",
          // Mobile: rounded top only
          "rounded-none sm:rounded-2xl",
          "shadow-xl",
          isOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-full sm:translate-y-4 sm:scale-95 pointer-events-none"
        )}
      >
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent-purple/10">
              <Sparkles className="w-4 h-4 text-accent-purple" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">KPI Insights Assistant</h3>
              <p className="text-[10px] text-muted">
                Powered by dashboard data
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 -m-1 rounded-full hover:bg-card-hover active:bg-border transition-colors"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-accent-purple/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-accent-purple" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2.5 text-xs leading-relaxed",
                  msg.role === "user"
                    ? "bg-accent-blue/15 border border-accent-blue/20 text-foreground"
                    : "bg-card-hover border border-border text-foreground/90"
                )}
                dangerouslySetInnerHTML={{
                  __html: formatMarkdown(msg.content),
                }}
              />

              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-accent-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3 h-3 text-accent-blue" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-full bg-accent-purple/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-3 h-3 text-accent-purple" />
              </div>
              <div className="bg-card-hover border border-border rounded-xl px-3 py-2.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-purple/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-purple/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-purple/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.slice(0, 4).map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-[10px] px-2.5 py-1.5 rounded-full bg-accent-purple/8 border border-accent-purple/15 text-accent-purple/80 hover:bg-accent-purple/15 hover:text-accent-purple active:bg-accent-purple/20 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-3 py-3 border-t border-border bg-card shrink-0 safe-area-pb">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about any KPI..."
              className="flex-1 bg-background/60 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent-purple/40 focus:ring-1 focus:ring-accent-purple/20 transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                input.trim()
                  ? "bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30 active:bg-accent-purple/40"
                  : "bg-border/30 text-muted/30 cursor-not-allowed"
              )}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  if (!mounted) return null;

  return createPortal(chatPanel, document.body);
}
