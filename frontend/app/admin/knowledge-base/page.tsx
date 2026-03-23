"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function KnowledgeBasePage() {
  const knowledgeItems = [
    {
      id: "1",
      title: "Eligibility Requirements",
      content: "Students must pass at least 5 courses from 5th to 8th semester according to the official curriculum.",
      category: "Eligibility",
    },
    {
      id: "2",
      title: "Application Deadline",
      content: "Applications for summer internships must be submitted by May 1st of each year.",
      category: "Deadlines",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base Editor</h1>
          <p className="text-muted-foreground">
            Manage rules and regulations that power the AI assistant
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Entry
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {knowledgeItems.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.category}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
