"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import {
  approveTrainingReport,
  downloadTrainingReportWord,
  getCoordinatorTrainingReportAll,
  getMe,
  requestTrainingReportRevision,
} from "@/lib/api";
import { COORDINATOR_PERMISSIONS, hasPermission } from "@/lib/permissions";
import type { TrainingReportPendingRow, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/common/status-badge";
import { useToastContext } from "@/components/providers/toast-provider";
import { FileDown, Loader2, Eye } from "lucide-react";
import { format } from "date-fns";

export default function CoordinatorTrainingReportsPage() {
  const { showToast } = useToastContext();
  const [me, setMe] = useState<User | null>(null);
  const [rows, setRows] = useState<TrainingReportPendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({});

  const canFinalApprove = me ? hasPermission(me, COORDINATOR_PERMISSIONS.reportsReview) : false;

  const load = () => {
    setLoading(true);
    getCoordinatorTrainingReportAll().then((list) => {
      setRows(list);
      setLoading(false);
    });
  };

  useEffect(() => {
    getMe().then(setMe);
  }, []);

  useEffect(() => {
    load();
  }, []);

  const download = async (id: string) => {
    setBusyId(id);
    const res = await downloadTrainingReportWord(id);
    setBusyId(null);
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    showToast("Word downloaded.", "success");
  };

  const requestRevision = async (id: string) => {
    const feedback = feedbackById[id]?.trim() ?? "";
    if (!feedback) {
      showToast("Enter feedback for the student.", "error");
      return;
    }
    setBusyId(id);
    const res = await requestTrainingReportRevision(id, feedback);
    setBusyId(null);
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    showToast("Revision requested.", "success");
    load();
  };

  const approve = async (id: string) => {
    setBusyId(id);
    const res = await approveTrainingReport(id);
    setBusyId(null);
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    showToast("Report approved.", "success");
    load();
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Training reports (SWEN 300)"
        description="All ongoing and submitted training reports. You can monitor progress and review anytime."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-6 w-6 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No reports</CardTitle>
            <CardDescription>There are no training reports in the system yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((row) => (
            <Card key={row.id} className="flex flex-col border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold">{row.studentName}</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-semibold tracking-wider">
                      {row.studentNumber} · {row.companyName}
                    </CardDescription>
                  </div>
                  <StatusBadge status={row.status === "approved" ? "approved" : row.status === "submitted" ? "pending" : row.status === "draft" ? "ongoing" : "rejected"} />
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Link href={`/coordinator/training-reports/${row.id}`} className="flex-1">
                    <Button type="button" size="sm" variant="default" className="w-full bg-slate-800">
                      <Eye className="mr-2 h-4 w-4" /> View Online
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === row.id}
                    onClick={() => download(row.id)}
                    className="flex-1"
                  >
                    <FileDown className="mr-2 h-4 w-4" /> Word
                  </Button>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Feedback</label>
                  <Textarea
                    placeholder="Brief feedback..."
                    value={feedbackById[row.id] ?? ""}
                    onChange={(e) => setFeedbackById((m) => ({ ...m, [row.id]: e.target.value }))}
                    className="min-h-[60px] text-xs resize-none"
                    disabled={row.status === "approved"}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="flex-1 text-xs"
                    disabled={busyId === row.id || row.status === "approved" || row.status === "draft"}
                    onClick={() => requestRevision(row.id)}
                  >
                    Request Revision
                  </Button>
                  {canFinalApprove && (
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                      disabled={busyId === row.id || row.status === "approved" || row.status === "draft"}
                      onClick={() => approve(row.id)}
                    >
                      Approve
                    </Button>
                  )}
                </div>
                
                <div className="text-[9px] text-slate-400 flex justify-between items-center pt-2 border-t mt-auto">
                   <span>ID: {row.id.slice(0,8)}...</span>
                   <span>Updated: {row.updatedAt ? format(new Date(row.updatedAt), "dd/MM/HH:mm") : "-"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

