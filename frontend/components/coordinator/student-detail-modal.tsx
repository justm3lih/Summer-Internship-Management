"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CoordinatorStudentMonitoring,
  type LogbookEntry,
  type LogbookWeeklyApproval,
} from "@/types";
import { format } from "date-fns";
import {
  getCoordinatorLogbookForStudent,
  getWeeklyApprovalsForStudent,
  buildFileUrl,
  downloadSummerApplicationLetterBlank,
  downloadSummerApplicationLetterWord,
  downloadLogbookWordExport,
  updateProfile,
  getCoordinatorAdvisorDirectory,
} from "@/lib/api";
import { useToastContext } from "@/components/providers/toast-provider";
import { FileDown, FileText, Loader2 } from "lucide-react";
import Link from "next/link";

interface StudentDetailModalProps {
  student: CoordinatorStudentMonitoring;
  /** Ayarlardaki bölüm listesi; öğrencinin mevcut bölümü yoksa birleştirilir */
  departmentOptions: string[];
  isOpen: boolean;
  onClose: () => void;
  onDepartmentUpdated?: () => void;
  onAdvisorUpdated?: () => void;
}

export function StudentDetailModal({
  student,
  departmentOptions,
  isOpen,
  onClose,
  onDepartmentUpdated,
  onAdvisorUpdated,
}: StudentDetailModalProps) {
  const { showToast } = useToastContext();
  const [department, setDepartment] = useState(() => student.department || "");
  const [saving, setSaving] = useState(false);
  /** undefined = henüz yüklenmedi (modal yeni açıldı / öğrenci değişti) */
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[] | undefined>(undefined);
  const [weeklyApprovals, setWeeklyApprovals] = useState<
    LogbookWeeklyApproval[] | undefined
  >(undefined);
  const [wordExporting, setWordExporting] = useState(false);
  const [summerLetterBlankExporting, setSummerLetterBlankExporting] = useState(false);
  const [summerLetterFilledExporting, setSummerLetterFilledExporting] = useState(false);

  const [advisorPickList, setAdvisorPickList] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [advisorUserId, setAdvisorUserId] = useState(() => student.advisorUserId ?? "_none");
  const [advisorSaving, setAdvisorSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    // Sıfırla: önceki öğrencinin satırları yeni yükleme bitene kadar görünmesin
    queueMicrotask(() => {
      if (!active) return;
      setLogbookEntries(undefined);
      setWeeklyApprovals(undefined);
    });
    Promise.all([
      getCoordinatorLogbookForStudent(student.id),
      getWeeklyApprovalsForStudent(student.id),
    ]).then(([entries, weeks]) => {
      if (!active) return;
      setLogbookEntries(entries);
      setWeeklyApprovals(weeks);
    });
    return () => {
      active = false;
    };
  }, [isOpen, student.id]);

  useEffect(() => {
    queueMicrotask(() => setDepartment(student.department || ""));
  }, [student.id, student.department]);

  useEffect(() => {
    queueMicrotask(() => setAdvisorUserId(student.advisorUserId ?? "_none"));
  }, [student.id, student.advisorUserId]);

  useEffect(() => {
    if (!isOpen) return;
    void getCoordinatorAdvisorDirectory().then(setAdvisorPickList);
  }, [isOpen]);

  const departmentSelectOptions = useMemo(() => {
    const d = student.department?.trim();
    if (!d) return [...departmentOptions];
    const inList = departmentOptions.some(
      (x) => x.toLowerCase() === d.toLowerCase()
    );
    if (!inList) return [d, ...departmentOptions];
    return [...departmentOptions];
  }, [student.department, departmentOptions]);

  const latestApplication = student.latestApplication;
  const reportBadgeStatus =
    student.reportStatus === "approved"
      ? "approved"
      : student.reportStatus === "rejected"
        ? "rejected"
        : student.reportStatus === "pending"
          ? "pending"
          : "not_applied";

  const saveDepartment = async () => {
    if (!department.trim()) {
      showToast("Select a department", "error");
      return;
    }
    if (department === (student.department || "")) {
      showToast("No change to save", "info");
      return;
    }
    setSaving(true);
    const res = await updateProfile(student.id, { department: department.trim() });
    setSaving(false);
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    showToast("Department updated", "success");
    onDepartmentUpdated?.();
  };

  const saveAdvisor = async () => {
    const outgoing = advisorUserId === "_none" ? "" : advisorUserId;
    const prev = student.advisorUserId ?? "";
    if (outgoing === prev) {
      showToast("No advisor change", "info");
      return;
    }
    setAdvisorSaving(true);
    const res = await updateProfile(student.id, { advisorUserId: outgoing });
    setAdvisorSaving(false);
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    showToast("Advisor updated", "success");
    onAdvisorUpdated?.();
  };

  const handleWordExport = async () => {
    setWordExporting(true);
    const r = await downloadLogbookWordExport(student.id);
    setWordExporting(false);
    if (!r.success) {
      showToast(r.message, "error");
      return;
    }
    showToast("Word file downloaded.", "success");
  };

  const handleSummerLetterBlankExport = async () => {
    setSummerLetterBlankExporting(true);
    const r = await downloadSummerApplicationLetterBlank();
    setSummerLetterBlankExporting(false);
    if (!r.success) {
      showToast(r.message, "error");
      return;
    }
    showToast("Application letter template downloaded.", "success");
  };

  const handleSummerLetterFilledExport = async () => {
    setSummerLetterFilledExporting(true);
    const r = await downloadSummerApplicationLetterWord(student.id);
    setSummerLetterFilledExporting(false);
    if (!r.success) {
      showToast(r.message, "error");
      return;
    }
    showToast("Application letter Word downloaded.", "success");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Details: {student.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm font-medium">{student.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Student ID</Label>
              <p className="text-sm font-medium">{student.studentId || "N/A"}</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Department</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="w-full sm:max-w-md">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentSelectOptions.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={saveDepartment} disabled={saving} className="shrink-0">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save department"}
                </Button>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Academic advisor (application letter)</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Select value={advisorUserId} onValueChange={setAdvisorUserId}>
                  <SelectTrigger className="w-full sm:max-w-lg">
                    <SelectValue placeholder="Select advisor user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Not assigned</SelectItem>
                    {advisorPickList.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={saveAdvisor} disabled={advisorSaving} className="shrink-0">
                  {advisorSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save advisor"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Student must have an advisor before submitting the SWEN application letter.
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Application letter status</Label>
              <p className="text-sm font-medium capitalize">
                {student.summerTrainingLetterStatus ?? "Not created / no record for current period"}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSummerLetterBlankExport}
                  disabled={summerLetterBlankExporting}
                >
                  {summerLetterBlankExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-1 h-4 w-4" />
                  )}
                  Application letter (blank template)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSummerLetterFilledExport}
                  disabled={
                    summerLetterFilledExporting ||
                    student.summerTrainingLetterStatus !== "approved"
                  }
                  title={
                    student.summerTrainingLetterStatus !== "approved"
                      ? "Filled Word is available only after advisor and internship coordinator approval."
                      : undefined
                  }
                >
                  {summerLetterFilledExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-1 h-4 w-4" />
                  )}
                  Application letter (filled)
                </Button>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Daily Logbook</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href={`/coordinator/logbooks/${student.id}`}>
                  <Button type="button" variant="outline" size="sm">
                    <FileText className="mr-1 h-4 w-4" />
                    View Daily Logbook
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleWordExport}
                  disabled={wordExporting}
                >
                  {wordExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-1 h-4 w-4" />
                  )}
                  Export Logbook to Word
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Current Semester</Label>
              <p className="text-sm font-medium">
                {student.currentSemester ? `Semester ${student.currentSemester}` : "N/A"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Eligibility Status</Label>
              <StatusBadge status={student.eligibilityStatus} type="eligibility" />
            </div>
            <div className="space-y-2">
              <Label>Internship Status</Label>
              <StatusBadge status={student.internshipStatus} />
            </div>
            <div className="space-y-2">
              <Label>Final Report</Label>
              <StatusBadge status={reportBadgeStatus} />
            </div>
          </div>


          {latestApplication && (
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold">Latest Application</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <p className="text-sm font-medium">{latestApplication.company?.name || "N/A"}</p>
                </div>
                <div className="space-y-2">
                  <Label>Date Applied</Label>
                  <p className="text-sm font-medium">
                    {format(latestApplication.appliedDate, "MMM dd, yyyy")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Application Status</Label>
                  <StatusBadge
                    status={latestApplication.status}
                    coordinatorPlacementApproved={
                      latestApplication.coordinatorPlacementApprovedAt != null
                    }
                    companyPlacementApproved={latestApplication.companyPlacementApprovedAt != null}
                  />
                </div>
              </div>

              {latestApplication.coordinatorComments && (
                <div className="space-y-2">
                  <Label>Coordinator Comment</Label>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm">{latestApplication.coordinatorComments}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
