"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import {
  ApplicationTable,
  ApplicationTableAction,
  ApplicationTableColumn,
} from "@/components/common/application-table";
import { ApplicationDetailModal } from "@/components/application/application-detail-modal";
import { ApplicationFilters } from "@/components/student/application-filters";
import { Pagination } from "@/components/common/pagination";
import { StatusBadge } from "@/components/common/status-badge";
import { useToastContext } from "@/components/providers/toast-provider";
import { Eye, X } from "lucide-react";
import { Application, ApplicationStatus } from "@/types";
import { getMyApplications, withdrawApplication, getStudentDashboardSummary } from "@/lib/api";
import { format, subMonths, startOfYear } from "date-fns";

interface StudentApplicationRow {
  id: string;
  company: string;
  status: ApplicationStatus;
  appliedDate: string;
  appliedDateObj: Date;
  application: Application;
}

export default function ApplicationsPage() {
  const { showToast } = useToastContext();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [applicationLetterApprovedForExports, setApplicationLetterApprovedForExports] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    const loadApplications = async () => {
      setIsLoading(true);
      const [data, summary] = await Promise.all([getMyApplications(), getStudentDashboardSummary()]);
      if (!isMounted) return;
      setApplications(data);
      setApplicationLetterApprovedForExports(summary?.summerTrainingLetterStatus === "approved");
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

  const allTableData = useMemo(
    () =>
      applications.map((app) => ({
        id: app.id,
        company: app.company?.name || "Unknown",
        status: app.status,
        appliedDate: format(app.appliedDate, "MMM dd, yyyy"),
        appliedDateObj: app.appliedDate,
        application: app,
      })),
    [applications]
  );

  const filteredTableData = useMemo(() => {
    const now = new Date();
    return allTableData.filter((row) => {
      const matchesSearch = row.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      
      let matchesDate = true;
      if (dateFilter !== "all") {
        const appliedDate = row.appliedDateObj;
        switch (dateFilter) {
          case "this_month":
            matchesDate = appliedDate.getMonth() === now.getMonth() && appliedDate.getFullYear() === now.getFullYear();
            break;
          case "last_month":
            const lastMonth = subMonths(now, 1);
            matchesDate = appliedDate.getMonth() === lastMonth.getMonth() && appliedDate.getFullYear() === lastMonth.getFullYear();
            break;
          case "last_3_months":
            const threeMonthsAgo = subMonths(now, 3);
            matchesDate = appliedDate >= threeMonthsAgo;
            break;
          case "this_year":
            const yearStart = startOfYear(now);
            matchesDate = appliedDate >= yearStart;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [searchTerm, statusFilter, dateFilter, allTableData]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("all");
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredTableData.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Paginate filtered data
  const paginatedData = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTableData.slice(startIndex, endIndex);
  }, [filteredTableData, safeCurrentPage, pageSize]);

  const columns: ApplicationTableColumn<StudentApplicationRow>[] = [
    {
      key: "company",
      label: "Company",
      render: (value) => <span className="font-medium">{value as string}</span>,
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
      key: "appliedDate",
      label: "Date Applied",
    },
  ];

  const handleView = (row: { application: Application }) => {
    setSelectedApplication(row.application);
    setIsModalOpen(true);
  };

  const handleWithdraw = async (row: { application: Application }) => {
    if (confirm("Are you sure you want to withdraw this application?")) {
      const result = await withdrawApplication(row.application.id);
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      replaceApplicationInState(result.application);
      showToast("Application withdrawn successfully", "success");
    }
  };

  const actions: ApplicationTableAction<StudentApplicationRow>[] = [
    {
      icon: Eye,
      onClick: handleView,
    },
    {
      icon: X,
      onClick: handleWithdraw,
      variant: "ghost" as const,
      className: "text-red-600",
      show: (row: { status: ApplicationStatus }) => row.status === "pending",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Applications"
        description="View and manage your internship applications"
      />

      <ApplicationFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        dateFilter={dateFilter}
        onSearchChange={setSearchTerm}
        onStatusFilterChange={setStatusFilter}
        onDateFilterChange={setDateFilter}
        onClearFilters={handleClearFilters}
      />

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            {isLoading ? "Loading your applications..." : "Your submitted internship applications"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApplicationTable<StudentApplicationRow>
            columns={columns}
            data={paginatedData}
            actions={actions}
          />
          {filteredTableData.length > 0 && (
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredTableData.length}
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
        acceptanceLetterStudentDownloads
        summerApplicationLetterApproved={applicationLetterApprovedForExports}
        placementProgressHints
        onAcceptanceLetterApplicationUpdated={replaceApplicationInState}
      />
    </div>
  );
}
