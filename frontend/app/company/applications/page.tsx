"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import {
  ApplicationTable,
  ApplicationTableAction,
  ApplicationTableColumn,
} from "@/components/common/application-table";
import { CheckCircle2, XCircle, Eye, FileText } from "lucide-react";
import { Application, EligibilityStatus } from "@/types";
import { ApplicationDetailModal } from "@/components/application/application-detail-modal";
import { StatusBadge } from "@/components/common/status-badge";
import { reviewCompanyApplication, getCompanyApplications } from "@/lib/api";
import { usePermissions } from "@/lib/use-permissions";
import { useToastContext } from "@/components/providers/toast-provider";
import { format } from "date-fns";

interface CompanyApplicationRow {
  id: string;
  studentName: string;
  studentId: string;
  eligibilityStatus: EligibilityStatus;
  appliedDate: string;
  hasDocuments: boolean;
  application: Application;
}

export default function ApplicationsPage() {
  const { showToast } = useToastContext();
  const { can } = usePermissions();
  const canReview = can("applications.review");
  const canComment = can("applications.comment");
  const canEditPlacement = canReview || canComment;
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadApplications = async () => {
      setIsLoading(true);
      const data = await getCompanyApplications();
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
  };

  const tableRows = useMemo(
    () =>
      applications.map((application) => ({
        id: application.id,
        studentName: application.student?.name || "Unknown",
        studentId: application.student?.studentId || application.studentId,
        eligibilityStatus: application.student?.eligibilityStatus || "not_eligible",
        appliedDate: format(application.appliedDate, "MMM dd, yyyy"),
        hasDocuments: !!(
          application.documents.cv &&
          application.documents.motivationLetter &&
          application.documents.transcript
        ),
        application,
      })),
    [applications]
  );

  const columns: ApplicationTableColumn<CompanyApplicationRow>[] = [
    {
      key: "studentName",
      label: "Student",
      render: (value) => <span className="font-medium">{value as string}</span>,
    },
    {
      key: "studentId",
      label: "Student ID",
    },
    {
      key: "eligibilityStatus",
      label: "Eligibility",
      render: (value) => <StatusBadge status={value as EligibilityStatus} type="eligibility" />,
    },
    {
      key: "placementStatus",
      label: "Placement",
      render: (_, row) => (
        <StatusBadge
          status={row.application.status}
          coordinatorPlacementApproved={row.application.coordinatorPlacementApprovedAt != null}
          companyPlacementApproved={row.application.companyPlacementApprovedAt != null}
        />
      ),
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

  const actions: ApplicationTableAction<CompanyApplicationRow>[] = [
    {
      icon: Eye,
      onClick: (row: { application: Application }) => {
        setSelectedApplication(row.application);
        setIsModalOpen(true);
      },
    },
    ...(canReview
      ? [
          {
            icon: CheckCircle2,
            onClick: async (row: { application: Application; studentName: string }) => {
              const result = await reviewCompanyApplication(row.application.id, {
                status: "approved" as const,
                companyComments: row.application.companyComments,
              });

              if (!result.success) {
                showToast(result.message, "error");
                return;
              }

              replaceApplicationInState(result.application);
              showToast(`Application from ${row.studentName} approved`, "success");
            },
            variant: "ghost" as const,
            className: "text-green-600",
            show: (row: { application: Application }) =>
              row.application.status === "pending" && !row.application.companyPlacementApprovedAt,
          },
          {
            icon: XCircle,
            onClick: async (row: { application: Application; studentName: string }) => {
              if (!confirm(`Reject application from ${row.studentName}?`)) return;

              const result = await reviewCompanyApplication(row.application.id, {
                status: "rejected" as const,
                companyComments: row.application.companyComments,
              });

              if (!result.success) {
                showToast(result.message, "error");
                return;
              }

              replaceApplicationInState(result.application);
              showToast(`Application from ${row.studentName} rejected`, "info");
            },
            variant: "ghost" as const,
            className: "text-red-600",
            show: (row: { application: Application }) =>
              row.application.status === "pending" && !row.application.companyPlacementApprovedAt,
          },
        ]
      : []),
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
            {isLoading ? "Loading company applications..." : "Applications awaiting your review"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicationTable<CompanyApplicationRow> columns={columns} data={tableRows} actions={actions} />
        </CardContent>
      </Card>

      <ApplicationDetailModal
        application={selectedApplication}
        company={selectedApplication?.company || null}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        placementEditorRole={canEditPlacement ? "company" : undefined}
        onPlacementSaved={replaceApplicationInState}
      />
    </div>
  );
}
