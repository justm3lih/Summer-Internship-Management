"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { ApplicationTable, ApplicationTableColumn } from "@/components/common/application-table";
import { ApplicationFilters } from "@/components/coordinator/application-filters";
import { BulkActions } from "@/components/coordinator/bulk-actions";
import { ApplicationDetailModal } from "@/components/application/application-detail-modal";
import { ApplicationCommentModal } from "@/components/coordinator/application-comment-modal";
import { Pagination } from "@/components/common/pagination";
import { StatusBadge } from "@/components/common/status-badge";
import { useToastContext } from "@/components/providers/toast-provider";
import { CheckCircle2, XCircle, Eye, FileText, MessageSquare } from "lucide-react";
import { ApplicationStatus, EligibilityStatus, Application } from "@/types";
import { demoCoordinatorApplications, demoCompanies } from "@/lib/demo-data";
import { format } from "date-fns";

interface ApplicationRow {
  id: string;
  studentName: string;
  studentId: string;
  company: string;
  eligibilityStatus: EligibilityStatus;
  appliedDate: string;
  hasDocuments: boolean;
  status: ApplicationStatus;
  application: Application;
}

export default function ApplicationsPage() {
  const { showToast } = useToastContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [eligibilityFilter, setEligibilityFilter] = useState<EligibilityStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commentModal, setCommentModal] = useState<{
    isOpen: boolean;
    applicationId: string;
    studentName: string;
    currentComment?: string;
  } | null>(null);

  // Transform demo data
  const allApplications: ApplicationRow[] = demoCoordinatorApplications.map((app) => ({
    id: app.id,
    studentName: app.student?.name || "Unknown",
    studentId: app.studentId,
    company: app.company?.name || "Unknown",
    eligibilityStatus: app.student?.eligibilityStatus || "eligible",
    appliedDate: format(app.appliedDate, "MMM dd, yyyy"),
    hasDocuments: !!(app.documents.cv && app.documents.motivationLetter && app.documents.transcript),
    status: app.status,
    application: app,
  }));

  // Filter applications
  const filteredApplications = useMemo(() => {
    return allApplications.filter((app) => {
      const matchesSearch =
        app.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.studentId.includes(searchTerm);
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      const matchesEligibility =
        eligibilityFilter === "all" || app.eligibilityStatus === eligibilityFilter;
      return matchesSearch && matchesStatus && matchesEligibility;
    });
  }, [searchTerm, statusFilter, eligibilityFilter, allApplications]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setEligibilityFilter("all");
    setCurrentPage(1);
  };

  // Paginate filtered data
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredApplications.slice(startIndex, endIndex);
  }, [filteredApplications, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredApplications.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, eligibilityFilter]);

  const handleBulkApprove = () => {
    showToast(`Approved ${selectedIds.length} application(s)`, "success");
    setSelectedIds([]);
  };

  const handleBulkReject = () => {
    showToast(`Rejected ${selectedIds.length} application(s)`, "info");
    setSelectedIds([]);
  };

  const handleView = (row: ApplicationRow) => {
    setSelectedApplication(row.application);
    setIsModalOpen(true);
  };

  const handleApprove = (row: ApplicationRow) => {
    showToast(`Application from ${row.studentName} approved`, "success");
  };

  const handleReject = (row: ApplicationRow) => {
    if (confirm(`Reject application from ${row.studentName}?`)) {
      showToast(`Application from ${row.studentName} rejected`, "info");
    }
  };

  const columns: ApplicationTableColumn[] = [
    {
      key: "studentName",
      label: "Student",
      render: (value, row) => (
        <div>
          <span className="font-medium">{value}</span>
          <p className="text-xs text-muted-foreground">ID: {row.studentId}</p>
        </div>
      ),
    },
    {
      key: "company",
      label: "Company",
    },
    {
      key: "eligibilityStatus",
      label: "Eligibility",
      render: (value) => <StatusBadge status={value as EligibilityStatus} type="eligibility" />,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={value as ApplicationStatus} />,
    },
    {
      key: "hasDocuments",
      label: "Documents",
      render: (value) =>
        value ? (
          <FileText className="h-4 w-4 text-green-500" />
        ) : (
          <span className="text-xs text-muted-foreground">Missing</span>
        ),
    },
    {
      key: "appliedDate",
      label: "Date Applied",
    },
  ];

  const handleComment = (row: ApplicationRow) => {
    setCommentModal({
      isOpen: true,
      applicationId: row.id,
      studentName: row.studentName,
      currentComment: row.application.coordinatorComments,
    });
  };

  const handleSaveComment = (comment: string) => {
    if (commentModal) {
      // In real app, save to API
      showToast("Comment saved", "success");
      setCommentModal(null);
    }
  };

  const actions = [
    {
      icon: Eye,
      onClick: handleView,
    },
    {
      icon: MessageSquare,
      onClick: handleComment,
      variant: "ghost" as const,
      className: "text-blue-600",
    },
    {
      icon: CheckCircle2,
      onClick: handleApprove,
      variant: "ghost" as const,
      className: "text-green-600",
      show: (row: ApplicationRow) => row.status === "pending",
    },
    {
      icon: XCircle,
      onClick: handleReject,
      variant: "ghost" as const,
      className: "text-red-600",
      show: (row: ApplicationRow) => row.status === "pending",
    },
  ];

  const selectedCompany = selectedApplication
    ? demoCompanies.find((c) => c.id === selectedApplication.companyId)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications & Approvals"
        description="Review and approve student internship applications"
      />

      <ApplicationFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        eligibilityFilter={eligibilityFilter}
        onSearchChange={setSearchTerm}
        onStatusFilterChange={setStatusFilter}
        onEligibilityFilterChange={setEligibilityFilter}
        onClearFilters={handleClearFilters}
      />

      <BulkActions
        selectedIds={selectedIds}
        onBulkApprove={handleBulkApprove}
        onBulkReject={handleBulkReject}
        onClearSelection={() => setSelectedIds([])}
      />

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            {filteredApplications.length} application(s) found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApplicationTable
            columns={columns}
            data={paginatedApplications}
            actions={actions}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
          {filteredApplications.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredApplications.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      <ApplicationDetailModal
        application={selectedApplication}
        company={selectedCompany || null}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {commentModal && (
        <ApplicationCommentModal
          applicationId={commentModal.applicationId}
          studentName={commentModal.studentName}
          currentComment={commentModal.currentComment}
          isOpen={commentModal.isOpen}
          onClose={() => setCommentModal(null)}
          onSave={handleSaveComment}
        />
      )}
    </div>
  );
}
