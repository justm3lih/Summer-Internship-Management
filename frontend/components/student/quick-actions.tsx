import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApplicationStatus, EligibilityStatus } from "@/types";
import { Briefcase, FileText, BookOpen } from "lucide-react";
import Link from "next/link";

interface QuickActionsProps {
  eligibilityStatus: EligibilityStatus;
  internshipStatus: ApplicationStatus;
  /** Koordinatör onaylı yaz staj mektubu varsa başvuru formu açılır (portal N ders eşiğinden bağımsız). */
  summerLetterApproved?: boolean;
}

export function QuickActions({
  eligibilityStatus,
  internshipStatus,
  summerLetterApproved = false,
}: QuickActionsProps) {
  const canApply =
    summerLetterApproved &&
    (internshipStatus === "not_applied" || internshipStatus === "rejected");

  const canUseLogbook =
    internshipStatus === "approved" || internshipStatus === "ongoing";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {canApply && (
          <Link href="/student/apply">
            <Button className="w-full justify-start" variant="default">
              <Briefcase className="mr-2 h-4 w-4" />
              Apply for Internship
            </Button>
          </Link>
        )}
        {eligibilityStatus !== "eligible" && (
          <Link href="/student/summer-training-letter">
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Course grades (internship eligibility)
            </Button>
          </Link>
        )}
        {canUseLogbook && (
          <Link href="/student/logbook">
            <Button className="w-full justify-start" variant="outline">
              <BookOpen className="mr-2 h-4 w-4" />
              Add Logbook Entry
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
