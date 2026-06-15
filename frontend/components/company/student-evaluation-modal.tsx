"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Application } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROGRAM_OUTCOME_LABELS } from "@/lib/program-outcomes";
import { completeSupervisorEvaluation, reviewCompanyApplication } from "@/lib/api";
import { useToastContext } from "@/components/providers/toast-provider";
import { Star, Save, Send, AlertCircle, CheckCircle2, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentEvaluationModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: Application) => void;
}

const SCORE_OPTIONS = [null, 0, 1, 2, 3, 4] as const;

export function StudentEvaluationModal({ application, isOpen, onClose, onSaved }: StudentEvaluationModalProps) {
  const { showToast } = useToastContext();
  const [poScores, setPoScores] = useState<(number | null)[]>(Array(11).fill(null));
  const [overallPerf, setOverallPerf] = useState("");
  const [suggestionsCiu, setSuggestionsCiu] = useState("");
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (application) {
      const s = application.supervisorProgramOutcomeScores;
      if (s && s.length === 11) {
        setPoScores(s.map(x => (typeof x === "number" && x >= 0 && x <= 4 ? x : null)));
      } else {
        setPoScores(Array(11).fill(null));
      }
      setOverallPerf(application.supervisorOverallPerformanceObservations ?? "");
      setSuggestionsCiu(application.supervisorSuggestionsToUniversityAboutTrainee ?? "");
    }
  }, [application]);

  if (!application) return null;

  const handleSave = async (silent = false) => {
    setSaving(true);
    const result = await reviewCompanyApplication(application.id, {
      supervisorProgramOutcomeScores: poScores,
      supervisorOverallPerformanceObservations: overallPerf.trim(),
      supervisorSuggestionsToUniversityAboutTrainee: suggestionsCiu.trim(),
    });
    setSaving(false);
    if (!result.success) {
      if (!silent) showToast(result.message, "error");
      return null;
    }
    onSaved(result.application);
    if (!silent) showToast("Evaluation progress saved.", "success");
    return result.application;
  };

  const handleComplete = async () => {
    setCompleting(true);
    const updatedApp = await handleSave(true);
    if (!updatedApp) {
      setCompleting(false);
      return;
    }
    const result = await completeSupervisorEvaluation(application.id);
    setCompleting(false);
    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    showToast("Evaluation finalized and sent to coordinator.", "success");
    onSaved({ ...updatedApp, supervisorEvaluationCompletedAt: result.completedAt });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-lg">
                <Star className="h-5 w-5 fill-current" />
              </div>
              <DialogTitle className="text-2xl font-bold">Student Evaluation</DialogTitle>
            </div>
            <DialogDescription className="text-sm">
              Rating performance outcomes for <span className="font-bold text-foreground">{application.student?.name}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>Evaluation Scale:</strong> Rate each outcome from <strong>0 (No contribution)</strong> to <strong>4 (Strong contribution)</strong>. 
              These scores will be included in the official internship logbook Word export.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Program Outcomes (PO1 - PO11)
            </h3>
            <div className="grid gap-3">
              {PROGRAM_OUTCOME_LABELS.map((label, idx) => (
                <div key={idx} className="group rounded-xl border p-4 bg-card hover:border-primary/30 transition-all shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <p className="text-sm font-medium leading-snug flex-1">{label}</p>
                    <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg">
                      {SCORE_OPTIONS.map((opt) => (
                        <button
                          key={String(opt)}
                          type="button"
                          onClick={() => {
                            const next = [...poScores];
                            next[idx] = opt;
                            setPoScores(next);
                          }}
                          className={cn(
                            "h-8 w-8 rounded-md text-xs font-bold transition-all",
                            (opt === null ? poScores[idx] === null : poScores[idx] === opt)
                              ? "bg-primary text-primary-foreground shadow-md scale-110"
                              : "hover:bg-background text-muted-foreground"
                          )}
                        >
                          {opt === null ? "—" : opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 border-t pt-8">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Qualitative Observations
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold">Overall performance & training period observations</Label>
                <Textarea
                  placeholder="Summarize the trainee's work, reliability, and growth..."
                  className="min-h-[120px] bg-slate-50/50 focus:bg-white transition-all border-slate-200"
                  value={overallPerf}
                  onChange={(e) => setOverallPerf(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Suggestions to CIU regarding the trainee</Label>
                <Textarea
                  placeholder="Feedback for the university coordinator..."
                  className="min-h-[100px] bg-slate-50/50 focus:bg-white transition-all border-slate-200"
                  value={suggestionsCiu}
                  onChange={(e) => setSuggestionsCiu(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-slate-50/50 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleSave()} 
              disabled={saving || completing}
              className="bg-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Draft
            </Button>
            <Button 
              onClick={handleComplete} 
              disabled={saving || completing}
              className="bg-primary shadow-lg shadow-primary/20"
            >
              {completing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Finalize Evaluation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
