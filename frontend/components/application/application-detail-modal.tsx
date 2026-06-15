"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Application, Company } from "@/types";
import { StatusBadge } from "@/components/common/status-badge";
import { format } from "date-fns";
import { FileText, Download, Calendar, Building2, Loader2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  downloadSummerAcceptanceLetterBlank,
  downloadSummerAcceptanceLetterWord,
  openProtectedFile,
  patchCoordinatorAcceptanceLetterVerification,
  reviewCompanyApplication,
  reviewCoordinatorApplication,
  completeSupervisorEvaluation,
  verifyLogbook,
  returnLogbook,
} from "@/lib/api";
import { useToastContext } from "@/components/providers/toast-provider";
import { PROGRAM_OUTCOME_LABELS } from "@/lib/program-outcomes";
import { cn } from "@/lib/utils";

const PROGRAM_OUTCOME_SCORE_OPTIONS = [null, 0, 1, 2, 3, 4] as const;

function emptyProgramOutcomeScores(): (number | null)[] {
  return Array.from({ length: 11 }, () => null);
}

function programOutcomeScoresFromApplication(a: Application): (number | null)[] {
  const s = a.supervisorProgramOutcomeScores;
  if (!s || s.length !== 11) return emptyProgramOutcomeScores();
  return s.map((x: number | null): number | null =>
    typeof x === "number" && x >= 0 && x <= 4 ? x : null,
  );
}

function placementEligibleForAcceptanceLetter(status: Application["status"]): boolean {
  return status === "approved" || status === "ongoing" || status === "completed";
}
function ProgramOutcomeScoreRow({
  index,
  label,
  value,
  onChange,
}: {
  index: number;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="border-b border-border py-3 space-y-2 last:border-b-0">
      <p className="text-xs leading-snug text-muted-foreground" title={label}>
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs font-medium shrink-0">Score (0–4):</span>
        {PROGRAM_OUTCOME_SCORE_OPTIONS.map((opt) => (
          <label key={String(opt)} className="flex items-center gap-1 text-xs cursor-pointer">
            <input
              type="radio"
              name={`program-outcome-${index}`}
              checked={opt === null ? value === null : value === opt}
              onChange={() => onChange(opt)}
            />
            {opt === null ? "—" : String(opt)}
          </label>
        ))}
      </div>
    </div>
  );
}

interface ApplicationDetailModalProps {
  application: Application | null;
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  /** Stajyer iş ünvanı / süpervizör ünvanı düzenlemesi (yetkili kullanıcı için) */
  placementEditorRole?: "company" | "coordinator";
  onPlacementSaved?: (application: Application) => void;
  /** Öğrenci: onaylı yerleşim için summer acceptance letter Word indirme (portal yükleme yok) */
  acceptanceLetterStudentDownloads?: boolean;
  /** Öğrenci: acceptance Word (boş/dolu) için SWEN application letter tam onayı — dashboard özetinden */
  summerApplicationLetterApproved?: boolean | null;
  /** Öğrenci yükleme veya koordinatör doğrulama sonrası liste güncelleme */
  onAcceptanceLetterApplicationUpdated?: (application: Application) => void;
  /** Koordinatör: acceptance letter doğrulama (applications.review) */
  coordinatorAcceptanceVerification?: boolean;
  /** Öğrenci görünümü: süpervizör ve onay adımları için süreç özeti */
  placementProgressHints?: boolean;
}

