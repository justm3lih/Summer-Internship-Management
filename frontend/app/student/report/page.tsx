"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/common/status-badge";
import { useToastContext } from "@/components/providers/toast-provider";
import {
  addTrainingReportFigure,
  deleteTrainingReportFigure,
  downloadTrainingReportWord,
  emptyTrainingReportContent,
  getMyTrainingReport,
  getStudentDashboardSummary,
  getTrainingReportEligibility,
  submitTrainingReport,
  updateTrainingReportContent,
  uploadFile,
} from "@/lib/api";
import { IEEEReferenceGenerator } from "@/components/student/iee-reference-generator";
import type {
  TrainingReportContentPayload,
  TrainingReportDetail,
  TrainingReportDynamicSection,
  TrainingReportEligibility,
} from "@/types";
import { Bold, CheckCircle2, FileDown, Italic, Loader2, MessageSquare, Plus, Save, Send, Trash2, Upload, XCircle, Clock, GraduationCap } from "lucide-react";
import { format } from "date-fns";

/** 
 * Auto-save Indicator:
 * Shows when the last save happened and if there are unsaved changes.
 */
function AutoSaveIndicator({ 
  saving, 
  lastSavedAt, 
  hasUnsavedChanges 
}: { 
  saving: boolean; 
  lastSavedAt: Date | null; 
  hasUnsavedChanges: boolean 
}) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-medium transition-all px-3 py-1 rounded-full bg-slate-50 border border-slate-200 shadow-sm">
      {saving ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-slate-500 italic">Auto-saving...</span>
        </>
      ) : hasUnsavedChanges ? (
        <>
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-slate-500">Unsaved changes</span>
        </>
      ) : lastSavedAt ? (
        <>
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          <span className="text-slate-400">
            Last saved: {format(lastSavedAt, "HH:mm:ss")}
          </span>
        </>
      ) : (
        <>
          <Clock className="h-3 w-3 text-slate-300" />
          <span className="text-slate-400 italic">Draft session active</span>
        </>
      )}
    </div>
  );
}


/** 
 * Zengin Metin Editörü (Rich Text Field):
 * Metni Bold/Italic yapabilen basit bir contenteditable wrapper.
 */
