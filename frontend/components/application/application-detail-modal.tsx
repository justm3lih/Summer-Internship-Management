"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Application, Company } from "@/types";
import { StatusBadge } from "@/components/common/status-badge";
import { format } from "date-fns";
import { FileText, Download, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApplicationDetailModalProps {
  application: Application | null;
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicationDetailModal({
  application,
  company,
  isOpen,
  onClose,
}: ApplicationDetailModalProps) {
  if (!application) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Company
              </div>
              <p className="font-medium">{company?.name || "N/A"}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Date Applied
              </div>
              <p className="font-medium">
                {format(application.appliedDate, "MMM dd, yyyy")}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Status</div>
              <StatusBadge status={application.status} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Documents</h3>
            <div className="space-y-2">
              {application.documents.cv && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">CV</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
              {application.documents.motivationLetter && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Motivation Letter</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
              {application.documents.transcript && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Transcript</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          </div>

          {application.coordinatorComments && (
            <div className="space-y-2">
              <h3 className="font-semibold">Coordinator Comments</h3>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">{application.coordinatorComments}</p>
              </div>
            </div>
          )}

          {application.companyComments && (
            <div className="space-y-2">
              <h3 className="font-semibold">Company Comments</h3>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">{application.companyComments}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
