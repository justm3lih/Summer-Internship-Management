"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import {
  downloadSummerApplicationLetterBlank,
  downloadSummerApplicationLetterWord,
  getMySummerTrainingLetter,
  patchSummerTrainingLetterCourses,
  submitSummerTrainingLetterToAdvisor,
} from "@/lib/api";
import type { SummerTrainingLetterCourseRow, SummerTrainingLetterDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToastContext } from "@/components/providers/toast-provider";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { describeApplicationLetterStatus } from "@/lib/application-letter-status";
import {
  SUMMER_LETTER_GRADE_EMPTY_SENTINEL,
  SUMMER_LETTER_TRANSCRIPT_GRADE_OPTIONS,
  isSelectableSummerLetterGrade,
  summerLetterLegacyGradeSelectValue,
} from "@/lib/summer-letter-grade-options";
import {
  UNIFIED_REGISTERED_STAR,
  UNIFIED_STATUS_NOT_ENROLLED_VALUE,
  normalizeSummerLetterRegisteredUi,
  summerLetterRowToUnifiedSelectValue,
  unifiedCourseSelectToRowFields,
} from "@/lib/summer-letter-unified-course-select";

const editableStatuses = new Set(["draft", "advisor_rejected", "coordinator_rejected"]);

function StatusLine({ status }: { status: SummerTrainingLetterDetail["status"] }) {
  return <p className="text-sm text-muted-foreground">{describeApplicationLetterStatus(status)}</p>;
}

