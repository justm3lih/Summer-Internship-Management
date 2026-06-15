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

interface LogbookFiltersProps {
  searchTerm: string;
  dateRangeFilter: string;
  feedbackFilter: string;
  onSearchChange: (value: string) => void;
  onDateRangeFilterChange: (value: string) => void;
  onFeedbackFilterChange: (value: string) => void;
  onClearFilters: () => void;
}

export function LogbookFilters({
  searchTerm,
  dateRangeFilter,
  feedbackFilter,
  onSearchChange,
  onDateRangeFilterChange,
  onFeedbackFilterChange,
  onClearFilters,
}: LogbookFiltersProps) {
  const hasActiveFilters = searchTerm || dateRangeFilter !== "all" || feedbackFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search entries by description..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 rounded-full"
          />
        </div>

        <Select value={dateRangeFilter} onValueChange={onDateRangeFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
          </SelectContent>
        </Select>

        <Select value={feedbackFilter} onValueChange={onFeedbackFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Supervisor review" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entries</SelectItem>
            <SelectItem value="still_editable">Still editable</SelectItem>
            <SelectItem value="locked">Locked (feedback or sign-off)</SelectItem>
            <SelectItem value="has_feedback_text">Has written feedback</SelectItem>
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
