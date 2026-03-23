"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EligibilityStatus } from "@/types";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface EligibilityStatusCardEnhancedProps {
  status: EligibilityStatus;
  passedCourses: number;
  requiredCourses: number;
}

export function EligibilityStatusCardEnhanced({
  status,
  passedCourses,
  requiredCourses,
}: EligibilityStatusCardEnhancedProps) {
  // Confetti animation removed - no longer triggers on dashboard load

  const getStatusConfig = () => {
    switch (status) {
      case "eligible":
        return {
          icon: CheckCircle2,
          bgColor: "bg-green-50 dark:bg-green-950",
          borderColor: "border-green-200 dark:border-green-800",
          textColor: "text-green-700 dark:text-green-300",
          iconColor: "text-green-600",
        };
      case "almost_eligible":
        return {
          icon: AlertTriangle,
          bgColor: "bg-yellow-50 dark:bg-yellow-950",
          borderColor: "border-yellow-200 dark:border-yellow-800",
          textColor: "text-yellow-700 dark:text-yellow-300",
          iconColor: "text-yellow-600",
        };
      case "not_eligible":
        return {
          icon: XCircle,
          bgColor: "bg-red-50 dark:bg-red-950",
          borderColor: "border-red-200 dark:border-red-800",
          textColor: "text-red-700 dark:text-red-300",
          iconColor: "text-red-600",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const remaining = Math.max(0, requiredCourses - passedCourses);
  const progress = Math.min(100, (passedCourses / requiredCourses) * 100);

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Icon className={`h-8 w-8 ${config.iconColor} flex-shrink-0`} />
          <div className="flex-1 space-y-2">
            <div>
              <h3 className={`text-lg font-semibold ${config.textColor}`}>
                {status === "eligible" && "Eligible"}
                {status === "almost_eligible" && "Almost Eligible"}
                {status === "not_eligible" && "Not Eligible Yet"}
              </h3>
              <p className={`text-sm ${config.textColor} mt-1`}>
                {status === "eligible" &&
                  `${passedCourses}/${requiredCourses} required upper-level courses passed`}
                {status === "almost_eligible" &&
                  `${passedCourses}/${requiredCourses} passed. Almost there!`}
                {status === "not_eligible" &&
                  `${remaining} more course${remaining !== 1 ? "s" : ""} needed`}
              </p>
            </div>
            {(status === "almost_eligible" || status === "not_eligible") && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={config.textColor}>Progress</span>
                  <span className={config.textColor}>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full transition-all ${
                      status === "almost_eligible" ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
