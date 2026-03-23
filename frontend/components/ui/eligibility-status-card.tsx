"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EligibilityStatus } from "@/types";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface EligibilityStatusCardProps {
  status: EligibilityStatus;
  passedCourses: number;
  requiredCourses: number;
}

export function EligibilityStatusCard({
  status,
  passedCourses,
  requiredCourses,
}: EligibilityStatusCardProps) {
  const percentage = (passedCourses / requiredCourses) * 100;

  const getStatusConfig = () => {
    switch (status) {
      case "eligible":
        return {
          icon: CheckCircle2,
          color: "text-green-500",
          bgColor: "bg-green-50 dark:bg-green-950",
          badge: "success" as const,
          message: `Eligible - ${passedCourses}/${requiredCourses} upper-level courses passed`,
        };
      case "almost_eligible":
        return {
          icon: AlertCircle,
          color: "text-yellow-500",
          bgColor: "bg-yellow-50 dark:bg-yellow-950",
          badge: "warning" as const,
          message: `Almost eligible - ${passedCourses}/${requiredCourses} passed`,
        };
      case "not_eligible":
        return {
          icon: XCircle,
          color: "text-red-500",
          bgColor: "bg-red-50 dark:bg-red-950",
          badge: "destructive" as const,
          message: `Not eligible yet - ${requiredCourses - passedCourses} more courses needed`,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Card className={config.bgColor}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            Eligibility Status
          </CardTitle>
          <Badge variant={config.badge}>
            {status === "eligible"
              ? "Eligible"
              : status === "almost_eligible"
              ? "Almost"
              : "Not Eligible"}
          </Badge>
        </div>
        <CardDescription>{config.message}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">
              {passedCourses} / {requiredCourses} courses
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
