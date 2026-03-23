"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { ApplicationTable, ApplicationTableColumn } from "@/components/common/application-table";
import { ApplicationDetailModal } from "@/components/application/application-detail-modal";
import { ApplicationFilters } from "@/components/student/application-filters";
import { Pagination } from "@/components/common/pagination";
import { StatusBadge } from "@/components/common/status-badge";
import { useToastContext } from "@/components/providers/toast-provider";
import { Eye, X } from "lucide-react";
import { Application, ApplicationStatus } from "@/types";
import { demoApplications, demoCompanies } from "@/lib/demo-data";
import { format, subMonths, subDays, startOfYear } from "date-fns";

export default function ApplicationsPage() {
  const { showToast } = useToastContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Transform demo data for table
  const allTableData = demoApplications.map((app) => {
    const company = demoCompanies.find((c) => c.id === app.companyId);
    return {
      id: app.id,
      company: company?.name || "Unknown",
      status: app.status,
      appliedDate: format(app.appliedDate, "MMM dd, yyyy"),
      appliedDateObj: app.appliedDate,
      application: app, // Store full application object
    };
  });

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

  // Paginate filtered data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTableData.slice(startIndex, endIndex);
  }, [filteredTableData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTableData.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter]);

  const columns: ApplicationTableColumn[] = [
    {
      key: "company",
      label: "Company",
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={value as ApplicationStatus} />,
    },
    {
      key: "appliedDate",
      label: "Date Applied",
    },
  ];

  const handleView = (row: any) => {
    setSelectedApplication(row.application);
    setIsModalOpen(true);
  };

  const handleWithdraw = (row: any) => {
    if (confirm("Are you sure you want to withdraw this application?")) {
      showToast("Application withdrawn successfully", "success");
      // In real app, this would call an API
    }
  };

  const actions = [
    {
      icon: Eye,
      onClick: handleView,
    },
    {
      icon: X,
      onClick: handleWithdraw,
      variant: "ghost" as const,
      className: "text-red-600",
      show: (row: any) => row.status === "pending",
    },
  ];

  const selectedCompany = selectedApplication
    ? demoCompanies.find((c) => c.id === selectedApplication.companyId)
    : null;

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
          <CardDescription>Your submitted internship applications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApplicationTable
            columns={columns}
            data={paginatedData}
            actions={actions}
          />
          {filteredTableData.length > 0 && (
            <Pagination
              currentPage={currentPage}
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
        company={selectedCompany || null}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
