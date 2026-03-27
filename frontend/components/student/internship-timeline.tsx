import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InternshipTimelineProps {
  transcriptVerified: boolean;
}

const timelineSteps: Array<{
  key: string;
  label: string;
  description: string;
}> = [
  { key: "transcript_verified", label: "Transcript Verified", description: "Your transcript is approved for internship eligibility" },
  { key: "internship_approved", label: "Internship Approved", description: "Wait for the internship approval stage" },
  { key: "logbook_completed", label: "Logbook Completed", description: "This step will be activated after the logbook workflow is finished" },
  { key: "final_report_approved", label: "Final Report Approved", description: "This step will be activated after the final report review" },
  { key: "completed", label: "Completed", description: "All internship workflow steps are finished" },
];

export function InternshipTimeline({ transcriptVerified }: InternshipTimelineProps) {
  const completedIndex = transcriptVerified ? 0 : -1;
  const currentIndex = transcriptVerified ? 1 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Internship Process Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timelineSteps.map((step, index) => {
            const isCompleted = completedIndex >= 0 && index <= completedIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={step.key} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                      isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent
                        ? "border-primary bg-background text-primary"
                        : "border-muted bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>
                  {index < timelineSteps.length - 1 && (
                    <div
                      className={cn(
                        "h-12 w-0.5",
                        isCompleted ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <div className="flex items-center gap-2">
                    <h4
                      className={cn(
                        "font-semibold",
                        isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </h4>
                    {isCurrent && (
                      <Clock className="h-4 w-4 text-primary animate-pulse" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
