"use client";

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CompanySearchFilter } from "@/components/application/company-search-filter";
import { ApplicationTable, ApplicationTableColumn } from "@/components/common/application-table";
import { Pagination } from "@/components/common/pagination";
import { useToastContext } from "@/components/providers/toast-provider";
import { Building2, MapPin, Star, Users, CheckCircle2, XCircle, Edit, Plus } from "lucide-react";
import { demoCompanies } from "@/lib/demo-data";
import { Company } from "@/types";

export default function CompaniesPage() {
  const { showToast } = useToastContext();
  const [companies, setCompanies] = useState(demoCompanies);
  const [filteredCompanies, setFilteredCompanies] = useState(companies);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isAdding, setIsAdding] = useState(false);

  // Paginate filtered companies
  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredCompanies.slice(startIndex, endIndex);
  }, [filteredCompanies, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredCompanies.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredCompanies.length]);

  const handleApprove = (companyId: string) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, approved: true } : c))
    );
    showToast("Company approved", "success");
  };

  const handleReject = (companyId: string) => {
    if (confirm("Are you sure you want to reject this company?")) {
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, approved: false } : c))
      );
      showToast("Company rejected", "info");
    }
  };

  const handleEdit = (company: Company) => {
    showToast(`Editing ${company.name}`, "info");
  };

  const columns: ApplicationTableColumn[] = [
    {
      key: "name",
      label: "Company",
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: "sector",
      label: "Sector",
      render: (value) => <Badge variant="secondary">{value}</Badge>,
    },
    {
      key: "location",
      label: "Location",
      render: (value) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: "positionsOffered",
      label: "Positions",
      render: (value) => (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: "averageRating",
      label: "Rating",
      render: (value) =>
        value ? (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-sm">{value.toFixed(1)}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "approved",
      label: "Status",
      render: (value) =>
        value ? (
          <Badge variant="success">Approved</Badge>
        ) : (
          <Badge variant="warning">Pending</Badge>
        ),
    },
  ];

  const actions = [
    {
      icon: Edit,
      onClick: (row: Company) => handleEdit(row),
      variant: "ghost" as const,
    },
    {
      icon: CheckCircle2,
      onClick: (row: Company) => handleApprove(row.id),
      variant: "ghost" as const,
      className: "text-green-600",
      show: (row: Company) => !row.approved,
    },
    {
      icon: XCircle,
      onClick: (row: Company) => handleReject(row.id),
      variant: "ghost" as const,
      className: "text-red-600",
      show: (row: Company) => row.approved,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies Management"
        description="Manage approved companies and review new applications"
      >
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
      </PageHeader>

      <CompanySearchFilter
        companies={companies}
        onFilterChange={setFilteredCompanies}
      />

      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
          <CardDescription>
            {filteredCompanies.length} company(ies) found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApplicationTable
            columns={columns}
            data={paginatedCompanies}
            actions={actions}
          />
          {filteredCompanies.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredCompanies.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
