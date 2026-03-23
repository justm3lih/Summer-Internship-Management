import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EligibilityStatus } from "@/types";

interface RecentNotificationsProps {
  eligibilityStatus: EligibilityStatus;
}

export function RecentNotifications({ eligibilityStatus }: RecentNotificationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Notifications</CardTitle>
        <CardDescription>Latest updates and alerts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">
                {eligibilityStatus === "eligible"
                  ? "You are now eligible for internship!"
                  : "Transcript processing complete"}
              </p>
              <p className="text-xs text-muted-foreground">
                {eligibilityStatus === "eligible"
                  ? "You can now apply for summer internships."
                  : "Your transcript has been scanned and processed."}
              </p>
            </div>
            <Badge variant="secondary">New</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
