"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, MessageSquare, FileCheck } from "lucide-react";

interface Intern {
  id: string;
  name: string;
  studentId: string;
  startDate: string;
  status: string;
  logbookEntries: number;
  reportSubmitted: boolean;
}

export default function InternsPage() {
  const interns: Intern[] = [
    {
      id: "1",
      name: "John Doe",
      studentId: "2021001",
      startDate: "2024-01-15",
      status: "Active",
      logbookEntries: 45,
      reportSubmitted: false,
    },
    {
      id: "2",
      name: "Jane Smith",
      studentId: "2021002",
      startDate: "2024-01-20",
      status: "Active",
      logbookEntries: 42,
      reportSubmitted: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Supervise Interns</h1>
        <p className="text-muted-foreground">
          Monitor and provide feedback to your interns
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Interns</CardTitle>
          <CardDescription>
            Students currently interning at your company
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Logbook Entries</TableHead>
                <TableHead>Report</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interns.map((intern) => (
                <TableRow key={intern.id}>
                  <TableCell className="font-medium">{intern.name}</TableCell>
                  <TableCell>{intern.studentId}</TableCell>
                  <TableCell>{intern.startDate}</TableCell>
                  <TableCell>
                    <Badge variant="success">{intern.status}</Badge>
                  </TableCell>
                  <TableCell>{intern.logbookEntries}</TableCell>
                  <TableCell>
                    {intern.reportSubmitted ? (
                      <FileCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <span className="text-muted-foreground">Pending</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
