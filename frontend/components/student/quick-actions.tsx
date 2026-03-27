import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EligibilityStatus } from "@/types";
import { Briefcase, FileText, BookOpen } from "lucide-react";
import Link from "next/link";

interface QuickActionsProps {
  eligibilityStatus: EligibilityStatus;
}

export function QuickActions({ eligibilityStatus }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {eligibilityStatus === "eligible" && (
          <Link href="/student/apply">
            <Button className="w-full justify-start" variant="default">
              <Briefcase className="mr-2 h-4 w-4" />
              Apply for Internship
            </Button>
          </Link>
        )}
        {eligibilityStatus !== "eligible" && (
          <Link href="/student/transcript">
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Upload/Update Transcript
            </Button>
          </Link>
        )}
        <Link href="/student/logbook">
          <Button className="w-full justify-start" variant="outline">
            <BookOpen className="mr-2 h-4 w-4" />
            Add Logbook Entry
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
