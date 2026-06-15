"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { InternshipTimeline } from "@/components/student/internship-timeline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStudentDashboardSummary } from "@/lib/api";
import type { StudentDashboardSummary } from "@/types";
import { Loader2 } from "lucide-react";

export default function StudentPlacementProgressPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StudentDashboardSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getStudentDashboardSummary()
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const eligibility = summary?.user.eligibilityStatus ?? "not_eligible";
  const placement = summary?.placementSummary ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Placement progress"
        description="See where you are in the internship workflow — supervisor assignment, acceptance letter, logbook, and report."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-6 w-6 animate-spin" /> Loading…
        </div>
      ) : !summary ? (
        <p className="text-sm text-muted-foreground">Could not load your dashboard summary.</p>
      ) : (
        <>
          {eligibility !== "eligible" &&
            summary.summerTrainingLetterStatus !== "approved" && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-900 dark:text-amber-100">
                  Course grades required for eligibility
                </CardTitle>
                <CardDescription className="text-amber-800 dark:text-amber-200">
                  Fill every row in the Application letter course table (status & grade), save draft — the timeline below
                  reflects your current record.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href="/student/summer-training-letter">Application letter — course grades</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {placement && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Active application snapshot</CardTitle>
                <CardDescription>
                  Latest internship application tied to your dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>
                  <span className="text-muted-foreground">Company:</span>{" "}
                  <span className="font-medium">{placement.companyName ?? "—"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <span className="font-medium capitalize">{placement.status.replace("_", " ")}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Supervisor:</span>{" "}
                  {placement.companySupervisorAssigned ? (
                    <span className="font-medium">{placement.companySupervisorName ?? "Assigned (staff)"}</span>
                  ) : (
                    <span className="text-muted-foreground">Not assigned yet</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground pt-2">
                  Enter your trainee duties paragraph on <strong>Acceptance letter</strong> (sidebar); other Word fields
                  come from your profile and placement. Download prefilled Word from <strong>My Applications</strong> or the
                  portal. Unlocks when placement is <strong>approved</strong>, <strong>ongoing</strong>, or{" "}
                  <strong>completed</strong> and your Application letter is fully approved.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/student/acceptance-letter">Acceptance letter (portal)</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/student/applications">Open My Applications</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <InternshipTimeline
            eligibilityStatus={eligibility}
            summerTrainingLetterStatus={summary.summerTrainingLetterStatus ?? null}
            placementSummary={placement}
            internshipStatus={summary.internshipStatus}
            logbookEntriesCount={summary.logbookEntriesCount}
            reportsCount={summary.reportsCount}
            trainingReportEligible={summary.trainingReportEligible ?? false}
            summerTrainingReportSubmitted={summary.summerTrainingReportSubmitted ?? false}
          />
        </>
      )}
    </div>
  );
}
