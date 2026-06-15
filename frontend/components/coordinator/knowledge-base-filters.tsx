"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  X,
  Layers,
  ShieldCheck,
  FileText,
  BookOpen,
  BarChart3,
  HelpCircle,
} from "lucide-react";

interface KnowledgeBaseFiltersProps {
  searchTerm: string;
  categoryFilter: string;
  onSearchChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onClearFilters: () => void;
  categories?: string[];
}

const CATEGORY_META: Record<
  string,
  { label: string; bg: string; border: string; active: string; icon: any }
> = {
  all: {
    label: "All Categories",
    bg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    active: "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-md shadow-slate-950/20 scale-105",
    icon: Layers,
  },
  Eligibility: {
    label: "Eligibility",
    bg: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-900/20",
    active: "bg-emerald-600 text-white border-transparent shadow-md shadow-emerald-500/20 scale-105",
    icon: ShieldCheck,
  },
  Application: {
    label: "Application",
    bg: "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-900/20",
    active: "bg-blue-600 text-white border-transparent shadow-md shadow-blue-500/20 scale-105",
    icon: FileText,
  },
  Logbook: {
    label: "Logbook",
    bg: "bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-900/20",
    active: "bg-violet-600 text-white border-transparent shadow-md shadow-violet-500/20 scale-105",
    icon: BookOpen,
  },
  Report: {
    label: "Report",
    bg: "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-900/20",
    active: "bg-rose-600 text-white border-transparent shadow-md shadow-rose-500/20 scale-105",
    icon: BarChart3,
  },
  General: {
    label: "General",
    bg: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-900/20",
    active: "bg-amber-600 text-white border-transparent shadow-md shadow-amber-500/20 scale-105",
    icon: HelpCircle,
  },
};

export function KnowledgeBaseFilters({
  searchTerm,
  categoryFilter,
  onSearchChange,
  onCategoryFilterChange,
  onClearFilters,
  categories = ["Eligibility", "Application", "Logbook", "Report", "General"],
}: KnowledgeBaseFiltersProps) {
  const hasActiveFilters = searchTerm || categoryFilter !== "all";
  const filterList = ["all", ...categories];

  return (
    <div className="space-y-5 bg-card/60 backdrop-blur-sm border rounded-xl p-5 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Modern Search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search rules, guidelines, coordinators, or deadlines..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-11 bg-background border-input/60 rounded-lg shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="h-11 px-5 rounded-lg border-dashed border-muted-foreground/30 hover:border-foreground transition-all shrink-0 hover:bg-accent text-sm"
          >
            <X className="mr-2 h-4 w-4" />
            Reset Filters
          </Button>
        )}
      </div>

      {/* Category Pills */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          Filter by Category
        </label>
        <div className="flex flex-wrap gap-2 pt-1">
          {filterList.map((cat) => {
            const meta = CATEGORY_META[cat] || {
              label: cat,
              bg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
              border: "border-slate-200 dark:border-slate-700",
              active: "bg-slate-700 text-white border-transparent",
              icon: HelpCircle,
            };
            const Icon = meta.icon;
            const isActive = categoryFilter === cat;

            return (
              <button
                key={cat}
                onClick={() => onCategoryFilterChange(cat)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full border transition-all duration-200 cursor-pointer ${
                  isActive
                    ? meta.active
                    : `${meta.bg} ${meta.border} hover:bg-opacity-80 hover:scale-[1.02] hover:shadow-sm`
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

