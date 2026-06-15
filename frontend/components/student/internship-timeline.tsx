import type {
  ApplicationStatus,
  EligibilityStatus,
  StudentPlacementSummary,
  SummerTrainingLetterStatus,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeApplicationLetterStatus } from "@/lib/application-letter-status";

const STEPS: Array<{ key: string; label: string }> = [
  { key: "eligibility", label: "Course eligibility" },
  { key: "summer_letter", label: "Application letter" },
  { key: "application", label: "Internship application" },
  { key: "coordinator_placement", label: "University coordinator (placement)" },
  { key: "company_placement", label: "Company acceptance" },
  { key: "supervisor", label: "Company supervisor assigned" },
  {
    key: "acceptance",
    label: "Signed acceptance letter (coordinator)",
  },
  { key: "logbook", label: "Daily logbook" },
  { key: "report", label: "Training report (SWEN 300)" },
];

function letterStatusLabel(s: SummerTrainingLetterStatus | null | undefined): string {
  return describeApplicationLetterStatus(s, "short");
}

export interface InternshipTimelineProps {
  eligibilityStatus: EligibilityStatus;
  summerTrainingLetterStatus?: SummerTrainingLetterStatus | null;
  placementSummary?: StudentPlacementSummary | null;
  internshipStatus: ApplicationStatus;
  logbookEntriesCount: number;
  reportsCount: number;
  /** Dashboard ile aynı: SWEN300 rapor sayfası açılabilir mi */
  trainingReportEligible?: boolean;
  /** SWEN300 raporu gönderilmiş veya onaylanmış (FinalReport değil) */
  summerTrainingReportSubmitted?: boolean;
}

export function InternshipTimeline({
  eligibilityStatus,
  summerTrainingLetterStatus,
  placementSummary,
  internshipStatus,
  logbookEntriesCount,
  reportsCount,
  trainingReportEligible,
  summerTrainingReportSubmitted,
}: InternshipTimelineProps) {
  const eligible = eligibilityStatus === "eligible";
  const letterOk = summerTrainingLetterStatus === "approved";
  const eligibilityStepComplete = eligible || letterOk;
  const hasApplication =
    placementSummary != null || internshipStatus !== "not_applied";
  const placementApproved =
    placementSummary != null &&
    ["approved", "ongoing", "completed"].includes(placementSummary.status);
  const coordinatorPlacementDone =
    placementSummary?.coordinatorPlacementApprovedAt != null || placementApproved;
  const companyPlacementDone =
    placementSummary?.companyPlacementApprovedAt != null || placementApproved;
  const supervisorOk = placementSummary?.companySupervisorAssigned === true;
  const acceptanceOk = placementSummary?.acceptanceLetterVerified === true;
  const logbookSubmittedToCoordinator =
    placementSummary?.logbookSubmittedForCoordinatorReviewAt != null;
  const logbookOk = logbookSubmittedToCoordinator;
  const reportOk =
    summerTrainingReportSubmitted === true ||
    reportsCount > 0;

  const stepDone: Record<string, boolean> = {
    eligibility: eligibilityStepComplete,
    summer_letter: letterOk,
    application: hasApplication,
    coordinator_placement: coordinatorPlacementDone,
    company_placement: companyPlacementDone,
    supervisor: supervisorOk,
    acceptance: acceptanceOk,
    logbook: logbookOk,
    report: reportOk,
  };

  const descriptions: Record<string, string> = {
    eligibility: eligible
      ? "You meet the portal passing-course threshold."
      : letterOk
        ? "Your coordinator-approved letter clears you to apply; counts below are informational if the threshold is not met yet."
        : "Complete each row in the Application letter course table and save draft — eligibility unlocks when enough courses pass.",
    summer_letter: letterOk
      ? "Your application letter is approved for this period."
      : letterStatusLabel(summerTrainingLetterStatus ?? null),
    application: hasApplication
      ? placementSummary?.companyName
        ? `Application on file (${placementSummary.companyName}). Status: ${placementSummary.status.replace("_", " ")}.`
        : `Application on file. Overall status: ${internshipStatus.replace("_", " ")}.`
      : "Submit an application to a company from Apply for Internship.",
    coordinator_placement: coordinatorPlacementDone
      ? placementApproved
        ? "University coordinator approved your placement for this application."
        : "Coordinator approval recorded; waiting for company acceptance."
      : hasApplication
        ? "Waiting for the internship coordinator to approve your placement."
        : "Complete an internship application first.",
    company_placement: companyPlacementDone
      ? placementApproved
        ? "The company accepted you for this internship placement."
        : "Company acceptance recorded; waiting for coordinator approval."
      : hasApplication
        ? "Waiting for the company to accept your internship application."
        : "Apply and get coordinator approval first.",
    supervisor: supervisorOk
      ? `Supervisor assigned${placementSummary?.companySupervisorName ? `: ${placementSummary.companySupervisorName}` : ""}${!placementApproved && hasApplication ? " — placement may still be awaiting coordinator/company approval." : ""}.`
      : placementApproved
        ? "The company primary account should assign an on-site supervisor (staff user)."
        : hasApplication
          ? "Company assigns a supervisor after placement is approved (assignment can appear early while status is still pending)."
          : "After placement is approved, the company assigns your supervisor.",
    acceptance: acceptanceOk
      ? "Coordinator recorded verification for your signed summer acceptance letter — daily logbook unlocks."
      : placementApproved
        ? "Separate from placement approval: save the Acceptance letter portal, sign offline, then the internship coordinator verifies here once they confirm your signed document."
        : "Available after your placement is approved (ongoing/completed).",
    logbook: logbookOk
      ? "You submitted your daily logbook to the university coordinator (after supervisor sign-off on every row)."
      : acceptanceOk
        ? logbookEntriesCount > 0
          ? "You have entries — finish supervisor approval on each row, then use Logbook → Submit logbook to coordinator."
          : "Record daily work and obtain supervisor approvals, then submit the logbook to the coordinator from the Logbook page."
        : "Opens after acceptance letter verification.",
    report: reportOk
      ? "Training report activity is recorded."
      : trainingReportEligible
        ? "Your internship is marked completed — open Training report (SWEN 300) to fill and submit."
        : "Submit your SWEN 300 report after the company marks your placement completed.",
  };

  let currentIndex: number | null = null;
  for (let i = 0; i < STEPS.length; i++) {
    if (!stepDone[STEPS[i].key]) {
      currentIndex = i;
      break;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Internship Process Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {STEPS.map((step, index) => {
            const done = stepDone[step.key];
            const isCurrent = currentIndex !== null && index === currentIndex;

            return (
              <div key={step.key} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent
                          ? "border-primary bg-background text-primary"
                          : "border-muted bg-muted text-muted-foreground"
                    )}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={cn("h-12 w-0.5", done ? "bg-primary" : "bg-muted")} />
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <div className="flex items-center gap-2">
                    <h4
                      className={cn(
                        "font-semibold",
                        isCurrent ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </h4>
                    {isCurrent && <Clock className="h-4 w-4 text-primary animate-pulse" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{descriptions[step.key]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
