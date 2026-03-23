"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { AIChat } from "@/components/ai-assistant/ai-chat";
import { MessageSquare, HelpCircle, BookOpen, CheckCircle } from "lucide-react";

export default function AIAssistantPage() {
  const commonQuestions = [
    {
      question: "Am I eligible for summer internship?",
      icon: CheckCircle,
    },
    {
      question: "Which courses count towards eligibility?",
      icon: BookOpen,
    },
    {
      question: "What if I fail one of my courses?",
      icon: HelpCircle,
    },
    {
      question: "How do I apply for an internship?",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Get instant answers to your questions about internships"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Common Questions</CardTitle>
            <CardDescription>
              Click on a question to ask the AI assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {commonQuestions.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-sm">{item.question}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">
                The AI assistant can help you with:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Eligibility questions</li>
                <li>Application process guidance</li>
                <li>Company information</li>
                <li>Logbook and report requirements</li>
                <li>Deadlines and important dates</li>
              </ul>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Tip</p>
              <p className="text-xs text-muted-foreground mt-1">
                The AI assistant is available throughout the application. 
                Use the chat button in the bottom right corner to ask questions anytime.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <AIChat className="relative" />
      </div>
    </div>
  );
}
