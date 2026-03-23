"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { ApplicationStatus, EligibilityStatus } from "@/types";

interface ApplicationFiltersProps {
  searchTerm: string;
  statusFilter: ApplicationStatus | "all";
  eligibilityFilter: EligibilityStatus | "all";
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: ApplicationStatus | "all") => void;
  onEligibilityFilterChange: (value: EligibilityStatus | "all") => void;
  onClearFilters: () => void;
}

export function ApplicationFilters({
  searchTerm,
  statusFilter,
  eligibilityFilter,
  onSearchChange,
  onStatusFilterChange,
  onEligibilityFilterChange,
  onClearFilters,
}: ApplicationFiltersProps) {
  const hasActiveFilters = 
    searchTerm !== "" || 
    statusFilter !== "all" || 
    eligibilityFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student name or company..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 rounded-full"
          />
        </div>
        {hasActiveFilters && (
          <Button variant="outline" size="icon" onClick={onClearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Application Status</Label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as ApplicationStatus | "all")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Eligibility Status</Label>
          <select
            value={eligibilityFilter}
            onChange={(e) => onEligibilityFilterChange(e.target.value as EligibilityStatus | "all")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Eligibility</option>
            <option value="eligible">Eligible</option>
            <option value="almost_eligible">Almost Eligible</option>
            <option value="not_eligible">Not Eligible</option>
          </select>
        </div>
      </div>
    </div>
  );
}
