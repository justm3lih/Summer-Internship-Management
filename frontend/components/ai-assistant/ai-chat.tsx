"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { askAiAssistant, type ChatSource } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  isError?: boolean;
}

interface AIChatProps {
  className?: string;
}

const initialAssistantMessage: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm your AI assistant. Ask me anything about internship eligibility, applications, deadlines, or any topic from the knowledge base.",
};

export function AIChat({ className }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([initialAssistantMessage]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    const result = await askAiAssistant(trimmed);

    setIsSending(false);

    const assistantMessage: Message = result.success
      ? {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.answer || "I couldn't find an answer.",
          sources: result.sources,
        }
      : {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: result.message,
          isError: true,
        };

    setMessages((prev) => [...prev, assistantMessage]);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
          "transition-all duration-500 ease-out",
          "hover:scale-110 active:scale-95",
          "transform origin-center",
          isOpen
            ? "opacity-0 scale-0 rotate-90 pointer-events-none"
            : "opacity-100 scale-100 rotate-0",
          className
        )}
        size="icon"
        data-ai-chat-trigger
        style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <MessageSquare className="h-6 w-6 transition-transform duration-300" />
      </Button>

      <div
        className={cn(
          "fixed bottom-6 right-6 w-96 max-w-[calc(100vw-20rem)] z-50",
          "lg:max-w-[calc(100vw-18rem)]",
          "transition-all duration-500 ease-out",
          "transform origin-bottom-right",
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <Card className="shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">AI Assistant</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 transition-transform duration-200 hover:rotate-90"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div ref={scrollRef} className="h-96 space-y-4 overflow-y-auto pr-1">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-4 py-2 transition-all duration-200",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.isError
                          ? "bg-destructive/10 text-destructive border border-destructive/20"
                          : "bg-muted"
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-muted px-4 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask a question..."
                disabled={isSending}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                size="icon"
                disabled={isSending || !input.trim()}
                className="transition-transform duration-200 hover:scale-110 active:scale-95"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