export default function StudentSummerTrainingLetterPage() {
  const { showToast } = useToastContext();
  const [letter, setLetter] = useState<SummerTrainingLetterDetail | null>(null);
  const [courses, setCourses] = useState<SummerTrainingLetterCourseRow[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wordBlankExporting, setWordBlankExporting] = useState(false);
  const [wordFilledExporting, setWordFilledExporting] = useState(false);

  const fetchLetterData = useCallback(async () => {
    const l = await getMySummerTrainingLetter();
    if (!l) {
      setLetter(null);
      return;
    }
    setLetter(l);
    setCourses(
      l.courseRows.map((row) => ({
        ...row,
        registered: normalizeSummerLetterRegisteredUi(row.registered),
      }))
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void fetchLetterData().finally(() => {
        if (!cancelled) setLoading(false);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [fetchLetterData]);

  const handleWordBlankExport = async () => {
    setWordBlankExporting(true);
    const r = await downloadSummerApplicationLetterBlank();
    setWordBlankExporting(false);
    if (!r.success) {
      showToast(r.message, "error");
      return;
    }
    showToast("Blank template downloaded.", "success");
  };

  const handleWordFilledExport = async () => {
    setWordFilledExporting(true);
    const r = await downloadSummerApplicationLetterWord();
    setWordFilledExporting(false);
    if (!r.success) {
      showToast(r.message, "error");
      return;
    }
    showToast("Filled Word downloaded.", "success");
  };

  const canEdit = letter && editableStatuses.has(letter.status);

  const saveCourses = async () => {
    if (!letter || !canEdit) return;
    setSaving(true);
    const res = await patchSummerTrainingLetterCourses(letter.id, courses);
    setSaving(false);
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    setLetter(res.letter);
    setCourses(res.letter.courseRows.map((row) => ({ ...row })));
    showToast(
      "Course table saved. If every row had a complete choice, internship eligibility was updated — refresh if the dashboard still looks stale.",
      "success"
    );
  };

  const submit = async () => {
    if (!letter || !canEdit) return;
    if (!letter.advisorUserId) {
      showToast("No advisor is assigned to your profile yet. Ask the coordinator.", "error");
      return;
    }
    if (!accepted) {
      showToast("Please accept the terms (electronic signature).", "error");
      return;
    }
    setSubmitting(true);
    const patch = await patchSummerTrainingLetterCourses(letter.id, courses);
    if (!patch.success) {
      showToast(patch.message, "error");
      setSubmitting(false);
      return;
    }
    const res = await submitSummerTrainingLetterToAdvisor(patch.letter.id);
    setSubmitting(false);
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    showToast("Sent to your advisor.", "success");
    setLetter(res.letter);
    setCourses(res.letter.courseRows.map((row) => ({ ...row })));
    setAccepted(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading letter…
      </div>
    );
  }

  if (!letter) {
    return <p className="text-sm text-muted-foreground">Could not load letter.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Application letter"
        description="Complete this before submitting an internship placement application."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Advisor</CardTitle>
          <CardDescription>
            {letter.advisorName?.trim()
              ? `Assigned advisor: ${letter.advisorName}`
              : "No advisor assigned — your coordinator assigns this in Student Monitoring."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-base">Progress</CardTitle>
            <StatusLine status={letter.status} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={wordBlankExporting}
              onClick={handleWordBlankExport}
            >
              {wordBlankExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Download blank Word"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={wordFilledExporting || letter.status !== "approved"}
              title={
                letter.status !== "approved"
                  ? "Available after advisor and internship coordinator approve your application letter."
                  : undefined
              }
              onClick={handleWordFilledExport}
            >
              {wordFilledExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Download filled Word"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 text-xs text-muted-foreground">
          “Blank” is the ministry/university-style .docx with merge tags (same file the system uses — you can edit in Word).
          “Filled” uses your saved course table for the configured summer period and is downloadable only after advisor and
          internship coordinator approval. Save your table first so the download matches what you typed.
        </CardContent>
        {letter.status === "approved" && (
          <CardContent className="pt-0">
            <Button asChild className="w-fit">
              <Link href="/student/apply">Continue to internship application</Link>
            </Button>
          </CardContent>
        )}
      </Card>

      <Card id="summer-letter-course-table">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Course table</CardTitle>
            <CardDescription className="text-xs font-normal">
              Course codes follow the departmental template. Choose a letter grade from the <strong>Grade</strong>{" "}
              dropdown. For <strong>Registered</strong>, choose <strong>*</strong> if you are enrolled <em>this term</em>,{" "}
              <strong>Previously completed</strong> if you already finished the course in the past (pick your grade), or{" "}
              <strong>Not enrolled</strong> if you are not taking it now and have not completed it yet. Click{" "}
              <strong>Save draft</strong> when every grade row has a selection — the portal then counts passing grades (A–D
              range, same rule as before) against the configured minimum and updates internship eligibility automatically
              (eligibility uses <strong>Grade</strong>, not the Registered dropdown).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" type="button" disabled={!canEdit || saving} onClick={saveCourses}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save draft"}
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Course</TableHead>
                <TableHead className="min-w-[260px]">{"Status & grade"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((row, i) => (
                <TableRow key={`${row.code}-${i}`}>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell className="max-w-[220px] text-sm">{row.name}</TableCell>
                  <TableCell className="min-w-[260px]">
                    <Select
                      disabled={!canEdit}
                      value={summerLetterRowToUnifiedSelectValue(row, i)}
                      onValueChange={(value) => {
                        const next = [...courses];
                        next[i] = { ...next[i], ...unifiedCourseSelectToRowFields(value) };
                        setCourses(next);
                      }}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select status or grade" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(24rem,70vh)]">
                        <SelectItem value={SUMMER_LETTER_GRADE_EMPTY_SENTINEL}>Select…</SelectItem>
                        <SelectGroup>
                          <SelectLabel>This term</SelectLabel>
                          <SelectItem value={UNIFIED_REGISTERED_STAR}>Taking this term (grade pending)</SelectItem>
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Not taken yet</SelectLabel>
                          <SelectItem value={UNIFIED_STATUS_NOT_ENROLLED_VALUE}>
                            Not enrolled in this course yet
                          </SelectItem>
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Completed — transcript grade</SelectLabel>
                          {SUMMER_LETTER_TRANSCRIPT_GRADE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        {row.grade.trim() && !isSelectableSummerLetterGrade(row.grade) ? (
                          <SelectItem value={summerLetterLegacyGradeSelectValue(i, row.grade)}>
                            Saved: {row.grade} — pick listed value
                          </SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-muted-foreground">
            One choice per row replaces the old separate Registered + Grade columns (API still stores both for Word export).
            Passing <strong>A–D</strong> letter grades count toward eligibility; <strong>F / FF / FX</strong> do not;{" "}
            <strong>pending / not enrolled</strong> rows do not add to the pass count until you have a passing grade.
          </p>
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Terms & electronic acceptance</CardTitle>
            <CardDescription>
              Checking this confirms the SWEN departmental terms without a handwritten signature (minimum duration,
              supervisor requirements, alignment with SE, summer school restriction, etc.).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-start gap-2">
            <Checkbox id="summer-terms" checked={accepted} onCheckedChange={(v) => setAccepted(Boolean(v))} />
            <Label htmlFor="summer-terms" className="text-sm leading-relaxed cursor-pointer font-normal">
              I accept the terms electronically in place of a signature or stamp.
            </Label>
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={submitting} onClick={submit}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit to advisor"}
          </Button>
        </div>
      )}
    </div>
  );
}