export function ApplicationDetailModal({
  application,
  company,
  isOpen,
  onClose,
  placementEditorRole,
  onPlacementSaved,
  acceptanceLetterStudentDownloads,
  onAcceptanceLetterApplicationUpdated,
  coordinatorAcceptanceVerification,
  placementProgressHints,
  summerApplicationLetterApproved,
}: ApplicationDetailModalProps) {
  const { showToast } = useToastContext();
  const [traineeJobTitle, setTraineeJobTitle] = useState("");
  const [supervisorTitle, setSupervisorTitle] = useState("");
  const [traineeDepartmentOrDivision, setTraineeDepartmentOrDivision] = useState("");
  const [supervisorDepartmentOrDivision, setSupervisorDepartmentOrDivision] = useState("");
  const [supervisorSpecialty, setSupervisorSpecialty] = useState("");
  const [supervisorAcademicDegrees, setSupervisorAcademicDegrees] = useState("");
  const [supervisorGraduatedUniversity, setSupervisorGraduatedUniversity] = useState("");
  const [supervisorGraduationYear, setSupervisorGraduationYear] = useState("");
  const [supervisorYearsInCompany, setSupervisorYearsInCompany] = useState("");
  const [supervisorYearsExperience, setSupervisorYearsExperience] = useState("");
  const [internshipStart, setInternshipStart] = useState("");
  const [internshipEnd, setInternshipEnd] = useState("");
  const [poScores, setPoScores] = useState<(number | null)[]>(emptyProgramOutcomeScores);
  const [supervisorOverallPerf, setSupervisorOverallPerf] = useState("");
  const [supervisorSuggestionsCiu, setSupervisorSuggestionsCiu] = useState("");
  const [savingPlacement, setSavingPlacement] = useState(false);
  const [savingPlacementLifecycle, setSavingPlacementLifecycle] = useState(false);
  const [acceptanceVerifyComments, setAcceptanceVerifyComments] = useState("");
  const [savingAcceptanceVerification, setSavingAcceptanceVerification] = useState(false);
  const [downloadingAcceptBlank, setDownloadingAcceptBlank] = useState(false);
  const [downloadingAcceptFilled, setDownloadingAcceptFilled] = useState(false);
  const [downloadingAcceptCoordinatorFilled, setDownloadingAcceptCoordinatorFilled] = useState(false);
  const [completingEvaluation, setCompletingEvaluation] = useState(false);
  const [verifyingLogbook, setVerifyingLogbook] = useState(false);
  const [returningLogbook, setReturningLogbook] = useState(false);

  useEffect(() => {
    if (!application) return;
    const a = application;
    queueMicrotask(() => {
      setTraineeJobTitle(a.traineeJobTitle ?? "");
      setSupervisorTitle(a.supervisorTitle ?? "");
      setTraineeDepartmentOrDivision(a.traineeDepartmentOrDivision ?? "");
      setSupervisorDepartmentOrDivision(a.supervisorDepartmentOrDivision ?? "");
      setSupervisorSpecialty(a.supervisorSpecialty ?? "");
      setSupervisorAcademicDegrees(a.supervisorAcademicDegrees ?? "");
      setSupervisorGraduatedUniversity(a.supervisorGraduatedUniversity ?? "");
      setSupervisorGraduationYear(a.supervisorGraduationYear ?? "");
      setSupervisorYearsInCompany(a.supervisorYearsInCompany ?? "");
      setSupervisorYearsExperience(a.supervisorYearsExperience ?? "");
      setInternshipStart(
        a.internshipStartDate ? format(a.internshipStartDate, "yyyy-MM-dd") : ""
      );
      setInternshipEnd(a.internshipEndDate ? format(a.internshipEndDate, "yyyy-MM-dd") : "");
      setPoScores(programOutcomeScoresFromApplication(a));
      setSupervisorOverallPerf(a.supervisorOverallPerformanceObservations ?? "");
      setSupervisorSuggestionsCiu(a.supervisorSuggestionsToUniversityAboutTrainee ?? "");
      setAcceptanceVerifyComments(a.acceptanceLetterCoordinatorComments ?? "");
    });
  }, [application]);

  if (!application) return null;

  const displayCompany = application.company || company;

  const placementReadyForAcceptanceDownloads = placementEligibleForAcceptanceLetter(application.status);

  const studentAcceptanceWordAllowed =
    placementReadyForAcceptanceDownloads && summerApplicationLetterApproved === true;

  const showStudentAcceptanceSection =
    !!acceptanceLetterStudentDownloads &&
    (placementReadyForAcceptanceDownloads || application.status === "pending");
  const showCoordinatorAcceptanceSection =
    !!coordinatorAcceptanceVerification &&
    placementEligibleForAcceptanceLetter(application.status);

  const programOutcomeEvaluationUnlocked = !!application.logbookSubmittedToSupervisorAt;

  const handleOpenFile = async (url: string | undefined, label: string) => {
    if (!url) return;
    const result = await openProtectedFile(url);
    if (!result.success) {
      showToast(result.message || `Could not open ${label}.`, "error");
    }
  };

  const handleSavePlacement = async () => {
    if (!application || !placementEditorRole) return;
    const t = traineeJobTitle.trim();
    const s = supervisorTitle.trim();
    const td = traineeDepartmentOrDivision.trim();
    const sd = supervisorDepartmentOrDivision.trim();
    const spec = supervisorSpecialty.trim();
    const deg = supervisorAcademicDegrees.trim();
    const uni = supervisorGraduatedUniversity.trim();
    const gradYear = supervisorGraduationYear.trim();
    const yComp = supervisorYearsInCompany.trim();
    const yExp = supervisorYearsExperience.trim();
    const startIso = internshipStart.trim();
    const endIso = internshipEnd.trim();
    const maxNarrative = 8000;
    if (programOutcomeEvaluationUnlocked && placementEditorRole === "company") {
      if (
        supervisorOverallPerf.length > maxNarrative ||
        supervisorSuggestionsCiu.length > maxNarrative
      ) {
        showToast(
          `Supervisor narratives must be at most ${maxNarrative} characters each.`,
          "error"
        );
        return;
      }
    }
    const placementBody = {
      traineeJobTitle: t,
      supervisorTitle: s,
      traineeDepartmentOrDivision: td,
      supervisorDepartmentOrDivision: sd,
      supervisorSpecialty: spec,
      supervisorAcademicDegrees: deg,
      supervisorGraduatedUniversity: uni,
      supervisorGraduationYear: gradYear,
      supervisorYearsInCompany: yComp,
      supervisorYearsExperience: yExp,
      ...(programOutcomeEvaluationUnlocked && placementEditorRole === "company"
        ? {
            supervisorProgramOutcomeScores: poScores,
            supervisorOverallPerformanceObservations: supervisorOverallPerf.trim(),
            supervisorSuggestionsToUniversityAboutTrainee:
              supervisorSuggestionsCiu.trim(),
          }
        : {}),
      patchInternshipDates: true,
      internshipStartDate: startIso || null,
      internshipEndDate: endIso || null,
    };
    setSavingPlacement(true);
    try {
      if (placementEditorRole === "company") {
        const result = await reviewCompanyApplication(application.id, placementBody);
        setSavingPlacement(false);
        if (!result.success) {
          showToast(result.message, "error");
          return;
        }
        onPlacementSaved?.(result.application);
        showToast("Placement details saved.", "success");
        return;
      }

      const result = await reviewCoordinatorApplication(application.id, placementBody);
      setSavingPlacement(false);
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      onPlacementSaved?.(result.application);
      showToast("Placement details saved.", "success");
    } catch {
      setSavingPlacement(false);
      showToast("Could not save placement details.", "error");
    }
  };

  const handleCompleteEvaluation = async () => {
    if (!application) return;
    setCompletingEvaluation(true);
    try {
      // First, ensure any changes made to PO scores or observations are saved
      await handleSavePlacement();
      
      const result = await completeSupervisorEvaluation(application.id);
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Evaluation completed and sent back to student.", "success");
      onPlacementSaved?.({ ...application, supervisorEvaluationCompletedAt: result.completedAt });
    } finally {
      setCompletingEvaluation(false);
    }
  };

  const handleVerifyLogbook = async () => {
    if (!application) return;
    setVerifyingLogbook(true);
    try {
      const result = await verifyLogbook(application.id);
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Logbook verified successfully.", "success");
      onPlacementSaved?.({ ...application, logbookVerifiedByCoordinatorAt: result.verifiedAt, status: "completed" });
    } finally {
      setVerifyingLogbook(false);
    }
  };

  const handleReturnLogbook = async () => {
    if (!application || !window.confirm("Are you sure you want to return this logbook to the student for revision? This will unlock the logbook entries for the student to edit.")) return;
    setReturningLogbook(true);
    try {
      const result = await returnLogbook(application.id);
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Logbook returned to student for revision.", "success");
      // Update local state to reflect that it's no longer submitted
      const updatedApp = { ...application };
      if (placementEditorRole === "company") {
        updatedApp.logbookSubmittedToSupervisorAt = undefined;
        updatedApp.supervisorEvaluationCompletedAt = undefined;
      } else {
        updatedApp.logbookSubmittedForCoordinatorReviewAt = undefined;
      }
      onPlacementSaved?.(updatedApp);
    } catch {
      showToast("An error occurred while returning the logbook.", "error");
    } finally {
      setReturningLogbook(false);
    }
  };



  const handleCompanyPlacementLifecycle = async (next: "ongoing" | "completed") => {
    if (!application || placementEditorRole !== "company") return;
    if (
      next === "completed" &&
      !window.confirm(
        "Mark this internship as completed? The student’s portal (e.g. training report) may depend on this status."
      )
    ) {
      return;
    }
    setSavingPlacementLifecycle(true);
    try {
      const result = await reviewCompanyApplication(application.id, { status: next });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      onPlacementSaved?.(result.application);
      showToast(
        next === "ongoing" ? "Internship marked as ongoing (started)." : "Internship marked as completed.",
        "success"
      );
    } finally {
      setSavingPlacementLifecycle(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 border-b pb-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Student</p>
              <p className="font-semibold text-sm">{application.student?.name || "N/A"}</p>
              <p className="text-xs text-muted-foreground">ID: {application.student?.studentId || "N/A"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Company</p>
              <p className="font-semibold text-sm">{displayCompany?.name || "N/A"}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{displayCompany?.location}</p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status & Eligibility</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <StatusBadge
                  status={application.status}
                  coordinatorPlacementApproved={application.coordinatorPlacementApprovedAt != null}
                  companyPlacementApproved={application.companyPlacementApprovedAt != null}
                />
                <StatusBadge
                  status={application.student?.eligibilityStatus || "not_eligible"}
                  type="eligibility"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> Application Documents
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {application.documents.cv && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">CV</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-primary"
                    onClick={() => handleOpenFile(application.documents.cv, "CV")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </div>
              )}
              {application.documents.motivationLetter && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">Motivation Letter</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-primary"
                    onClick={() =>
                      handleOpenFile(application.documents.motivationLetter, "Motivation Letter")
                    }
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </div>
              )}
              {application.documents.transcript && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">Transcript</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-primary"
                    onClick={() => handleOpenFile(application.documents.transcript, "Transcript")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </div>
              )}
            </div>
          </div>

          {placementProgressHints && placementEditorRole !== "coordinator" && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <h3 className="font-semibold text-sm">Your placement checklist</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span>Application submitted to {displayCompany?.name ?? "the company"}.</span>
                </li>
                <li className="flex gap-2">
                  {application.coordinatorPlacementApprovedAt ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  )}
                  <span>
                    University coordinator placement approval —{" "}
                    {application.coordinatorPlacementApprovedAt ? (
                      <strong className="font-medium">Approved</strong>
                    ) : (
                      <span className="text-muted-foreground">waiting for coordinator</span>
                    )}
                    .
                  </span>
                </li>
                <li className="flex gap-2">
                  {application.companyPlacementApprovedAt ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  )}
                  <span>
                    Company acceptance —{" "}
                    {application.companyPlacementApprovedAt ? (
                      <strong className="font-medium">Accepted</strong>
                    ) : (
                      <span className="text-muted-foreground">waiting for company</span>
                    )}
                    . Overall placement status:{" "}
                    <strong className="font-medium capitalize">{application.status.replace("_", " ")}</strong>.
                  </span>
                </li>
                <li className="flex gap-2">
                  {application.companySupervisorUserId ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  )}
                  <span>
                    Company supervisor (staff):{" "}
                    {application.companySupervisorUserId ? (
                      <strong>{application.companySupervisorName ?? "Assigned"}</strong>
                    ) : (
                      <span className="text-muted-foreground">
                        not assigned yet — company primary account picks a staff user.
                      </span>
                    )}
                  </span>
                </li>
                <li className="flex gap-2">
                  {application.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  )}
                  <span>
                    Internship lifecycle on company portal —{" "}
                    {application.status === "completed" ? (
                      <strong className="font-medium">Completed</strong>
                    ) : application.status === "ongoing" ? (
                      <>
                        <strong className="font-medium">Ongoing</strong>{" "}
                        <span className="text-muted-foreground">
                          (company marks <strong>completed</strong> when the internship ends).
                        </span>
                      </>
                    ) : application.status === "approved" ? (
                      <span className="text-muted-foreground">
                        company marks <strong>ongoing</strong> when you start, then <strong>completed</strong> when
                        you finish (Applications → your company).
                      </span>
                    ) : (
                      <span className="text-muted-foreground">after placement is approved.</span>
                    )}
                  </span>
                </li>
              </ul>
            </div>
          )}

          {placementEditorRole && (
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold text-sm">Logbook / placement (Word export)</h3>
              <p className="text-xs text-muted-foreground">
                Dates, trainee title, and supervisor details feed the student logbook Word file — including the company
                approval paragraph and supervisor block. Supervisor full name comes from the assigned staff account.
                Dates use yyyy-MM-dd; leave empty to clear.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="placement-start">Internship start</Label>
                  <Input
                    id="placement-start"
                    type="date"
                    value={internshipStart}
                    onChange={(e) => setInternshipStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="placement-end">Internship end</Label>
                  <Input
                    id="placement-end"
                    type="date"
                    value={internshipEnd}
                    onChange={(e) => setInternshipEnd(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="placement-trainee-title">Trainee job title</Label>
                  <Input
                    id="placement-trainee-title"
                    value={traineeJobTitle}
                    onChange={(e) => setTraineeJobTitle(e.target.value)}
                    placeholder="e.g. Software intern"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="placement-supervisor-title">Supervisor title</Label>
                  <Input
                    id="placement-supervisor-title"
                    value={supervisorTitle}
                    onChange={(e) => setSupervisorTitle(e.target.value)}
                    placeholder="e.g. Engineering Manager"
                  />
                </div>
                
                {placementEditorRole !== "coordinator" && (
                  <>
                    <div className="space-y-2 md:col-span-2 border-t pt-3 mt-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Company approval page — HR paragraph and supervisor profile (optional)
                      </p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="placement-trainee-dept">Trainee department / division (at company)</Label>
                      <Input
                        id="placement-trainee-dept"
                        value={traineeDepartmentOrDivision}
                        onChange={(e) => setTraineeDepartmentOrDivision(e.target.value)}
                        placeholder="e.g. Software Engineering"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="placement-supervisor-dept">Supervisor department / division</Label>
                      <Input
                        id="placement-supervisor-dept"
                        value={supervisorDepartmentOrDivision}
                        onChange={(e) => setSupervisorDepartmentOrDivision(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="placement-supervisor-specialty">Specialty</Label>
                      <Input
                        id="placement-supervisor-specialty"
                        value={supervisorSpecialty}
                        onChange={(e) => setSupervisorSpecialty(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="placement-supervisor-degrees">Academic degree(s)</Label>
                      <Input
                        id="placement-supervisor-degrees"
                        value={supervisorAcademicDegrees}
                        onChange={(e) => setSupervisorAcademicDegrees(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="placement-supervisor-uni">Graduated university</Label>
                      <Input
                        id="placement-supervisor-uni"
                        value={supervisorGraduatedUniversity}
                        onChange={(e) => setSupervisorGraduatedUniversity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="placement-supervisor-grad-year">Graduation year</Label>
                      <Input
                        id="placement-supervisor-grad-year"
                        value={supervisorGraduationYear}
                        onChange={(e) => setSupervisorGraduationYear(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="placement-supervisor-years-co">Years in company</Label>
                      <Input
                        id="placement-supervisor-years-co"
                        value={supervisorYearsInCompany}
                        onChange={(e) => setSupervisorYearsInCompany(e.target.value)}
                        placeholder="e.g. 8 years"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="placement-supervisor-years-exp">Years of experience</Label>
                      <Input
                        id="placement-supervisor-years-exp"
                        value={supervisorYearsExperience}
                        onChange={(e) => setSupervisorYearsExperience(e.target.value)}
                        placeholder="e.g. 15 years"
                      />
                    </div>
                  </>
                )}
                
                {placementEditorRole === "company" && (
                  <>
                {placementEditorRole === "company" && (
                  <div className="space-y-4 border-t pt-4 mt-2">
                    <p className="text-xs font-medium text-muted-foreground">Evaluation status</p>
                    {!programOutcomeEvaluationUnlocked ? (
                      <div className="rounded-md border border-dashed p-3 bg-muted/20 text-[11px] text-muted-foreground italic">
                        The evaluation portal will unlock once the student completes and submits their logbook for final evaluation.
                      </div>
                    ) : application.supervisorEvaluationCompletedAt ? (
                      <div className="rounded-md border border-green-100 p-3 bg-green-50 text-[11px] text-green-700 font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Student evaluation has been completed and finalized.
                      </div>
                    ) : (
                      <div className="rounded-md border border-amber-100 p-3 bg-amber-50 text-[11px] text-amber-700 font-medium flex flex-col gap-2">
                        <span>The logbook has been submitted. Please use the "Evaluate" button in the interns list to complete the rating.</span>
                      </div>
                    )}
                  </div>
                )}
                  </>
                )}
              </div>
              {placementEditorRole === "company" &&
                (application.status === "approved" ||
                  application.status === "ongoing" ||
                  application.status === "completed") && (
                  <div className="rounded-md border border-dashed bg-muted/20 px-3 py-3 space-y-2">
                    <p className="text-xs font-medium text-foreground">Internship started / finished</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Updates the application status for the student dashboard, training report gate, and exports.
                      Mark <strong>ongoing</strong> when the trainee begins; mark <strong>completed</strong> when the
                      internship ends.
                    </p>
                    {application.status === "completed" ? (
                      <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                        This placement is already marked completed.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {application.status === "approved" && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={savingPlacementLifecycle || savingPlacement}
                              onClick={() => void handleCompanyPlacementLifecycle("ongoing")}
                            >
                              {savingPlacementLifecycle ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              Mark internship ongoing
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={savingPlacementLifecycle || savingPlacement}
                              onClick={() => void handleCompanyPlacementLifecycle("completed")}
                            >
                              Mark completed (skip ongoing)
                            </Button>
                          </>
                        )}
                        {application.status === "ongoing" && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={savingPlacementLifecycle || savingPlacement}
                            onClick={() => void handleCompanyPlacementLifecycle("completed")}
                          >
                            {savingPlacementLifecycle ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Mark internship completed
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSavePlacement}
                  disabled={savingPlacement}
                >
                  {savingPlacement ? "Saving…" : "Save placement fields"}
                </Button>
                {placementEditorRole === "company" &&
                 programOutcomeEvaluationUnlocked &&
                 !application.supervisorEvaluationCompletedAt && (
                   <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleReturnLogbook}
                      disabled={returningLogbook || savingPlacement}
                      className="text-amber-600 border-amber-200 hover:bg-amber-50"
                    >
                      {returningLogbook ? "Returning…" : "Return for Revision"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      onClick={handleCompleteEvaluation}
                      disabled={completingEvaluation || savingPlacement}
                      title="After filling all scores and observations, click here to finalize your evaluation and send it to the student."
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {completingEvaluation ? "Completing…" : "Complete Evaluation"}
                    </Button>
                   </div>
                )}
                {placementEditorRole === "company" && application.supervisorEvaluationCompletedAt && (
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Evaluation completed on {format(application.supervisorEvaluationCompletedAt, "MMM d, yyyy HH:mm")} UTC.
                  </p>
                )}
                {placementEditorRole === "coordinator" &&
                 application.logbookSubmittedForCoordinatorReviewAt &&
                 !application.logbookVerifiedByCoordinatorAt && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleReturnLogbook}
                        disabled={returningLogbook || savingPlacement}
                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                      >
                        {returningLogbook ? "Returning…" : "Return for Revision"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={handleVerifyLogbook}
                        disabled={verifyingLogbook || savingPlacement}
                        title="Approve the student's final logbook."
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {verifyingLogbook ? "Verifying…" : "Verify Logbook"}
                      </Button>
                    </div>
                )}
                {placementEditorRole === "coordinator" && application.logbookVerifiedByCoordinatorAt && (
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Logbook verified on {format(application.logbookVerifiedByCoordinatorAt, "MMM d, yyyy HH:mm")} UTC.
                  </p>
                )}
              </div>
            </div>
          )}

          {(showStudentAcceptanceSection || showCoordinatorAcceptanceSection) && (
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold text-sm">Summer acceptance letter</h3>

                {placementEditorRole === "company" && showStudentAcceptanceSection && (
                  <div className="space-y-3">
                    {!studentAcceptanceWordAllowed && application.status === "pending" && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950 px-3 py-2 text-xs text-amber-900 dark:text-amber-100 space-y-1">
                        <p className="font-medium">Acceptance letter Word not available yet</p>
                        <p className="leading-snug opacity-95">
                          Blank and prefilled acceptance letter downloads unlock when placement is approved, ongoing, or
                          completed <strong>and</strong> your Application letter is fully approved (advisor + internship
                          coordinator).
                        </p>
                      </div>
                    )}
                    {!studentAcceptanceWordAllowed &&
                      placementReadyForAcceptanceDownloads &&
                      summerApplicationLetterApproved !== true && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950 px-3 py-2 text-xs text-amber-900 dark:text-amber-100 space-y-1">
                          <p className="font-medium">Application letter approval required</p>
                          <p className="leading-snug opacity-95">
                            Acceptance letter Word unlocks after your Application letter is approved. Use{" "}
                            <strong>Application letter</strong> in the sidebar to complete advisor and coordinator approval.
                          </p>
                        </div>
                      )}
                    <p className="text-xs text-muted-foreground">
                      Enter your trainee duties paragraph on{" "}
                      <Link
                        href="/student/acceptance-letter"
                        className="font-medium underline underline-offset-2 text-foreground"
                      >
                        Acceptance letter
                      </Link>{" "}
                      (merged into Word as your duties text). Company and profile fields come from placement — Word is
                      only for downloading the prefilled file (signatures offline). The internship coordinator records
                      verification here; you cannot use the daily logbook until then.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={downloadingAcceptBlank || !studentAcceptanceWordAllowed}
                        title={
                          !studentAcceptanceWordAllowed
                            ? "Requires approved placement and approved Application letter."
                            : undefined
                        }
                        onClick={async () => {
                          setDownloadingAcceptBlank(true);
                          try {
                            const r = await downloadSummerAcceptanceLetterBlank();
                            if (!r.success) {
                              showToast(r.message, "error");
                              return;
                            }
                            showToast("Blank template downloaded.", "success");
                          } finally {
                            setDownloadingAcceptBlank(false);
                          }
                        }}
                      >
                        {downloadingAcceptBlank ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Blank Word template
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={downloadingAcceptFilled || !studentAcceptanceWordAllowed}
                        title={
                          !studentAcceptanceWordAllowed
                            ? "Requires approved placement and approved Application letter."
                            : undefined
                        }
                        onClick={async () => {
                          setDownloadingAcceptFilled(true);
                          try {
                            const r = await downloadSummerAcceptanceLetterWord();
                            if (!r.success) {
                              showToast(r.message, "error");
                              return;
                            }
                            showToast("Prefilled acceptance letter downloaded.", "success");
                          } finally {
                            setDownloadingAcceptFilled(false);
                          }
                        }}
                      >
                        {downloadingAcceptFilled ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Prefilled with my placement
                      </Button>
                    </div>
                    {placementReadyForAcceptanceDownloads &&
                      (application.acceptanceLetterVerifiedAt ? (
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Verified by the coordinator on{" "}
                        {format(application.acceptanceLetterVerifiedAt, "MMM d, yyyy HH:mm")} UTC. You can use the
                        logbook.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {application.acceptanceLetterPortalSaved
                          ? "Your trainee duties paragraph is saved on the portal. After your department confirms the signed document, the coordinator can verify here so your daily logbook unlocks."
                          : "Save your trainee duties paragraph under Acceptance letter (portal), download prefilled Word, then follow university procedures for signatures and coordinator verification."}
                      </p>
                    ))}
                    {!placementReadyForAcceptanceDownloads && application.status === "pending" && (
                      <p className="text-sm text-muted-foreground">
                        Coordinator verification (and daily logbook) come after placement leaves pending.
                      </p>
                    )}
                    {application.acceptanceLetterUrl && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          A portal file is still linked from an earlier process (read-only).
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleOpenFile(application.acceptanceLetterUrl, "Acceptance letter")
                          }
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Open linked file
                        </Button>
                      </div>
                    )}
                  </div>
                )}

              {showCoordinatorAcceptanceSection && (
                  <div
                    className={cn(
                      "space-y-3",
                      showStudentAcceptanceSection && "border-t pt-3 mt-2"
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground">Coordinator verification</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={downloadingAcceptCoordinatorFilled}
                        onClick={async () => {
                          setDownloadingAcceptCoordinatorFilled(true);
                          try {
                            const r = await downloadSummerAcceptanceLetterWord(application.studentId);
                            if (!r.success) {
                              showToast(r.message, "error");
                              return;
                            }
                            showToast("Prefilled acceptance letter downloaded.", "success");
                          } finally {
                            setDownloadingAcceptCoordinatorFilled(false);
                          }
                        }}
                      >
                        {downloadingAcceptCoordinatorFilled ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Prefilled Word (this placement)
                      </Button>
                    </div>
                    {application.acceptanceLetterUrl ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleOpenFile(application.acceptanceLetterUrl, "Acceptance letter")
                          }
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Open linked portal file
                        </Button>
                      </div>
                    ) : application.acceptanceLetterPortalSaved ? (
                      <p className="text-sm text-muted-foreground">
                        Student saved acceptance letter fields on the portal — prefilled Word uses those values.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No portal file on record — ask the student to save the acceptance letter form or follow legacy
                        procedures.
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground space-y-1">
                      {application.acceptanceLetterSubmittedAt && (
                        <div>
                          Previous portal submission (legacy):{" "}
                          {format(application.acceptanceLetterSubmittedAt, "MMM d, yyyy HH:mm")} UTC
                        </div>
                      )}
                      {application.acceptanceLetterVerifiedAt ? (
                        <div className="text-green-700 dark:text-green-400">
                          Verified:{" "}
                          {format(application.acceptanceLetterVerifiedAt, "MMM d, yyyy HH:mm")} UTC
                        </div>
                      ) : (
                        <div>Not verified yet — student cannot use the daily logbook.</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="acceptance-coordinator-note">Note to student (optional)</Label>
                      <Textarea
                        id="acceptance-coordinator-note"
                        className="min-h-[72px]"
                        value={acceptanceVerifyComments}
                        onChange={(e) => setAcceptanceVerifyComments(e.target.value)}
                        placeholder="Optional comments shown to the student when clearing verification."
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingAcceptanceVerification || !!application.acceptanceLetterVerifiedAt}
                        onClick={async () => {
                          if (!application) return;
                          setSavingAcceptanceVerification(true);
                          try {
                            const result = await patchCoordinatorAcceptanceLetterVerification(
                              application.id,
                              {
                                verified: true,
                                coordinatorComments: acceptanceVerifyComments.trim() || undefined,
                              }
                            );
                            if (!result.success) {
                              showToast(result.message, "error");
                              return;
                            }
                            onAcceptanceLetterApplicationUpdated?.(result.application);
                            showToast("Acceptance letter verified.", "success");
                          } finally {
                            setSavingAcceptanceVerification(false);
                          }
                        }}
                      >
                        {savingAcceptanceVerification ? "Saving…" : "Verify acceptance letter"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          savingAcceptanceVerification || !application.acceptanceLetterVerifiedAt
                        }
                        onClick={async () => {
                          if (!application) return;
                          setSavingAcceptanceVerification(true);
                          try {
                            const result = await patchCoordinatorAcceptanceLetterVerification(
                              application.id,
                              {
                                verified: false,
                                coordinatorComments: acceptanceVerifyComments.trim() || undefined,
                              }
                            );
                            if (!result.success) {
                              showToast(result.message, "error");
                              return;
                            }
                            onAcceptanceLetterApplicationUpdated?.(result.application);
                            showToast("Verification cleared.", "success");
                          } finally {
                            setSavingAcceptanceVerification(false);
                          }
                        }}
                      >
                        Clear verification
                      </Button>
                    </div>
                  </div>
                )}
            </div>
          )}


          {application.coordinatorComments && (
            <div className="space-y-2">
              <h3 className="font-semibold">Coordinator Comments</h3>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">{application.coordinatorComments}</p>
              </div>
            </div>
          )}

          {application.companyComments && (
            <div className="space-y-2">
              <h3 className="font-semibold">Company Comments</h3>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">{application.companyComments}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
