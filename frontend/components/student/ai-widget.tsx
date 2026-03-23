"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send } from "lucide-react";

interface AIWidgetProps {
  onOpenChat?: () => void;
}

export function AIWidget({ onOpenChat }: AIWidgetProps) {
  const [question, setQuestion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      // In a real app, this would trigger the AI chat
      onOpenChat?.();
      setQuestion("");
    }
  };

  const handleOpenFullChat = () => {
    onOpenChat?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Quick Ask
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            placeholder="Ask a quick question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <Button type="submit" size="sm" disabled={!question.trim()}>
              <Send className="mr-2 h-4 w-4" />
              Ask
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenFullChat}
            >
              Open Full Chat
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