function RichField({
  label,
  value,
  onChange,
  disabled,
  minHeight = "100px",
  onIEEE,
  onFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  minHeight?: string;
  onIEEE?: () => void;
  onFocus?: (el: HTMLDivElement) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef(value);

  useEffect(() => {
    if (editorRef.current && value !== lastHtml.current) {
      editorRef.current.innerHTML = value;
      lastHtml.current = value;
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    lastHtml.current = html;
    onChange(html);
  };

  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
  };

  return (
    <div className="space-y-1.5 group">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold group-focus-within:text-primary transition-colors">
          {label}
        </Label>
        {!disabled && (
          <div className="flex gap-1 bg-slate-100 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => exec("bold")}
              className="p-1 hover:bg-white rounded transition-colors text-slate-600"
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => exec("italic")}
              className="p-1 hover:bg-white rounded transition-colors text-slate-600"
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-3 w-3" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // Keep focus in editor
                onIEEE?.();
              }}
              className="p-1 hover:bg-white rounded transition-colors text-primary font-bold flex items-center justify-center"
              title="Insert IEEE Citation"
            >
              <GraduationCap className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onFocus={() => {
          if (editorRef.current) onFocus?.(editorRef.current);
        }}
        className={`w-full text-sm leading-relaxed outline-none border-none bg-slate-50/50 focus:bg-white transition-all px-0 py-2 break-words overflow-hidden ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-text"
        }`}
        style={{ minHeight }}
      />
      <div className="h-px bg-slate-200 group-focus-within:bg-primary/50 transition-colors" />
    </div>
  );
}

function DynamicSectionList({
  title,
  list,
  onUpdate,
  onRemove,
  onAdd,
  editable,
  onIEEE,
  onFocus,
}: {
  title: string;
  list: TrainingReportDynamicSection[];
  onUpdate: (idx: number, patch: Partial<TrainingReportDynamicSection>) => void;
  onRemove: (idx: number) => void;
  onAdd: () => void;
  editable: boolean;
  onIEEE?: () => void;
  onFocus?: (el: HTMLDivElement) => void;
}) {
  return (
    <div className="pt-4 space-y-6">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
        {editable && (
          <Button type="button" size="sm" variant="outline" onClick={onAdd} className="h-6 text-[10px] px-2 py-0">
            <Plus className="mr-1 h-3 w-3" /> Add Subsection
          </Button>
        )}
      </div>
      {list.map((section, idx) => (
        <div key={idx} className="bg-slate-50/30 p-6 rounded-lg border border-slate-100 relative group">
          <div className="grid gap-4 md:grid-cols-12 mb-4">
            <div className="md:col-span-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Outline #</Label>
              <Input
                placeholder="e.g. 2.1.1"
                className="h-8 text-xs bg-white font-mono"
                disabled={!editable}
                value={section.outlineNumber}
                onChange={(e) => onUpdate(idx, { outlineNumber: e.target.value })}
              />
            </div>
            <div className="md:col-span-10">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Section Title</Label>
              <Input
                placeholder="Heading text..."
                className="h-8 text-xs bg-white font-bold font-serif"
                disabled={!editable}
                value={section.title}
                onChange={(e) => onUpdate(idx, { title: e.target.value })}
              />
            </div>
          </div>
          <RichField
            label="Section Content"
            minHeight="150px"
            disabled={!editable}
            value={section.body}
            onChange={(v) => onUpdate(idx, { body: v })}
            onIEEE={onIEEE}
            onFocus={onFocus}
          />
          {editable && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
              onClick={() => onRemove(idx)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function StudentTrainingReportPage() {
  const { showToast } = useToastContext();
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [eligibilityData, setEligibilityData] = useState<TrainingReportEligibility | null>(null);
  const [companyName, setCompanyName] = useState<string | undefined>();
  const [report, setReport] = useState<TrainingReportDetail | null>(null);
  const [content, setContent] = useState<TrainingReportContentPayload>(emptyTrainingReportContent());
  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; }, [content]);


  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [figureFile, setFigureFile] = useState<File | null>(null);
  const [figureCaption, setFigureCaption] = useState("");
  const [addingFigure, setAddingFigure] = useState(false);
  const [dashboardSaysEligible, setDashboardSaysEligible] = useState<boolean | null>(null);

  // Auto-save state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const lastFocusedEditor = useRef<HTMLDivElement | null>(null);

  const applyEligibilityAndReport = useCallback(async () => {
    const el = await getTrainingReportEligibility();
    setEligible(el.eligible);
    setEligibilityData(el);
    setCompanyName(el.companyName);
    if (!el.eligible) {
      setReport(null);
      return;
    }
    const res = await getMyTrainingReport();
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    setReport(res.report);
    setContent({ ...emptyTrainingReportContent(), ...res.report.content });
    setHasUnsavedChanges(false);
    setLastSavedAt(res.report.updatedAt ? new Date(res.report.updatedAt) : new Date());
  }, [showToast]);


  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void applyEligibilityAndReport().finally(() => {
        if (!cancelled) setLoading(false);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [applyEligibilityAndReport]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void applyEligibilityAndReport();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [applyEligibilityAndReport]);

  useEffect(() => {
    if (loading || eligible !== false) return;
    let cancelled = false;
    void getStudentDashboardSummary().then((s) => {
      if (cancelled) return;
      setDashboardSaysEligible(Boolean(s?.trainingReportEligible));
    });
    return () => {
      cancelled = true;
    };
  }, [loading, eligible]);

  const editable =
    report?.status === "draft" || report?.status === "revision_requested";

  const patchContent = (patch: Partial<TrainingReportContentPayload>) => {
    setContent((c) => ({ ...c, ...patch }));
    if (editable) setHasUnsavedChanges(true);
  };


  const saveContent = async (isAuto = false) => {
    if (!report || !editable) return;
    const currentContent = contentRef.current;
    const payload: TrainingReportContentPayload = {
      ...currentContent,
      references: currentContent.references.map((r) => r.trim()).filter((r) => r.length > 0),
    };

    setSaving(true);
    const res = await updateTrainingReportContent(report.id, payload);
    setSaving(false);
    if (!res.success) {
      if (!isAuto) showToast(res.message, "error");
      return;
    }
    setReport(res.report);
    setHasUnsavedChanges(false);
    setLastSavedAt(new Date());
    if (!isAuto) showToast("Saved.", "success");
  };

  // Auto-save effect: every 30 seconds if changes exist
  useEffect(() => {
    if (!editable || !hasUnsavedChanges || !report) return;
    
    const interval = setInterval(() => {
      // Use functional state or just trust the closure if it doesn't need to be perfectly fresh
      // Actually, to get the LATEST content without triggering effect re-run, we should use a ref or just keep the dependency but it's fine for 30s.
      // Let's keep it simple but remove 'content' from dependency to avoid resetting on every key.
      void saveContent(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [editable, hasUnsavedChanges, report]); // content removed from here



  const handleSubmit = async () => {
    if (!report) return;
    setSubmitting(true);
    const payload: TrainingReportContentPayload = {
      ...content,
      references: content.references.map((r) => r.trim()).filter((r) => r.length > 0),
    };
    const saveFirst = await updateTrainingReportContent(report.id, payload);
    if (!saveFirst.success) {
      setSubmitting(false);
      showToast(saveFirst.message, "error");
      return;
    }
    setReport(saveFirst.report);
    const sub = await submitTrainingReport(report.id);
    setSubmitting(false);
    if (!sub.success) {
      showToast(sub.message, "error");
      return;
    }
    setReport(sub.report);
    showToast("Submitted for review.", "success");
  };

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    const res = await downloadTrainingReportWord(report.id);
    setExporting(false);
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    showToast("Word downloaded.", "success");
  };

  const handleAddFigure = async () => {
    if (!report || !figureFile || !editable) return;
    setAddingFigure(true);
    const up = await uploadFile(figureFile, "training_report_figure");
    if (!up.success) {
      showToast(up.message, "error");
      setAddingFigure(false);
      return;
    }
    const res = await addTrainingReportFigure(report.id, up.file.id, figureCaption || undefined);
    setAddingFigure(false);
    setFigureFile(null);
    setFigureCaption("");
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    setReport(res.report);
    showToast("Figure attached.", "success");
  };

  const handleDeleteFigure = async (figureId: string) => {
    if (!report || !editable) return;
    const res = await deleteTrainingReportFigure(report.id, figureId);
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    setReport(res.report);
  };

  const addDynamicSection = (listKey: keyof TrainingReportContentPayload) => {
    const next: TrainingReportDynamicSection = { outlineNumber: "", title: "", body: "" };
    const currentList = (content[listKey] as TrainingReportDynamicSection[]) || [];
    patchContent({ [listKey]: [...currentList, next] });
  };

  const updateDynamic = (listKey: keyof TrainingReportContentPayload, index: number, patch: Partial<TrainingReportDynamicSection>) => {
    const currentList = [...((content[listKey] as TrainingReportDynamicSection[]) || [])];
    currentList[index] = { ...currentList[index], ...patch };
    patchContent({ [listKey]: currentList });
  };

  const removeDynamic = (listKey: keyof TrainingReportContentPayload, index: number) => {
    const currentList = (content[listKey] as TrainingReportDynamicSection[]) || [];
    patchContent({
      [listKey]: currentList.filter((_, i) => i !== index),
    });
  };

  const addReferenceLine = () => {
    patchContent({ references: [...content.references, ""] });
  };

  const updateReference = (index: number, value: string) => {
    const copy = [...content.references];
    copy[index] = value;
    patchContent({ references: copy });
  };

  const removeReference = (index: number) => {
    patchContent({ references: content.references.filter((_, i) => i !== index) });
  };

  if (loading || eligible === null) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading…
      </div>
    );
  }

  if (!eligible) {
    const checks = eligibilityData?.checks;

    const CheckItem = ({ label, passed }: { label: string; passed: boolean }) => (
      <div className="flex items-center justify-between py-2 border-b last:border-0">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <div className="flex items-center gap-2">
          {passed ? (
            <>
              <span className="text-[10px] font-bold text-green-600 uppercase">Completed</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </>
          ) : (
            <>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Pending</span>
              <XCircle className="h-4 w-4 text-slate-200" />
            </>
          )}
        </div>
      </div>
    );

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between max-w-5xl mx-auto w-full py-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Training report (SWEN 300)</h1>
            <p className="text-sm text-muted-foreground mt-1">Available after internship completion.</p>
          </div>
        </div>
        <Card className="max-w-4xl mx-auto shadow-lg border-slate-200">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-slate-800">Prerequisites & Status</CardTitle>
            <CardDescription>
              To open the training report, all internship steps must be verified.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <CheckItem label="Internship Application Approval (Coordinator)" passed={checks?.applicationApproved ?? false} />
              <CheckItem label="Acceptance Letter Verification" passed={checks?.acceptanceLetterVerified ?? false} />
              <CheckItem label="Logbook Submission to Company" passed={checks?.logbookSubmittedToSupervisor ?? false} />
              <CheckItem label="Company Supervisor Evaluation" passed={checks?.supervisorEvaluationDone ?? false} />
              <CheckItem label="Logbook Submitted for Coordinator Review" passed={checks?.logbookSubmittedForCoordinator ?? false} />
              <CheckItem label="Final Logbook Verification (Coordinator)" passed={checks?.coordinatorLogbookVerified ?? false} />
            </div>

            {!checks?.coordinatorLogbookVerified && (
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
                <p className="text-sm text-blue-800 leading-relaxed">
                  <strong>Next Step:</strong> Once your final logbook is verified by the internship coordinator, this report portal will automatically unlock. 
                  If you have already completed these steps, click the button below to refresh.
                </p>
              </div>
            )}

            {dashboardSaysEligible === true && !checks?.coordinatorLogbookVerified && (
              <p className="text-sm text-amber-800 dark:text-amber-200 rounded-md border border-amber-200/80 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950">
                Your internship summary on the main dashboard indicates this report should already be available. 
                This usually means the final coordinator verification is being processed.
              </p>
            )}

            <div className="flex items-center gap-4 pt-4">
              <Button
                type="button"
                variant="default"
                className="bg-slate-800 hover:bg-slate-900"
                onClick={() => {
                  setLoading(true);
                  setDashboardSaysEligible(null);
                  void applyEligibilityAndReport().finally(() => setLoading(false));
                }}
              >
                Check Status Again
              </Button>
              <span className="text-[10px] text-slate-400 italic">Last checked: {format(new Date(), "HH:mm:ss")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  const insertCitation = (num: number) => {
    if (lastFocusedEditor.current) {
      lastFocusedEditor.current.focus();
      document.execCommand("insertText", false, `[${num}]`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-30 -mx-4 mb-8 border-b bg-background/95 px-4 py-4 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between max-w-5xl mx-auto w-full">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight">Training report (SWEN 300)</h1>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                {companyName ? `Placement: ${companyName}` : "Summer Training Report"}
              </p>
              {editable && (
                <AutoSaveIndicator 
                  saving={saving} 
                  lastSavedAt={lastSavedAt} 
                  hasUnsavedChanges={hasUnsavedChanges} 
                />
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!report || exporting}
              onClick={handleExport}
              className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              Download Word
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!report || saving || !editable}
              onClick={() => saveContent(false)}
              className="bg-slate-800 hover:bg-slate-900 text-white"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!report || submitting || !editable}
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit to Coordinator
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-slate-100/50 -mx-4 -mb-8 p-4 md:p-8 min-h-screen">
        <div className="max-w-[850px] mx-auto bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] border-t-[12px] border-t-primary rounded-sm p-8 md:p-16 min-h-[1100px] space-y-12 mb-20 relative overflow-hidden">
          {/* Paper Background Lines Decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 -mr-16 -mt-16 rotate-45 pointer-events-none" />

          {report && (
            <div className="border-b pb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Document Status</span>
                <StatusBadge
                  status={
                    report.status === "approved"
                      ? "approved"
                      : report.status === "submitted"
                        ? "pending"
                        : report.status === "revision_requested"
                          ? "rejected"
                          : "not_applied"
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground italic">
                {report.status === "submitted" && "This report is currently under review by the internship coordinator."}
                {report.status === "revision_requested" && "Status: Revision Requested. Please see feedback below and update sections."}
                {report.status === "approved" && "This report has been officially approved. Content is now locked."}
                {report.status === "draft" && "Status: Work in Progress. Remember to save your work frequently."}
              </p>

              {report.coordinatorFeedback && (
                <div className="mt-6 rounded-lg border-2 border-amber-100 bg-amber-50/50 p-4 text-sm relative">
                  <div className="absolute top-0 left-4 -translate-y-1/2 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Feedback</div>
                  <p className="whitespace-pre-wrap leading-relaxed text-amber-900">{report.coordinatorFeedback}</p>
                </div>
              )}
            </div>
          )}

          {/* Section 1 */}
          <section className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-slate-800">1. Introduction</h2>
            <RichField
              label="Introduction content"
              minHeight="200px"
              disabled={!editable}
              value={content.introduction}
              onChange={(v) => patchContent({ introduction: v })}
              onIEEE={() => setIsReferenceModalOpen(true)}
              onFocus={(el) => (lastFocusedEditor.current = el)}
            />
            <DynamicSectionList
              title="Introduction Subsections"
              list={content.introductionSections || []}
              editable={editable}
              onIEEE={() => setIsReferenceModalOpen(true)}
              onFocus={(el) => (lastFocusedEditor.current = el)}
              onAdd={() => addDynamicSection("introductionSections")}
              onUpdate={(idx, p) => updateDynamic("introductionSections", idx, p)}
              onRemove={(idx) => removeDynamic("introductionSections", idx)}
            />
          </section>

          {/* Section 2 */}
          <section className="space-y-6 pt-12 border-t">
            <h2 className="text-2xl font-serif font-bold text-slate-800">2. Information About the Company</h2>
            <RichField
              label="Company Introduction"
              minHeight="100px"
              disabled={!editable}
              value={content.companyIntro}
              onChange={(v) => patchContent({ companyIntro: v })}
              onIEEE={() => setIsReferenceModalOpen(true)}
              onFocus={(el) => (lastFocusedEditor.current = el)}
            />
            <div className="grid gap-8">
              <RichField
                label="2.1 Aim and Establishment"
                minHeight="150px"
                disabled={!editable}
                value={content.company21}
                onChange={(v) => patchContent({ company21: v })}
                onIEEE={() => setIsReferenceModalOpen(true)}
                onFocus={(el) => (lastFocusedEditor.current = el)}
              />
              <RichField
                label="2.2 Departments and Personnel"
                minHeight="150px"
                disabled={!editable}
                value={content.company22}
                onChange={(v) => patchContent({ company22: v })}
                onIEEE={() => setIsReferenceModalOpen(true)}
                onFocus={(el) => (lastFocusedEditor.current = el)}
              />
            </div>
            <DynamicSectionList
              title="Company Subsections"
              list={content.companySections || []}
              editable={editable}
              onIEEE={() => setIsReferenceModalOpen(true)}
              onFocus={(el) => (lastFocusedEditor.current = el)}
              onAdd={() => addDynamicSection("companySections")}
              onUpdate={(idx, p) => updateDynamic("companySections", idx, p)}
              onRemove={(idx) => removeDynamic("companySections", idx)}
            />
          </section>

          {/* Section 3 */}
          <section className="space-y-8 pt-12 border-t">
            <div className="border-b-2 border-slate-900 pb-2">
              <h2 className="text-2xl font-serif font-bold text-slate-800">3. Work Experience</h2>
            </div>
            <RichField
              label="General Overview"
              minHeight="100px"
              disabled={!editable}
              value={content.workExperienceIntro}
              onChange={(v) => patchContent({ workExperienceIntro: v })}
              onIEEE={() => setIsReferenceModalOpen(true)}
              onFocus={(el) => (lastFocusedEditor.current = el)}
            />

            <div className="bg-slate-50/50 p-6 rounded-lg space-y-6">
              <h3 className="text-lg font-bold text-slate-700">3.1 Problem Definition</h3>
              <RichField
                label="Problem Statement"
                minHeight="200px"
                disabled={!editable}
                value={content.problemDefinition}
                onChange={(v) => patchContent({ problemDefinition: v })}
                onIEEE={() => setIsReferenceModalOpen(true)}
                onFocus={(el) => (lastFocusedEditor.current = el)}
              />
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-700 border-l-4 border-primary pl-4">3.2 Description of Work Done</h3>
              <RichField
                label="Activity Summary"
                minHeight="100px"
                disabled={!editable}
                value={content.workDoneIntro}
                onChange={(v) => patchContent({ workDoneIntro: v })}
                onIEEE={() => setIsReferenceModalOpen(true)}
                onFocus={(el) => (lastFocusedEditor.current = el)}
              />

              <div className="grid gap-6 md:grid-cols-2 bg-white border p-6 rounded-md shadow-sm">
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Task 1 Title</Label>
                  <Input
                    disabled={!editable}
                    className="font-medium bg-transparent border-slate-200 text-sm"
                    value={content.task1Title}
                    onChange={(e) => patchContent({ task1Title: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Task 2 Title</Label>
                  <Input
                    disabled={!editable}
                    className="font-medium bg-transparent border-slate-200 text-sm"
                    value={content.task2Title}
                    onChange={(e) => patchContent({ task2Title: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-12 pt-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">1</span>
                    <h4 className="font-bold text-slate-800 italic underline text-sm">Task 1: {content.task1Title || "Untitled Task"}</h4>
                  </div>
                  <RichField
                    label="Implementation Details"
                    minHeight="250px"
                    disabled={!editable}
                    value={content.task1Body}
                    onChange={(v) => patchContent({ task1Body: v })}
                    onIEEE={() => setIsReferenceModalOpen(true)}
                    onFocus={(el) => (lastFocusedEditor.current = el)}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">2</span>
                    <h4 className="font-bold text-slate-800 italic underline text-sm">Task 2: {content.task2Title || "Untitled Task"}</h4>
                  </div>
                  <RichField
                    label="Implementation Details"
                    minHeight="250px"
                    disabled={!editable}
                    value={content.task2Body}
                    onChange={(v) => patchContent({ task2Body: v })}
                    onIEEE={() => setIsReferenceModalOpen(true)}
                    onFocus={(el) => (lastFocusedEditor.current = el)}
                  />
                </div>
              </div>

              <DynamicSectionList
                title="Work Experience Subsections"
                list={content.workExperienceSections || []}
                editable={editable}
                onIEEE={() => setIsReferenceModalOpen(true)}
                onFocus={(el) => (lastFocusedEditor.current = el)}
                onAdd={() => addDynamicSection("workExperienceSections")}
                onUpdate={(idx, p) => updateDynamic("workExperienceSections", idx, p)}
                onRemove={(idx) => removeDynamic("workExperienceSections", idx)}
              />
            </div>
          </section>

          {/* Section 4 & 5 */}
          <div className="grid gap-12 pt-12 border-t">
            <section className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-slate-800">4. Conclusion</h2>
              <RichField
                label="Final Summary & Results"
                minHeight="200px"
                disabled={!editable}
                value={content.conclusion}
                onChange={(v) => patchContent({ conclusion: v })}
                onIEEE={() => setIsReferenceModalOpen(true)}
                onFocus={(el) => (lastFocusedEditor.current = el)}
              />
              <DynamicSectionList
                title="Conclusion Subsections"
                list={content.conclusionSections || []}
                editable={editable}
                onIEEE={() => setIsReferenceModalOpen(true)}
                onFocus={(el) => (lastFocusedEditor.current = el)}
                onAdd={() => addDynamicSection("conclusionSections")}
                onUpdate={(idx, p) => updateDynamic("conclusionSections", idx, p)}
                onRemove={(idx) => removeDynamic("conclusionSections", idx)}
              />
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold text-slate-800">5. References</h2>
                {editable && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      lastFocusedEditor.current = null; // No insertion if clicked here
                      setIsReferenceModalOpen(true);
                    }}
                    className="h-8 text-[10px] bg-slate-900 text-white hover:bg-slate-800 border-none px-4"
                  >
                    <GraduationCap className="mr-2 h-3 w-3" /> IEEE Generator
                  </Button>
                )}
              </div>

              <div className="space-y-4 bg-slate-50 p-6 rounded-lg border border-dashed border-slate-300">
                {content.references.map((ref, idx) => (
                  <div key={idx} className="flex gap-3 group">
                    <span className="text-xs font-mono text-slate-400 mt-2">[{idx + 1}]</span>
                    <div className="flex-1">
                      <Input
                        disabled={!editable}
                        className="bg-white border-transparent focus:border-slate-200 transition-all text-sm h-8"
                        value={ref}
                        onChange={(e) => updateReference(idx, e.target.value)}
                      />
                    </div>
                    {editable && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive"
                        onClick={() => removeReference(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {editable && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed border-slate-300 bg-transparent text-slate-500 hover:text-primary hover:border-primary text-[10px] h-8"
                    onClick={addReferenceLine}
                  >
                    <Plus className="mr-2 h-3 w-3" /> Add Manual Reference
                  </Button>
                )}
              </div>

              <IEEEReferenceGenerator
                open={isReferenceModalOpen}
                onOpenChange={setIsReferenceModalOpen}
                onGenerate={(formatted) => {
                  const num = content.references.length + 1;
                  insertCitation(num);
                  patchContent({ references: [...content.references, formatted] });
                  showToast(`Reference [${num}] added.`, "success");
                }}
              />
            </section>
          </div>

          {/* Figures Section */}
          <section className="space-y-8 pt-12 border-t-4 border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-slate-800">Figures & Attachments</h2>
              <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded">IMAGE APPENDIX</span>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              {report?.figures?.map((fig) => (
                <div key={fig.id} className="relative group border bg-white p-4 rounded-sm shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-video relative overflow-hidden bg-slate-100 rounded-sm mb-4 border border-slate-100">
                    <img
                      src={fig.url}
                      alt={fig.caption}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <p className="text-xs font-serif italic text-center text-slate-600 px-4">
                    Figure {fig.sortOrder}: {fig.caption}
                  </p>
                  {editable && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteFigure(fig.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {editable && (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 bg-slate-50/30 flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-700">Add Supporting Figure</h4>
                  <p className="text-xs text-muted-foreground">Upload screenshots or diagrams related to your work.</p>
                </div>
                <div className="w-full max-w-sm space-y-4">
                  <Input
                    type="file"
                    accept="image/*"
                    className="text-xs"
                    onChange={(e) => setFigureFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Figure Caption (e.g. Login Screen UI)"
                      className="text-xs flex-1"
                      value={figureCaption}
                      onChange={(e) => setFigureCaption(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={addingFigure || !figureFile || !figureCaption}
                      onClick={handleAddFigure}
                    >
                      {addingFigure ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Footer Decoration */}
          <div className="pt-20 text-center opacity-20 pointer-events-none select-none">
            <p className="text-[10px] font-bold tracking-[0.5em] uppercase">End of Training Report Document</p>
          </div>
        </div>

        {report?.submittedAt && (
          <div className="max-w-5xl mx-auto px-4 text-center">
             <p className="text-[10px] text-slate-400 uppercase tracking-widest">
               Document Hash Verification Active • Last Digital Submission: {format(new Date(report.submittedAt), "MMM d, yyyy HH:mm")}
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
