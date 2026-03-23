import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle2 } from "lucide-react";

interface EligibilityOverviewProps {
  eligibleStudents: number;
  totalUpperYearStudents: number;
}

export function EligibilityOverview({
  eligibleStudents,
  totalUpperYearStudents,
}: EligibilityOverviewProps) {
  const percentage = totalUpperYearStudents > 0 
    ? Math.round((eligibleStudents / totalUpperYearStudents) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Eligibility Overview
        </CardTitle>
        <CardDescription>
          Upper-year students eligibility status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Eligible Students</span>
            </div>
            <p className="text-2xl font-bold">{eligibleStudents}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-sm text-muted-foreground">Total Upper-Year</p>
            <p className="text-2xl font-bold">{totalUpperYearStudents}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Eligibility Rate</span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
