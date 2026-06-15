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
import {
  ApplicationTable,
  ApplicationTableAction,
  ApplicationTableColumn,
} from "@/components/common/application-table";
import { Pagination } from "@/components/common/pagination";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToastContext } from "@/components/providers/toast-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogbookCalendarView } from "@/components/student/logbook-calendar-view";
import {
  Plus,
  Calendar,
  Clock,
  FileText,
  MessageSquare,
  Pencil,
  Trash2,
  FileDown,
  Loader2,
} from "lucide-react";
import { LogbookEntry, LogbookWeeklyApproval } from "@/types";
import type { Application } from "@/types";
import {
  createLogbookEntry,
  deleteLogbookEntry,
  downloadLogbookWordExport,
  getMyApplications,
  getMyLogbookEntries,
  getMyWeeklyApprovals,
  openProtectedFile,
  submitLogbookToSupervisor,
  submitLogbookToCoordinator,
  updateLogbookEntry,
  uploadFile,
  patchTraineeSummerSelfEvaluation,
  patchTraineeJobOwnWords,
} from "@/lib/api";
import { format, subMonths, startOfYear, startOfWeek, startOfMonth } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LOGBOOK_DESCRIPTION_MAX_WORDS,
  LOGBOOK_DESCRIPTION_MIN_WORDS,
  countLogbookDescriptionWords,
  logbookDescriptionWordError,
} from "@/lib/logbook-description-limits";
import { TRAINEE_SUMMER_SELF_EVAL_ROWS } from "@/lib/trainee-summer-self-eval";

type FormState = {
  date: string;
  description: string;
  hoursWorked: number;
  attachment: File | null;
};

const buildEmptyForm = (): FormState => ({
  date: format(new Date(), "yyyy-MM-dd"),
  description: "",
  hoursWorked: 8,
  attachment: null,
});

const SUMMER_SELF_EVAL_SCORE_OPTIONS = [null, 0, 1, 2, 3, 4] as const;

const TRAINEE_JOB_OWN_WORDS_MAX = 8000;

function latestApprovedPlacementApplication(apps: Application[]): Application | undefined {
  const list = apps.filter(
    (a) => a.status === "approved" || a.status === "ongoing" || a.status === "completed"
  );
  list.sort((a, b) => b.appliedDate.getTime() - a.appliedDate.getTime());
  return list[0];
}

/** Koordinatör acceptance letter doğrularsa günlük açılır; birden fazla aktif başvuda herhangi birinde doğrulama yeter (backend ile uyumlu). */
function anyActivePlacementAcceptanceVerified(apps: Application[]): boolean {
  return apps.some(
    (a) =>
      (a.status === "approved" || a.status === "ongoing" || a.status === "completed") &&
      !!a.acceptanceLetterVerifiedAt
  );
}

function emptySummerSelfEvalScores(): (number | null)[] {
  return Array.from({ length: 12 }, () => null);
}

function summerSelfEvalScoresFromApplication(app: Application | undefined): (number | null)[] {
  const s = app?.traineeSummerSelfEvaluationScores;
  if (!s || s.length !== 12) return emptySummerSelfEvalScores();
  return s.map((x) => (typeof x === "number" && x >= 0 && x <= 4 ? x : null));
}

/** Satır süpervizör onayı veya geri bildirim sonrası düzenlenemez (backend ile uyumlu). */
function isStudentLogbookLocked(entry: LogbookEntry): boolean {
  return !!entry.supervisorApprovedAt || !!entry.supervisorFeedback?.trim();
}

