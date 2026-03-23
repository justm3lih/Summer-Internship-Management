"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/common/file-upload";
import { useToastContext } from "@/components/providers/toast-provider";
import { Upload, FileText, CheckCircle2, Clock, XCircle } from "lucide-react";
import { demoTranscriptHistory } from "@/lib/demo-data";
import { format } from "date-fns";

export default function TranscriptPage() {
  const { showToast } = useToastContext();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadHistory, setUploadHistory] = useState(demoTranscriptHistory);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === "application/pdf" || droppedFile.type.startsWith("image/"))) {
      setFile(droppedFile);
    } else {
      showToast("Please upload a PDF or image file", "error");
    }
  }, [showToast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      showToast("Please select a file first", "error");
      return;
    }

    setIsUploading(true);
    
    // Simulate upload
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsUploading(false);
    setIsProcessing(true);
    showToast("File uploaded successfully! Processing...", "success");

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setIsProcessing(false);
    
    // Add to history
    const newEntry = {
      id: Date.now().toString(),
      uploadedDate: new Date(),
      fileName: file.name,
      status: "processed" as const,
      coursesDetected: 6,
      eligibilityStatus: "eligible" as const,
    };
    
    setUploadHistory([newEntry, ...uploadHistory]);
    setFile(null);
    showToast("Transcript processed successfully! Eligibility updated.", "success");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload / Update Transcript"
        description="Upload your transcript for eligibility verification"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Transcript</CardTitle>
            <CardDescription>
              Drag and drop or select a PDF or image file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                file
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              }`}
            >
              {file ? (
                <div className="space-y-2">
                  <FileText className="h-12 w-12 mx-auto text-primary" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop your transcript here
                  </p>
                  <p className="text-xs text-muted-foreground">or</p>
                </div>
              )}
            </div>

            <FileUpload
              label="Select File"
              accept=".pdf,.png,.jpg,.jpeg"
              file={file}
              onChange={handleFileSelect}
            />

            {isProcessing && (
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600 animate-spin" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Processing transcript... This may take a few moments.
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || isUploading || isProcessing}
              className="w-full"
            >
              {isUploading ? "Uploading..." : isProcessing ? "Processing..." : "Upload & Process"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload History</CardTitle>
            <CardDescription>Previous transcript uploads and results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upload history
                </p>
              ) : (
                uploadHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(entry.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {entry.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(entry.uploadedDate, "MMM dd, yyyy HH:mm")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {entry.coursesDetected} courses detected
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {entry.eligibilityStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
