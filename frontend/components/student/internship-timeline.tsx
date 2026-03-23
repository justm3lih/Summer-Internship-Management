import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationStatus } from "@/types";
import { CheckCircle2, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InternshipTimelineProps {
  status: ApplicationStatus;
}

const timelineSteps: Array<{
  key: ApplicationStatus;
  label: string;
  description: string;
}> = [
  { key: "not_applied", label: "Not Applied", description: "Start your application" },
  { key: "pending", label: "Applied", description: "Awaiting coordinator approval" },
  { key: "approved", label: "Approved", description: "Ready to begin internship" },
  { key: "ongoing", label: "Ongoing", description: "Currently in progress" },
  { key: "completed", label: "Completed", description: "Internship finished" },
];

export function InternshipTimeline({ status }: InternshipTimelineProps) {
  const currentStepIndex = timelineSteps.findIndex((step) => step.key === status);
  const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Internship Status Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timelineSteps.map((step, index) => {
            const isActive = index <= activeIndex;
            const isCurrent = index === activeIndex;

            return (
              <div key={step.key} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted bg-muted text-muted-foreground"
                    )}
                  >
                    {isActive && index < activeIndex ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>
                  {index < timelineSteps.length - 1 && (
                    <div
                      className={cn(
                        "h-12 w-0.5",
                        isActive ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <div className="flex items-center gap-2">
                    <h4
                      className={cn(
                        "font-semibold",
                        isCurrent ? "text-primary" : isActive ? "text-foreground" : "text-muted-foreground"
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
