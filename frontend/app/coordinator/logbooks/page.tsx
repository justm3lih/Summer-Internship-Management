"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import {
  getCoordinatorLogbookAll,
  getMe,
  downloadLogbookWordExport,
  verifyLogbookByCoordinator,
  returnLogbookByCoordinator,
} from "@/lib/api";
import { COORDINATOR_PERMISSIONS, hasPermission } from "@/lib/permissions";
import type { LogbookCoordinatorRow, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { useToastContext } from "@/components/providers/toast-provider";
import { FileDown, Loader2, Eye, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

export default function CoordinatorLogbooksPage() {
  const { showToast } = useToastContext();
  const [me, setMe] = useState<User | null>(null);
  const [rows, setRows] = useState<LogbookCoordinatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getCoordinatorLogbookAll().then((list) => {
      setRows(list);
      setLoading(false);
    });
  };

  useEffect(() => {
    getMe().then(setMe);
    load();
  }, []);

  const download = async (studentId: string) => {
    setBusyId(studentId);
    const res = await downloadLogbookWordExport(studentId);
    setBusyId(null);
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    showToast("Logbook Word downloaded.", "success");
  };

  const handleQuickVerify = async (appId: string) => {
    setBusyId(appId);
    const res = await verifyLogbookByCoordinator(appId);
    setBusyId(null);
    if (!res.success) {
      showToast(res.message || "Failed to verify.", "error");
      return;
    }
    showToast("Logbook verified.", "success");
    load();
  };

  const handleQuickReturn = async (appId: string) => {
    setBusyId(appId);
    const res = await returnLogbookByCoordinator(appId);
    setBusyId(null);
    if (!res.success) {
      showToast(res.message || "Failed to return.", "error");
      return;
    }
    showToast("Logbook returned for revision.", "info");
    load();
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Student Logbooks"
        description="Monitor daily progress, supervisor approvals, and download official logbook documents."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-6 w-6 animate-spin" /> Loading logbooks...
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No logbooks found</CardTitle>
            <CardDescription>No students have started their daily logbook yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => (
            <Card key={row.studentId} className="flex flex-col border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold">{row.studentName}</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-semibold tracking-wider">
                      {row.studentNumber} · {row.companyName}
                    </CardDescription>
                  </div>
                  {row.verifiedByCoordinatorAt ? (
                    <StatusBadge status="approved" />
                  ) : row.submittedToCoordinatorAt ? (
                    <StatusBadge status="pending" />
                  ) : (
                    <StatusBadge status="ongoing" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-50 p-2 rounded-md flex items-center gap-2 border border-slate-100">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Entries</span>
                      <span className="font-bold">{row.entryCount} days</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-md flex items-center gap-2 border border-slate-100">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Evaluation</span>
                      <span className="font-bold text-[11px]">
                        {row.supervisorEvaluationCompletedAt ? "Completed" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 italic">Coordinator Review:</span>
                      <span className={row.submittedToCoordinatorAt ? "text-blue-600 font-bold" : "text-slate-400"}>
                        {row.submittedToCoordinatorAt ? "Submitted" : "Not Sent"}
                      </span>
                   </div>
                   <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full transition-all" 
                        style={{ width: row.verifiedByCoordinatorAt ? "100%" : row.submittedToCoordinatorAt ? "75%" : row.supervisorEvaluationCompletedAt ? "50%" : row.entryCount > 0 ? "25%" : "5%" }}
                      />
                   </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/coordinator/logbooks/${row.studentId}`} className="flex-1">
                    <Button type="button" size="sm" variant="default" className="w-full bg-slate-800">
                      <Eye className="mr-2 h-4 w-4" /> View Logs
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === row.studentId}
                    onClick={() => download(row.studentId)}
                    className="flex-shrink-0"
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2 pt-2 border-t mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="flex-1 text-[11px] h-8"
                    disabled={busyId === row.applicationId || !row.submittedToCoordinatorAt || !!row.verifiedByCoordinatorAt}
                    onClick={() => handleQuickReturn(row.applicationId!)}
                  >
                    Return
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 text-[11px] h-8 bg-green-600 hover:bg-green-700"
                    disabled={busyId === row.applicationId || !row.submittedToCoordinatorAt || !!row.verifiedByCoordinatorAt}
                    onClick={() => handleQuickVerify(row.applicationId!)}
                  >
                    Approve
                  </Button>
                </div>
                
                <div className="text-[9px] text-slate-400 flex justify-between items-center pt-2 border-t mt-auto">
                   <span>ID: {row.studentId.slice(0,8)}...</span>
                   <span>Last App: {row.updatedAt ? format(new Date(row.updatedAt), "dd/MM/HH:mm") : "-"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
