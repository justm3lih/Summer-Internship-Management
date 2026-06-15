"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { advisorReviewSummerLetter, getAdvisorPendingSummerLetters } from "@/lib/api";
import type { SummerTrainingLetterQueueItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToastContext } from "@/components/providers/toast-provider";
import { Loader2 } from "lucide-react";
import { SummerLetterCourseReadonlyTable } from "@/components/summer-training-letter/summer-letter-course-readonly-table";

export default function AdvisorSummerLettersPage() {
  const { showToast } = useToastContext();
  const [rows, setRows] = useState<SummerTrainingLetterQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [commentByLetter, setCommentByLetter] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    getAdvisorPendingSummerLetters().then((list) => {
      setRows(list);
      setLoading(false);
    });
  };

  useEffect(() => {
    let cancelled = false;
    void getAdvisorPendingSummerLetters().then((list) => {
      if (!cancelled) {
        setRows(list);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const review = async (id: string, approve: boolean) => {
    setBusyId(id);
    const comments = commentByLetter[id]?.trim();
    const res = await advisorReviewSummerLetter(id, approve, comments || undefined);
    setBusyId(null);
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    showToast(approve ? "Approved and sent to coordinator." : "Returned to student.", "success");
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Application letters"
        description="Review each student’s course table (Registered / Grade), then approve or reject."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No letters waiting for advisor review.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle>{row.student?.name ?? "Student"}</CardTitle>
                <CardDescription>
                  {(row.student?.studentId ?? "—") + " · "} {row.student?.email}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Submitted course table</p>
                  <SummerLetterCourseReadonlyTable rows={row.courseRows ?? []} />
                </div>
                <Textarea
                  placeholder="Comment (shown to student)"
                  value={commentByLetter[row.id] ?? ""}
                  onChange={(e) => setCommentByLetter((m) => ({ ...m, [row.id]: e.target.value }))}
                  rows={3}
                  className="text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={busyId === row.id}
                    onClick={() => review(row.id, false)}
                  >
                    {busyId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                  </Button>
                  <Button type="button" disabled={busyId === row.id} onClick={() => review(row.id, true)}>
                    {busyId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
