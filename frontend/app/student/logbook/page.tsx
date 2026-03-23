"use client";

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/common/file-upload";
import { LogbookFilters } from "@/components/student/logbook-filters";
import { ApplicationTable, ApplicationTableColumn } from "@/components/common/application-table";
import { Pagination } from "@/components/common/pagination";
import { useToastContext } from "@/components/providers/toast-provider";
import { Plus, Calendar, Clock, FileText, MessageSquare } from "lucide-react";
import { demoLogbookEntries, demoStudent } from "@/lib/demo-data";
import { LogbookEntry } from "@/types";
import { format, subWeeks, subMonths, startOfYear, startOfWeek, startOfMonth } from "date-fns";

export default function LogbookPage() {
  const { showToast } = useToastContext();
  const [entries, setEntries] = useState(demoLogbookEntries);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [feedbackFilter, setFeedbackFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    hoursWorked: 8,
    attachment: null as File | null,
  });

  const filteredEntries = useMemo(() => {
    const now = new Date();
    return entries.filter((entry) => {
      const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (dateRangeFilter !== "all") {
        const entryDate = new Date(entry.date);
        switch (dateRangeFilter) {
          case "this_week":
            const weekStart = startOfWeek(now);
            matchesDate = entryDate >= weekStart;
            break;
          case "this_month":
            const monthStart = startOfMonth(now);
            matchesDate = entryDate >= monthStart;
            break;
          case "last_month":
            const lastMonthStart = startOfMonth(subMonths(now, 1));
            const lastMonthEnd = startOfMonth(now);
            matchesDate = entryDate >= lastMonthStart && entryDate < lastMonthEnd;
            break;
          case "last_3_months":
            const threeMonthsAgo = subMonths(now, 3);
            matchesDate = entryDate >= threeMonthsAgo;
            break;
          case "this_year":
            const yearStart = startOfYear(now);
            matchesDate = entryDate >= yearStart;
            break;
        }
      }
      
      let matchesFeedback = true;
      if (feedbackFilter !== "all") {
        if (feedbackFilter === "with_feedback") {
          matchesFeedback = !!entry.supervisorFeedback;
        } else if (feedbackFilter === "pending") {
          matchesFeedback = !entry.supervisorFeedback;
        }
      }
      
      return matchesSearch && matchesDate && matchesFeedback;
    });
  }, [searchTerm, dateRangeFilter, feedbackFilter, entries]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setDateRangeFilter("all");
    setFeedbackFilter("all");
    setCurrentPage(1);
  };

  // Paginate filtered data
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredEntries.slice(startIndex, endIndex);
  }, [filteredEntries, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredEntries.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRangeFilter, feedbackFilter]);

  const handleSubmit = () => {
    if (!formData.description.trim()) {
      showToast("Please enter a description", "error");
      return;
    }

    const newEntry: LogbookEntry = {
      id: Date.now().toString(),
      studentId: demoStudent.studentId || "",
      date: new Date(formData.date),
      description: formData.description,
      hoursWorked: formData.hoursWorked,
      attachments: formData.attachment ? [formData.attachment.name] : [],
    };

    setEntries([newEntry, ...entries]);
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      hoursWorked: 8,
      attachment: null,
    });
    setIsAdding(false);
    showToast("Logbook entry added successfully", "success");
  };

  const columns: ApplicationTableColumn[] = [
    {
      key: "date",
      label: "Date",
      render: (value) => format(new Date(value), "MMM dd, yyyy"),
    },
    {
      key: "description",
      label: "Description",
      render: (value) => (
        <p className="max-w-md truncate text-sm">{value}</p>
      ),
    },
    {
      key: "hoursWorked",
      label: "Hours",
      render: (value) => (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: "attachments",
      label: "Attachments",
      render: (value) =>
        value && value.length > 0 ? (
          <FileText className="h-4 w-4 text-primary" />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "supervisorFeedback",
      label: "Feedback",
      render: (value) =>
        value ? (
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Received</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Pending</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Logbook"
        description="Track your daily internship activities"
      >
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </PageHeader>

      <LogbookFilters
        searchTerm={searchTerm}
        dateRangeFilter={dateRangeFilter}
        feedbackFilter={feedbackFilter}
        onSearchChange={setSearchTerm}
        onDateRangeFilterChange={setDateRangeFilter}
        onFeedbackFilterChange={setFeedbackFilter}
        onClearFilters={handleClearFilters}
      />

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>Add Logbook Entry</CardTitle>
            <CardDescription>
              Record your daily activities and hours worked
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hours Worked</Label>
                <Input
                  type="number"
                  min="0"
                  max="12"
                  step="0.5"
                  value={formData.hoursWorked}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hoursWorked: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what you did today..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
              />
            </div>

            <FileUpload
              label="Photo/Attachment (Optional)"
              accept=".pdf,.png,.jpg,.jpeg"
              file={formData.attachment}
              onChange={(file) => setFormData({ ...formData, attachment: file })}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setFormData({
                    date: format(new Date(), "yyyy-MM-dd"),
                    description: "",
                    hoursWorked: 8,
                    attachment: null,
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Save Entry</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Logbook Entries</CardTitle>
          <CardDescription>Your internship activity log</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApplicationTable columns={columns} data={paginatedEntries} />
          {filteredEntries.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredEntries.length}
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