export default function LogbookPage() {
  const { showToast } = useToastContext();
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [feedbackFilter, setFeedbackFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null);
  const [formData, setFormData] = useState<FormState>(buildEmptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<LogbookEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordExporting, setWordExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [weeklyApprovals, setWeeklyApprovals] = useState<LogbookWeeklyApproval[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [submittingSupervisor, setSubmittingSupervisor] = useState(false);
  const [submittingCoordinator, setSubmittingCoordinator] = useState(false);
  const [summerSelfEvalScores, setSummerSelfEvalScores] = useState<(number | null)[]>(
    emptySummerSelfEvalScores()
  );
  const [savingSummerSelfEval, setSavingSummerSelfEval] = useState(false);
  const [traineeJobOwnWordsDraft, setTraineeJobOwnWordsDraft] = useState("");
  const [savingJobOwnWords, setSavingJobOwnWords] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadEntries = async () => {
      setIsLoading(true);
      const [data, weeks, apps] = await Promise.all([
        getMyLogbookEntries(),
        getMyWeeklyApprovals(),
        getMyApplications(),
      ]);
      if (!isMounted) return;
      setEntries(data);
      setWeeklyApprovals(weeks);
      setApplications(apps);
      setIsLoading(false);
    };

    loadEntries();

    return () => {
      isMounted = false;
    };
  }, []);

  const acceptanceGateApplication = useMemo(
    () => latestApprovedPlacementApplication(applications),
    [applications]
  );
  const dailyLogbookEnabled = anyActivePlacementAcceptanceVerified(applications);

  const handleWordExport = async () => {
    setWordExporting(true);
    const r = await downloadLogbookWordExport();
    setWordExporting(false);
    if (!r.success) {
      showToast(r.message, "error");
      return;
    }
    showToast("Word file downloaded.", "success");
  };

  const filteredEntries = useMemo(() => {
    const now = new Date();
    return entries.filter((entry) => {
      const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesDate = true;
      if (dateRangeFilter !== "all") {
        const entryDate = new Date(entry.date);
        switch (dateRangeFilter) {
          case "this_week": {
            const weekStart = startOfWeek(now);
            matchesDate = entryDate >= weekStart;
            break;
          }
          case "this_month": {
            const monthStart = startOfMonth(now);
            matchesDate = entryDate >= monthStart;
            break;
          }
          case "last_month": {
            const lastMonthStart = startOfMonth(subMonths(now, 1));
            const lastMonthEnd = startOfMonth(now);
            matchesDate = entryDate >= lastMonthStart && entryDate < lastMonthEnd;
            break;
          }
          case "last_3_months": {
            const threeMonthsAgo = subMonths(now, 3);
            matchesDate = entryDate >= threeMonthsAgo;
            break;
          }
          case "this_year": {
            const yearStart = startOfYear(now);
            matchesDate = entryDate >= yearStart;
            break;
          }
        }
      }

      let matchesReview = true;
      if (feedbackFilter !== "all") {
        const locked = isStudentLogbookLocked(entry);
        if (feedbackFilter === "still_editable") {
          matchesReview = !locked;
        } else if (feedbackFilter === "locked") {
          matchesReview = locked;
        } else if (feedbackFilter === "has_feedback_text") {
          matchesReview = !!entry.supervisorFeedback?.trim();
        }
      }

      return matchesSearch && matchesDate && matchesReview;
    });
  }, [searchTerm, dateRangeFilter, feedbackFilter, entries]);

  const placementApplication = useMemo(() => {
    const list = applications.filter((a) => a.status === "ongoing" || a.status === "completed");
    list.sort((a, b) => b.appliedDate.getTime() - a.appliedDate.getTime());
    return list[0];
  }, [applications]);

  useEffect(() => {
    queueMicrotask(() => {
      setSummerSelfEvalScores(summerSelfEvalScoresFromApplication(placementApplication));
      setTraineeJobOwnWordsDraft(placementApplication?.traineeJobOwnWords ?? "");
    });
  }, [placementApplication]);

  const allEntriesSupervisorApproved =
    entries.length > 0 && entries.every((e) => !!e.supervisorApprovedAt);

  const canSubmitLogbookToSupervisor =
    !!placementApplication &&
    dailyLogbookEnabled &&
    !placementApplication.logbookSubmittedToSupervisorAt &&
    allEntriesSupervisorApproved &&
    entries.length > 0;

  const canSubmitLogbookToCoordinator =
    !!placementApplication &&
    dailyLogbookEnabled &&
    !!placementApplication.supervisorEvaluationCompletedAt &&
    !placementApplication.logbookSubmittedForCoordinatorReviewAt;

  const handleSubmitToSupervisor = async () => {
    setSubmittingSupervisor(true);
    const result = await submitLogbookToSupervisor();
    setSubmittingSupervisor(false);
    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    showToast("Your logbook was sent to your supervisor for final evaluation.", "success");
    const apps = await getMyApplications();
    setApplications(apps);
  };

  const handleSubmitToCoordinator = async () => {
    setSubmittingCoordinator(true);
    const result = await submitLogbookToCoordinator();
    setSubmittingCoordinator(false);
    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    showToast("Your finalized logbook was sent to the university coordinator.", "success");
    const apps = await getMyApplications();
    setApplications(apps);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDateRangeFilter("all");
    setFeedbackFilter("all");
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedEntries = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredEntries.slice(startIndex, endIndex);
  }, [filteredEntries, safeCurrentPage, pageSize]);

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingEntry(null);
    setFormData(buildEmptyForm());
  };

  const openCreateForm = () => {
    setEditingEntry(null);
    setFormData(buildEmptyForm());
    setIsFormOpen(true);
  };

  const openEditForm = (entry: LogbookEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: format(new Date(entry.date), "yyyy-MM-dd"),
      description: entry.description,
      hoursWorked: entry.hoursWorked,
      attachment: null,
    });
    setIsFormOpen(true);
  };

  const descriptionWordCount = useMemo(
    () => countLogbookDescriptionWords(formData.description),
    [formData.description]
  );
  const descriptionWordsOk =
    logbookDescriptionWordError(descriptionWordCount) === null;

  const handleCalendarDateClick = (date: Date, entry?: LogbookEntry) => {
    if (entry) {
      openEditForm(entry);
    } else {
      if (!dailyLogbookEnabled) return;
      setEditingEntry(null);
      setFormData({
        ...buildEmptyForm(),
        date: format(date, "yyyy-MM-dd"),
      });
      setIsFormOpen(true);
    }
  };

  const handleSubmit = async () => {
    if (placementApplication?.internshipStartDate && placementApplication?.internshipEndDate) {
      const selected = new Date(formData.date);
      selected.setHours(0, 0, 0, 0);
      const start = new Date(placementApplication.internshipStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(placementApplication.internshipEndDate);
      end.setHours(0, 0, 0, 0);

      if (selected < start || selected > end) {
        showToast(`Date must be between ${format(start, "MMM dd, yyyy")} and ${format(end, "MMM dd, yyyy")}`, "error");
        return;
      }
    }

    if (!formData.description.trim()) {
      showToast("Please enter a description", "error");
      return;
    }
    const wordErr = logbookDescriptionWordError(descriptionWordCount);
    if (wordErr) {
      showToast(wordErr, "error");
      return;
    }
    if (formData.hoursWorked <= 0) {
      showToast("Hours worked must be greater than 0", "error");
      return;
    }

    setIsSaving(true);

    let attachmentFileIds: string[] | undefined;

    if (formData.attachment) {
      const upload = await uploadFile(formData.attachment, "logbook");
      if (!upload.success) {
        setIsSaving(false);
        showToast(`Attachment upload failed: ${upload.message}`, "error");
        return;
      }
      attachmentFileIds = [upload.file.id];
    }

    if (editingEntry) {
      const result = await updateLogbookEntry(editingEntry.id, {
        date: formData.date,
        description: formData.description,
        hoursWorked: formData.hoursWorked,
        // Yeni dosya yüklendiyse değiştir, yoksa attachments alanına dokunma
        attachmentFileIds,
      });
      setIsSaving(false);

      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      setEntries((prev) =>
        prev.map((entry) => (entry.id === result.entry.id ? result.entry : entry))
      );
      showToast("Logbook entry updated", "success");
    } else {
      const result = await createLogbookEntry({
        date: formData.date,
        description: formData.description,
        hoursWorked: formData.hoursWorked,
        attachmentFileIds,
      });
      setIsSaving(false);

      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      setEntries((prev) => [result.entry, ...prev]);
      showToast("Logbook entry added successfully", "success");
    }

    closeForm();
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    setIsDeleting(true);
    const result = await deleteLogbookEntry(entryToDelete.id);
    setIsDeleting(false);

    if (!result.success) {
      showToast(result.message, "error");
      return;
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== entryToDelete.id));
    showToast("Logbook entry deleted", "success");
    setEntryToDelete(null);
  };

  const columns: ApplicationTableColumn<LogbookEntry>[] = [
    {
      key: "date",
      label: "Date",
      render: (value) => format(new Date(value as string | Date), "MMM dd, yyyy"),
    },
    {
      key: "description",
      label: "Description",
      render: (value) => (
        <p className="max-w-md truncate text-sm">{value as string}</p>
      ),
    },
    {
      key: "hoursWorked",
      label: "Hours",
      render: (value) => (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{value as number}</span>
        </div>
      ),
    },
    {
      key: "attachments",
      label: "Attachments",
      render: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="flex items-center gap-2">
            {(value as string[]).map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={async () => {
                  const result = await openProtectedFile(url);
                  if (!result.success) {
                    showToast(result.message || "Could not open attachment.", "error");
                  }
                }}
                className="inline-flex items-center text-primary hover:underline"
                title={`Attachment ${index + 1}`}
              >
                <FileText className="h-4 w-4" />
              </button>
            ))}
          </div>
        );
      },
    },
    {
      key: "supervisorFeedback",
      label: "Supervisor feedback",
      render: (value) =>
        value ? (
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Received</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Awaiting supervisor</span>
        ),
    },
    {
      key: "supervisorApprovedAt",
      label: "Supervisor sign-off",
      render: (_value, row) => {
        const entry = row;
        if (entry.supervisorApprovedAt) {
          return (
            <div className="text-xs">
              <span className="font-medium text-green-600">Approved</span>
              <div className="text-muted-foreground">
                {format(entry.supervisorApprovedAt, "yyyy-MM-dd HH:mm")} UTC
                {entry.supervisorApprovedByName?.trim()
                  ? ` · ${entry.supervisorApprovedByName}`
                  : ""}
              </div>
            </div>
          );
        }
        if (entry.supervisorFeedback?.trim()) {
          return <span className="text-xs text-amber-700">Locked (feedback)</span>;
        }
        return <span className="text-muted-foreground text-xs">—</span>;
      },
    },
  ];

  const actions: ApplicationTableAction<LogbookEntry>[] = [
    {
      icon: Pencil,
      onClick: openEditForm,
      variant: "ghost",
      show: (row) => !isStudentLogbookLocked(row),
    },
    {
      icon: Trash2,
      onClick: (row) => setEntryToDelete(row),
      variant: "ghost",
      className: "text-destructive hover:text-destructive",
      show: (row) => !isStudentLogbookLocked(row),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Logbook"
        description="Your assigned company supervisor signs off each row and can approve whole weeks. They are notified when you add an entry (not the coordinator). Submit the completed logbook to the university below once every row is approved."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleWordExport}
            disabled={wordExporting || !dailyLogbookEnabled}
          >
            {wordExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Word (template)
          </Button>
          <Button onClick={openCreateForm} disabled={!dailyLogbookEnabled}>
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </PageHeader>

      {acceptanceGateApplication && !dailyLogbookEnabled && (
        <Card className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/25 dark:border-amber-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-950 dark:text-amber-100">
              Acceptance letter required before logbook
            </CardTitle>
            <CardDescription className="text-amber-900/90 dark:text-amber-100/85">
              The logbook needs an acceptance verification timestamp on your placement. With the current rules this
              is recorded automatically when both the internship coordinator and the company have approved your
              placement. Download the <strong>summer acceptance letter</strong> from{" "}
              <Link href="/student/applications" className="font-medium underline underline-offset-2">
                My Applications
              </Link>{" "}
              if you still need the Word template.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-amber-950/90 dark:text-amber-50/90 space-y-1">
            {acceptanceGateApplication.acceptanceLetterVerifiedAt ? (
              <p className="text-green-800 dark:text-green-300">
                Acceptance verified — if you still see this banner, refresh the page.
              </p>
            ) : (
              <p>
                No verification date yet on your active placement(s). Try refreshing the page. If your placement is
                already approved by both sides and this persists, contact the internship office — the database row may
                need a one-time refresh after a server update.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <LogbookFilters
        searchTerm={searchTerm}
        dateRangeFilter={dateRangeFilter}
        feedbackFilter={feedbackFilter}
        onSearchChange={setSearchTerm}
        onDateRangeFilterChange={setDateRangeFilter}
        onFeedbackFilterChange={setFeedbackFilter}
        onClearFilters={handleClearFilters}
      />

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-[240px] grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Logbook Finalization Workflow</CardTitle>
              <CardDescription>
                Once you finish adding all entries and your supervisor has approved each row, you must send the logbook to your supervisor for their final evaluation (Phase 1). After they complete it (Phase 2), you must fill your self-evaluation and send it to the university (Phase 3).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!dailyLogbookEnabled && acceptanceGateApplication ? (
                <p className="text-sm text-muted-foreground">
                  Submission available after your acceptance letter is verified.
                </p>
              ) : !placementApplication ? (
                <p className="text-sm text-muted-foreground">
                  You need an internship marked <strong>ongoing</strong> or <strong>completed</strong> to finalize your logbook.
                </p>
              ) : entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add logbook entries first, then get each row approved.</p>
              ) : !allEntriesSupervisorApproved ? (
                <p className="text-sm text-muted-foreground">
                  Every logbook row must have supervisor sign-off before you can finalize your logbook.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border p-4 space-y-3">
                    <h4 className="font-medium">Step 1: Submit to Supervisor</h4>
                    {placementApplication.logbookSubmittedToSupervisorAt ? (
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Sent to supervisor on {format(placementApplication.logbookSubmittedToSupervisorAt, "MMM d, yyyy HH:mm")} UTC.
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Send your completed logbook to your supervisor so they can fill out the Program Outcomes (PO) and Observations forms.
                        </p>
                        <Button
                          type="button"
                          onClick={handleSubmitToSupervisor}
                          disabled={submittingSupervisor || !canSubmitLogbookToSupervisor}
                        >
                          {submittingSupervisor ? "Submitting…" : "Send to Supervisor"}
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="rounded-md border p-4 space-y-3">
                    <h4 className="font-medium">Step 2: Submit to Coordinator</h4>
                    {!placementApplication.supervisorEvaluationCompletedAt ? (
                      <p className="text-sm text-muted-foreground">
                        Waiting for your company supervisor to complete their evaluation.
                      </p>
                    ) : placementApplication.logbookSubmittedForCoordinatorReviewAt ? (
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Sent to coordinator on {format(placementApplication.logbookSubmittedForCoordinatorReviewAt, "MMM d, yyyy HH:mm")} UTC.
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Your supervisor completed their evaluation! Fill out the &quot;self-assessment&quot; below, then send the final version to the university.
                        </p>
                        <Button
                          type="button"
                          onClick={handleSubmitToCoordinator}
                          disabled={submittingCoordinator || !canSubmitLogbookToCoordinator}
                        >
                          {submittingCoordinator ? "Submitting…" : "Send to Coordinator"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Daily Logbook Entries</CardTitle>
              <CardDescription>
                {isLoading ? "Loading entries..." : `${filteredEntries.length} logbook rows found`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApplicationTable<LogbookEntry> columns={columns} data={paginatedEntries} actions={actions} />
              {filteredEntries.length > 0 && (
                <Pagination
                  currentPage={safeCurrentPage}
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
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Calendar View</CardTitle>
              <CardDescription>
                Visualize your internship days and supervisor sign-off status. Click any date to add or edit an entry.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LogbookCalendarView
                entries={entries}
                onDateClick={handleCalendarDateClick}
                internshipStart={placementApplication?.internshipStartDate}
                internshipEnd={placementApplication?.internshipEndDate}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {placementApplication && (
        <Card>
          <CardHeader>
            <CardTitle>Summer training evaluation (self-assessment)</CardTitle>
            <CardDescription>
              The trainee should fill this part. Scale: 0 = no contribution → 4 = strong contribution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!placementApplication.supervisorEvaluationCompletedAt ? (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed p-3 bg-muted/20">
                This form unlocks after your company supervisor completes their evaluation.
              </p>
            ) : placementApplication.logbookSubmittedForCoordinatorReviewAt ? (
               <p className="text-sm text-muted-foreground rounded-md border border-dashed p-3 bg-muted/20">
                You have already submitted the logbook to the coordinator, so this self-assessment is locked.
              </p>
            ) : (
              <>
                <div className="max-h-[min(480px,55vh)] overflow-y-auto rounded-md border p-3 space-y-1 bg-muted/20">
                  {TRAINEE_SUMMER_SELF_EVAL_ROWS.map((row, index) => (
                    <div
                      key={row.formNumber}
                      className="border-b border-border py-3 space-y-2 last:border-b-0"
                    >
                      <p className="text-xs leading-snug text-muted-foreground">
                        <span className="font-medium text-foreground">({row.formNumber})</span> {row.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs font-medium shrink-0">Score:</span>
                        {SUMMER_SELF_EVAL_SCORE_OPTIONS.map((opt) => (
                          <label
                            key={String(opt)}
                            className="flex items-center gap-1 text-xs cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`summer-self-eval-${index}`}
                              checked={
                                opt === null
                                  ? summerSelfEvalScores[index] === null
                                  : summerSelfEvalScores[index] === opt
                              }
                              onChange={() =>
                                setSummerSelfEvalScores((prev) => {
                                  const next = [...prev];
                                  next[index] = opt;
                                  return next;
                                })
                              }
                            />
                            {opt === null ? "—" : String(opt)}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  disabled={savingSummerSelfEval}
                  onClick={async () => {
                    setSavingSummerSelfEval(true);
                    const result = await patchTraineeSummerSelfEvaluation(
                      placementApplication.id,
                      summerSelfEvalScores
                    );
                    setSavingSummerSelfEval(false);
                    if (!result.success) {
                      showToast(result.message, "error");
                      return;
                    }
                    showToast("Evaluation saved.", "success");
                    const apps = await getMyApplications();
                    setApplications(apps);
                  }}
                >
                  {savingSummerSelfEval ? "Saving…" : "Save evaluation"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Weekly supervisor sign-off</CardTitle>
          <CardDescription>
            Weeks your company supervisor marked as reviewed (calendar week, Monday start).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : !dailyLogbookEnabled && acceptanceGateApplication ? (
            <p className="text-sm text-muted-foreground">
              Weekly approvals appear after your acceptance letter is verified and your supervisor can record them.
            </p>
          ) : weeklyApprovals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No weekly approvals recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {weeklyApprovals.map((w) => (
                <li key={w.id} className="rounded-md border border-border/60 bg-muted/15 p-3">
                  <div className="font-medium text-foreground">
                    Week of {format(w.weekStartUtc, "MMM d, yyyy")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Signed {format(w.approvedAtUtc, "MMM d, yyyy HH:mm")} UTC
                    {w.approvedByName ? ` · ${w.approvedByName}` : ""}
                  </div>
                  {w.notes ? (
                    <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">{w.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10 pointer-events-none" />
          
          <DialogHeader className="px-8 pt-8 relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {editingEntry ? "Edit Activity" : "New Activity"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-sm">
              {editingEntry
                ? "Refine your internship records for this date."
                : "Record your professional journey. Your supervisor will be notified."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-8 py-6 relative">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Activity Date
                </Label>
                <div className="relative group">
                  <Input
                    type="date"
                    value={formData.date}
                    min={placementApplication?.internshipStartDate ? format(new Date(placementApplication.internshipStartDate), "yyyy-MM-dd") : undefined}
                    max={placementApplication?.internshipEndDate ? format(new Date(placementApplication.internshipEndDate), "yyyy-MM-dd") : undefined}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="bg-muted/30 border-border/50 focus:bg-background transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Time Invested (Hours)
                </Label>
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
                  className="bg-muted/30 border-border/50 focus:bg-background transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                Work Description
              </Label>
              <Textarea
                placeholder="What did you achieve today? Be descriptive..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={8}
                className="bg-muted/30 border-border/50 focus:bg-background transition-all resize-none text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <p
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-tighter",
                    descriptionWordsOk ? "text-muted-foreground" : "text-destructive"
                  )}
                >
                  {descriptionWordCount} / {LOGBOOK_DESCRIPTION_MAX_WORDS} words 
                  <span className="mx-1 opacity-30">|</span> 
                  min {LOGBOOK_DESCRIPTION_MIN_WORDS}
                </p>
                {!descriptionWordsOk && (
                   <span className="text-[10px] text-destructive animate-pulse font-bold uppercase">
                      Requirement not met
                   </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Plus className="h-3 w-3" />
                Supporting Documents
              </Label>
              <FileUpload
                label="Click to upload or drag & drop (PDF, PNG, JPG)"
                accept=".pdf,.png,.jpg,.jpeg"
                file={formData.attachment}
                onChange={(file) => setFormData({ ...formData, attachment: file })}
              />
            </div>

            {editingEntry && editingEntry.attachments && editingEntry.attachments.length > 0 && !formData.attachment && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <p className="text-[10px] text-blue-500 font-medium">
                  Maintaining current attachment
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-8 py-6 bg-muted/30 border-t border-border/50">
            <Button variant="ghost" onClick={closeForm} disabled={isSaving} className="font-semibold">
              Discard
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving || !descriptionWordsOk} className="px-8 shadow-lg shadow-primary/20 font-bold">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingEntry ? "Update Activity" : "Secure Log"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {placementApplication && (
        <Card>
          <CardHeader>
            <CardTitle>Trainee&apos;s job details</CardTitle>
            <CardDescription>
              Explain the internship work in your own words. Exported to Word as{" "}
              <span className="font-mono text-xs">{"{{TraineeJobOwnWords}}"}</span>. Editable until you submit your
              logbook to the coordinator above.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {placementApplication.logbookSubmittedForCoordinatorReviewAt ? (
              <div className="rounded-md border border-dashed p-3 bg-muted/20 text-sm whitespace-pre-wrap">
                {placementApplication.traineeJobOwnWords?.trim()
                  ? placementApplication.traineeJobOwnWords
                  : "—"}
              </div>
            ) : (
              <>
                <Textarea
                  value={traineeJobOwnWordsDraft}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTraineeJobOwnWordsDraft(
                      v.length > TRAINEE_JOB_OWN_WORDS_MAX
                        ? v.slice(0, TRAINEE_JOB_OWN_WORDS_MAX)
                        : v
                    );
                  }}
                  rows={8}
                  placeholder="Describe what you did and learned in your own words…"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {traineeJobOwnWordsDraft.length} / {TRAINEE_JOB_OWN_WORDS_MAX} characters
                  </p>
                  <Button
                    type="button"
                    disabled={
                      savingJobOwnWords ||
                      traineeJobOwnWordsDraft === (placementApplication.traineeJobOwnWords ?? "")
                    }
                    onClick={async () => {
                      setSavingJobOwnWords(true);
                      const result = await patchTraineeJobOwnWords(
                        placementApplication.id,
                        traineeJobOwnWordsDraft
                      );
                      setSavingJobOwnWords(false);
                      if (!result.success) {
                        showToast(result.message, "error");
                        return;
                      }
                      showToast("Job details saved.", "success");
                      const apps = await getMyApplications();
                      setApplications(apps);
                    }}
                  >
                    {savingJobOwnWords ? "Saving…" : "Save job details"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Logbook Entries</CardTitle>
          <CardDescription>
            {isLoading ? "Loading your logbook..." : "Your internship activity log"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApplicationTable<LogbookEntry>
            columns={columns}
            data={paginatedEntries}
            actions={actions}
          />
          {filteredEntries.length > 0 && (
            <Pagination
              currentPage={safeCurrentPage}
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

      <Dialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Logbook Entry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the entry from{" "}
            {entryToDelete && format(new Date(entryToDelete.date), "MMM dd, yyyy")}? This
            action cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEntryToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
