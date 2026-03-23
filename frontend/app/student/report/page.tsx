"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/common/file-upload";
import { StatusBadge } from "@/components/common/status-badge";
import { useToastContext } from "@/components/providers/toast-provider";
import { Download, Upload, FileText, CheckCircle2, Clock } from "lucide-react";
import { demoFinalReport } from "@/lib/demo-data";
import { format } from "date-fns";

export default function ReportPage() {
  const { showToast } = useToastContext();
  const [report, setReport] = useState(demoFinalReport);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDownloadTemplate = () => {
    showToast("Downloading template...", "info");
    // In real app, this would download the template
    setTimeout(() => {
      showToast("Template downloaded", "success");
    }, 1000);
  };

  const handleUpload = async () => {
    if (!file) {
      showToast("Please select a file first", "error");
      return;
    }

    setIsUploading(true);
    showToast("Uploading report...", "info");

    // Simulate upload
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsUploading(false);
    setReport({
      ...report,
      fileUrl: URL.createObjectURL(file),
      submittedDate: new Date(),
      status: "pending",
    });
    setFile(null);
    showToast("Report submitted successfully! Awaiting review.", "success");
  };

  const getStatusIcon = () => {
    switch (report.status) {
      case "approved":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case "rejected":
        return <FileText className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Final Report Submission"
        description="Submit your internship final report"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Report Status</CardTitle>
            <CardDescription>Current submission status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <StatusBadge
                  status={
                    report.status === "not_submitted"
                      ? "not_applied"
                      : report.status === "approved"
                      ? "approved"
                      : report.status === "rejected"
                      ? "rejected"
                      : "pending"
                  }
                />
              </div>
            </div>

            {report.submittedDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Submitted</span>
                <span className="text-sm text-muted-foreground">
                  {format(report.submittedDate, "MMM dd, yyyy")}
                </span>
              </div>
            )}

            {report.fileUrl && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">File</span>
                <Button variant="ghost" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  View
                </Button>
              </div>
            )}

            {report.coordinatorFeedback && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Coordinator Feedback</span>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm">{report.coordinatorFeedback}</p>
                </div>
              </div>
            )}

            {report.companyFeedback && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Company Feedback</span>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm">{report.companyFeedback}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submit Report</CardTitle>
            <CardDescription>
              Download template, fill it out, and upload
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleDownloadTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>

            <FileUpload
              label="Upload Filled Report (PDF)"
              accept=".pdf"
              file={file}
              onChange={setFile}
              required
            />

            <Button
              onClick={handleUpload}
              disabled={!file || isUploading || report.status !== "not_submitted"}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Report
                </>
              )}
            </Button>

            {report.status !== "not_submitted" && (
              <p className="text-xs text-muted-foreground">
                Report already submitted. Contact coordinator for updates.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
