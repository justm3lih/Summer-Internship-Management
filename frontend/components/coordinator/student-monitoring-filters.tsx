"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { ApplicationStatus, EligibilityStatus } from "@/types";

interface StudentMonitoringFiltersProps {
  searchTerm: string;
  /** Koordinatör ayarlarından gelen bölüm adları + filtre */
  departmentOptions: string[];
  departmentFilter: string;
  eligibilityFilter: EligibilityStatus | "all";
  internshipStatusFilter: ApplicationStatus | "all";
  reportStatusFilter: string;
  onSearchChange: (value: string) => void;
  onDepartmentFilterChange: (value: string) => void;
  onEligibilityFilterChange: (value: EligibilityStatus | "all") => void;
  onInternshipStatusFilterChange: (value: ApplicationStatus | "all") => void;
  onReportStatusFilterChange: (value: string) => void;
  onClearFilters: () => void;
}

export function StudentMonitoringFilters({
  searchTerm,
  departmentOptions,
  departmentFilter,
  eligibilityFilter,
  internshipStatusFilter,
  reportStatusFilter,
  onSearchChange,
  onDepartmentFilterChange,
  onEligibilityFilterChange,
  onInternshipStatusFilterChange,
  onReportStatusFilterChange,
  onClearFilters,
}: StudentMonitoringFiltersProps) {
  const hasActiveFilters =
    searchTerm ||
    departmentFilter !== "all" ||
    eligibilityFilter !== "all" ||
    internshipStatusFilter !== "all" ||
    reportStatusFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 rounded-full"
          />
        </div>

        <Select value={departmentFilter} onValueChange={onDepartmentFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departmentOptions.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={eligibilityFilter} onValueChange={onEligibilityFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Eligibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Eligibility</SelectItem>
            <SelectItem value="eligible">Eligible</SelectItem>
            <SelectItem value="almost_eligible">Almost Eligible</SelectItem>
            <SelectItem value="not_eligible">Not Eligible</SelectItem>
          </SelectContent>
        </Select>

        <Select value={internshipStatusFilter} onValueChange={onInternshipStatusFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Internship Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="not_applied">Not Applied</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={reportStatusFilter} onValueChange={onReportStatusFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Report Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reports</SelectItem>
            <SelectItem value="not_submitted">Not Submitted</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" onClick={onClearFilters} className="w-full md:w-auto">
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
