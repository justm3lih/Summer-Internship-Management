"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { ApplicationTable, ApplicationTableColumn } from "@/components/common/application-table";
import { CheckCircle2, XCircle, Eye, FileText } from "lucide-react";

interface Application {
  id: string;
  studentName: string;
  studentId: string;
  eligibilityStatus: string;
  appliedDate: string;
  hasDocuments: boolean;
}

export default function ApplicationsPage() {
  const applications: Application[] = [
    {
      id: "1",
      studentName: "John Doe",
      studentId: "2021001",
      eligibilityStatus: "Eligible",
      appliedDate: "2024-03-15",
      hasDocuments: true,
    },
    {
      id: "2",
      studentName: "Jane Smith",
      studentId: "2021002",
      eligibilityStatus: "Eligible",
      appliedDate: "2024-03-14",
      hasDocuments: true,
    },
  ];

  const columns: ApplicationTableColumn[] = [
    {
      key: "studentName",
      label: "Student",
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: "studentId",
      label: "Student ID",
    },
    {
      key: "eligibilityStatus",
      label: "Eligibility",
      render: (value) => <Badge variant="success">{value}</Badge>,
    },
    {
      key: "appliedDate",
      label: "Date Applied",
    },
    {
      key: "hasDocuments",
      label: "Documents",
      render: (value) =>
        value ? (
          <FileText className="h-4 w-4 text-green-500" />
        ) : (
          <span className="text-muted-foreground">Missing</span>
        ),
    },
  ];

  const actions = [
    {
      icon: Eye,
      onClick: (row: Application) => {
        console.log("View application", row.id);
      },
    },
    {
      icon: CheckCircle2,
      onClick: (row: Application) => {
        console.log("Approve application", row.id);
      },
      variant: "ghost" as const,
      className: "text-green-600",
    },
    {
      icon: XCircle,
      onClick: (row: Application) => {
        console.log("Reject application", row.id);
      },
      variant: "ghost" as const,
      className: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Applications"
        description="Review and approve student applications"
      />

      <Card>
        <CardHeader>
          <CardTitle>Pending Applications</CardTitle>
          <CardDescription>
            Applications awaiting your review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicationTable columns={columns} data={applications} actions={actions} />
        </CardContent>
      </Card>
    </div>
  );
}
