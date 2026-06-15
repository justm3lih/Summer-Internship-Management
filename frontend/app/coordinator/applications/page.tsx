"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import {
  ApplicationTable,
  ApplicationTableAction,
  ApplicationTableColumn,
} from "@/components/common/application-table";
import { ApplicationFilters } from "@/components/coordinator/application-filters";
import { BulkActions } from "@/components/coordinator/bulk-actions";
import { ApplicationDetailModal } from "@/components/application/application-detail-modal";
import { ApplicationCommentModal } from "@/components/coordinator/application-comment-modal";
import { Pagination } from "@/components/common/pagination";
import { StatusBadge } from "@/components/common/status-badge";
import { useToastContext } from "@/components/providers/toast-provider";
import { CheckCircle2, XCircle, Eye, FileText, MessageSquare } from "lucide-react";
import { ApplicationStatus, EligibilityStatus, Application } from "@/types";
import { getCoordinatorApplications, reviewCoordinatorApplication } from "@/lib/api";
import { usePermissions } from "@/lib/use-permissions";
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
  const { can } = usePermissions();
  const canEditPlacement = can("applications.review") || can("applications.comment");
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    let isMounted = true;

    const loadApplications = async () => {
      setIsLoading(true);
      const data = await getCoordinatorApplications();
      if (!isMounted) return;
      setApplications(data);
      setIsLoading(false);
    };

    loadApplications();

    return () => {
      isMounted = false;
    };
  }, []);

  const replaceApplicationInState = (updatedApplication: Application) => {
    setApplications((currentApplications) =>
      currentApplications.map((application) =>
        application.id === updatedApplication.id ? updatedApplication : application
      )
    );

    setSelectedApplication((currentApplication) =>
      currentApplication?.id === updatedApplication.id ? updatedApplication : currentApplication
    );

    setCommentModal((currentCommentModal) =>
      currentCommentModal?.applicationId === updatedApplication.id
        ? {
            ...currentCommentModal,
            currentComment: updatedApplication.coordinatorComments,
          }
        : currentCommentModal
    );
  };

  const allApplications: ApplicationRow[] = useMemo(
    () =>
      applications.map((app) => ({
        id: app.id,
        studentName: app.student?.name || "Unknown",
        studentId: app.student?.studentId || app.studentId,
        company: app.company?.name || "Unknown",
        eligibilityStatus: app.student?.eligibilityStatus || "not_eligible",
        appliedDate: format(app.appliedDate, "MMM dd, yyyy"),
        hasDocuments: !!(app.documents.cv && app.documents.motivationLetter && app.documents.transcript),
        status: app.status,
        application: app,
      })),
    [applications]
  );

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
  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedApplications = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredApplications.slice(startIndex, endIndex);
  }, [filteredApplications, safeCurrentPage, pageSize]);

  const handleBulkApprove = async () => {
    const selectedApplications = applications.filter((application) => selectedIds.includes(application.id));
    const results = await Promise.all(
      selectedApplications.map((application) =>
        reviewCoordinatorApplication(application.id, {
          status: "approved",
          coordinatorComments: application.coordinatorComments,
        })
      )
    );

    const successfulResults = results.filter((result) => result.success);
    successfulResults.forEach((result) => replaceApplicationInState(result.application));

    if (successfulResults.length > 0) {
      showToast(`Approved ${successfulResults.length} application(s)`, "success");
    }

    const failedResults = results.filter((result) => !result.success);
    if (failedResults.length > 0) {
      showToast(failedResults[0].message, "error");
    }

    setSelectedIds([]);
  };

  const handleBulkReject = async () => {
    const selectedApplications = applications.filter((application) => selectedIds.includes(application.id));
    const results = await Promise.all(
      selectedApplications.map((application) =>
        reviewCoordinatorApplication(application.id, {
          status: "rejected",
          coordinatorComments: application.coordinatorComments,
        })
      )
    );

    const successfulResults = results.filter((result) => result.success);
    successfulResults.forEach((result) => replaceApplicationInState(result.application));

    if (successfulResults.length > 0) {
      showToast(`Rejected ${successfulResults.length} application(s)`, "info");
    }

    const failedResults = results.filter((result) => !result.success);
    if (failedResults.length > 0) {
      showToast(failedResults[0].message, "error");
    }

    setSelectedIds([]);
  };

  const handleView = (row: ApplicationRow) => {
    setSelectedApplication(row.application);
    setIsModalOpen(true);
  };

  const handleApprove = async (row: ApplicationRow) => {
    const result = await reviewCoordinatorApplication(row.id, {
      status: "approved",
      coordinatorComments: row.application.coordinatorComments,
    });

    if (!result.success) {
      showToast(result.message, "error");
      return;
    }

    replaceApplicationInState(result.application);
    showToast(`Application from ${row.studentName} approved`, "success");
  };

  const handleReject = async (row: ApplicationRow) => {
    if (confirm(`Reject application from ${row.studentName}?`)) {
      const result = await reviewCoordinatorApplication(row.id, {
        status: "rejected",
        coordinatorComments: row.application.coordinatorComments,
      });

      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      replaceApplicationInState(result.application);
      showToast(`Application from ${row.studentName} rejected`, "info");
    }
  };

  const columns: ApplicationTableColumn<ApplicationRow>[] = [
    {
      key: "studentName",
      label: "Student",
      render: (value, row) => (
        <div>
          <span className="font-medium">{value as string}</span>
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
      render: (value, row) => (
        <StatusBadge
          status={value as ApplicationStatus}
          coordinatorPlacementApproved={row.application.coordinatorPlacementApprovedAt != null}
          companyPlacementApproved={row.application.companyPlacementApprovedAt != null}
        />
      ),
    },
    {
      key: "hasDocuments",
      label: "Documents",
      render: (value) =>
        (value as boolean) ? (
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

  const handleSaveComment = async (comment: string) => {
    if (!commentModal) return;

    // Sadece yorumu güncelle. Status'ü göndermiyoruz; backend null status'te
    // duruma dokunmuyor (bu sayede ongoing/completed başvurular bozulmuyor).
    const result = await reviewCoordinatorApplication(commentModal.applicationId, {
      coordinatorComments: comment,
    });

    if (!result.success) {
      showToast(result.message, "error");
      return;
    }

    replaceApplicationInState(result.application);
    showToast("Comment saved", "success");
    setCommentModal(null);
  };

  const canReview = can("applications.review");
  const canComment = can("applications.comment");
  const canBulk = can("applications.bulk");

  const actions: ApplicationTableAction<ApplicationRow>[] = [
    {
      icon: Eye,
      onClick: handleView,
    },
    ...(canComment
      ? [
          {
            icon: MessageSquare,
            onClick: handleComment,
            variant: "ghost" as const,
            className: "text-primary",
          },
        ]
      : []),
    ...(canReview
      ? [
          {
            icon: CheckCircle2,
            onClick: handleApprove,
            variant: "ghost" as const,
            className: "text-green-600",
            show: (row: ApplicationRow) =>
              row.status === "pending" && !row.application.coordinatorPlacementApprovedAt,
          },
          {
            icon: XCircle,
            onClick: handleReject,
            variant: "ghost" as const,
            className: "text-red-600",
            show: (row: ApplicationRow) =>
              row.status === "pending" && !row.application.coordinatorPlacementApprovedAt,
          },
        ]
      : []),
  ];

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

      {canBulk && (
        <BulkActions
          selectedIds={selectedIds}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            {isLoading ? "Loading coordinator applications..." : `${filteredApplications.length} application(s) found`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApplicationTable<ApplicationRow>
            columns={columns}
            data={paginatedApplications}
            actions={actions}
            selectable={canBulk}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
          {filteredApplications.length > 0 && (
            <Pagination
              currentPage={safeCurrentPage}
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
        company={selectedApplication?.company || null}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        placementEditorRole={canEditPlacement ? "coordinator" : undefined}
        onPlacementSaved={replaceApplicationInState}
        onAcceptanceLetterApplicationUpdated={replaceApplicationInState}
        coordinatorAcceptanceVerification={can("applications.review")}
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
