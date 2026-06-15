"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToastContext } from "@/components/providers/toast-provider";
import {
  downloadSummerAcceptanceLetterBlank,
  downloadSummerAcceptanceLetterWord,
  getMyAcceptanceLetterPortal,
  putMyAcceptanceLetterPortal,
} from "@/lib/api";
import type { AcceptanceLetterPortalOverrides } from "@/types";
import { FileDown, Loader2, Save } from "lucide-react";

const WORD_TAG = "TraineeJobOwnWords";

/** Portal yalnızca acceptance / logbook şablonundaki {{TraineeJobOwnWords}} paragrafını kaydeder; diğer alanlar profil ve yerleşimden gelir. */
export default function StudentAcceptanceLetterPortalPage() {
  const { showToast } = useToastContext();
  const [loading, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [effectiveTraineeWords, setEffectiveTraineeWords] = useState("");
  const [traineeJobOwnWords, setTraineeJobOwnWords] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloadingBlank, setDownloadingBlank] = useState(false);
  const [downloadingFilled, setDownloadingFilled] = useState(false);

  const load = useCallback(async () => {
    const res = await getMyAcceptanceLetterPortal();
    if (!res.success) {
      showToast(res.message, "error");
      setApplicationId(null);
      setEffectiveTraineeWords("");
      setTraineeJobOwnWords("");
      return;
    }
    const { session } = res;
    setApplicationId(session.applicationId);

    const merged = session.effectivePreview[WORD_TAG] ?? "—";
    setEffectiveTraineeWords(merged);

    const saved = session.savedOverrides?.traineeJobOwnWords?.trim();
    setTraineeJobOwnWords(saved ?? (merged !== "—" ? merged : ""));
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void load().finally(() => {
        if (!cancelled) setLoading(false);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const trimmed = traineeJobOwnWords.trim();
      const payload: AcceptanceLetterPortalOverrides = trimmed ? { traineeJobOwnWords: trimmed } : {};
      const res = await putMyAcceptanceLetterPortal(payload);
      if (!res.success) {
        showToast(res.message, "error");
        return;
      }
      showToast("Trainee duties paragraph saved.", "success");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const downloadBlank = async () => {
    setDownloadingBlank(true);
    try {
      const r = await downloadSummerAcceptanceLetterBlank();
      if (!r.success) showToast(r.message, "error");
      else showToast("Blank template downloaded.", "success");
    } finally {
      setDownloadingBlank(false);
    }
  };

  const downloadFilled = async () => {
    setDownloadingFilled(true);
    try {
      const r = await downloadSummerAcceptanceLetterWord();
      if (!r.success) showToast(r.message, "error");
      else showToast("Prefilled Word downloaded.", "success");
    } finally {
      setDownloadingFilled(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-6">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!applicationId) {
    return (
      <div className="space-y-6 max-w-3xl">
        <PageHeader
          title="Summer acceptance letter"
          description="Enter your trainee duties paragraph here, then download the prefilled Word document."
        />
        <Card>
          <CardHeader>
            <CardTitle>Not available yet</CardTitle>
            <CardDescription>
              This page unlocks when your internship placement is approved (or ongoing / completed) and your Application
              letter is fully approved by your advisor and the internship coordinator — same rules as the prefilled
              Word export.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/student/summer-training-letter">Application letter</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/student/applications">My Applications</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl pb-16">
      <PageHeader
        title="Summer acceptance letter"
        description="Only this paragraph is filled on the portal. Your name, programme details, company block, dates, and supervisor lines come from your profile and placement — Word is for signing and printing."
      />

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Download Word</CardTitle>
          <CardDescription>
            Save your paragraph first so the prefilled file includes it under{" "}
            <code className="text-xs">{`{{${WORD_TAG}}}`}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={downloadingBlank} onClick={downloadBlank}>
            {downloadingBlank ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
            Blank template
          </Button>
          <Button type="button" size="sm" disabled={downloadingFilled} onClick={downloadFilled}>
            {downloadingFilled ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Prefilled .docx
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={save}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save paragraph
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trainee duties, responsibilities and roles</CardTitle>
          <CardDescription>
            Write in English as required by your department — typically the paragraph under the prompt:{" "}
            <em>
              State the accompanying duties, responsibilities and roles that are assigned to you by the company as an
              engineering trainee
            </em>
            . This text is merged into the acceptance letter as{" "}
            <code className="text-xs">{`{{${WORD_TAG}}}`}</code> (max 8000 characters).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="trainee-job-own-words">Your paragraph</Label>
            <Textarea
              id="trainee-job-own-words"
              className="min-h-[200px] text-sm leading-relaxed"
              value={traineeJobOwnWords}
              onChange={(e) => setTraineeJobOwnWords(e.target.value)}
              placeholder="Describe the duties, responsibilities and roles assigned to you as an engineering trainee…"
              maxLength={8000}
            />
            <p className="text-xs text-muted-foreground">{traineeJobOwnWords.length} / 8000 characters</p>
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-3 text-xs space-y-2">
            <div className="font-medium text-muted-foreground flex flex-wrap items-center gap-1">
              <span>In Word</span>
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{`{{${WORD_TAG}}}`}</code>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Live preview: your textarea when it is not empty; otherwise the last merged value from the server (after
              save or placement default). Save to persist changes to the prefilled export.
            </p>
            <div className="whitespace-pre-wrap break-words text-sm border-t pt-2 border-border/60">
              {traineeJobOwnWords.trim().length > 0 ? traineeJobOwnWords : effectiveTraineeWords}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" size="sm" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save paragraph
        </Button>
      </div>
    </div>
  );
}
