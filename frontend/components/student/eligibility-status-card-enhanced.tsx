"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { EligibilityStatus } from "@/types";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface EligibilityStatusCardEnhancedProps {
  status: EligibilityStatus;
  passedCourses: number;
  requiredCourses: number;
  /** Danışman + staj koordinatörü application letter’ı onayladıysa true — kart başvuru kapısıyla uyumlu yeşil gösterilir */
  applicationLetterApproved?: boolean;
}

export function EligibilityStatusCardEnhanced({
  status,
  passedCourses,
  requiredCourses,
  applicationLetterApproved = false,
}: EligibilityStatusCardEnhancedProps) {
  const gradeEligible = status === "eligible";
  const showLetterApprovedGreen = applicationLetterApproved && !gradeEligible;

  const getGradeOnlyConfig = (): {
    icon: typeof CheckCircle2;
    bgColor: string;
    borderColor: string;
    textColor: string;
    iconColor: string;
  } => {
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

  const letterApprovedConfig = {
    icon: CheckCircle2,
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
    textColor: "text-green-700 dark:text-green-300",
    iconColor: "text-green-600",
  };

  const config = showLetterApprovedGreen ? letterApprovedConfig : getGradeOnlyConfig();
  const Icon = config.icon;
  const remaining = Math.max(0, requiredCourses - passedCourses);
  const progress =
    requiredCourses > 0 ? Math.min(100, (passedCourses / requiredCourses) * 100) : 0;

  const title = showLetterApprovedGreen
    ? "Application letter approved"
    : gradeEligible
      ? "Eligible"
      : status === "almost_eligible"
        ? "Almost eligible"
        : "Not eligible yet";

  const subtitle = showLetterApprovedGreen ? (
    <>
      Your advisor and the internship coordinator approved your SWEN application letter for this period — you can apply to
      companies. Portal course count (informational):{" "}
      <strong>
        {passedCourses}/{requiredCourses}
      </strong>{" "}
      passing grades toward the configured threshold.
    </>
  ) : gradeEligible ? (
    <>
      {passedCourses}/{requiredCourses} required courses passed (letter-grade threshold from your saved course table).
    </>
  ) : status === "almost_eligible" ? (
    <>
      {passedCourses}/{requiredCourses} passed — one more passing grade reaches the threshold.
    </>
  ) : (
    <>
      {remaining} more passing grade{remaining !== 1 ? "s" : ""} needed (minimum {requiredCourses} in your saved course
      table).
    </>
  );

  const showProgressBar = !showLetterApprovedGreen && (status === "almost_eligible" || status === "not_eligible");

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Icon className={`h-8 w-8 ${config.iconColor} flex-shrink-0`} />
          <div className="flex-1 space-y-2">
            <div>
              <h3 className={`text-lg font-semibold ${config.textColor}`}>{title}</h3>
              <p className={`text-sm ${config.textColor} mt-1`}>{subtitle}</p>
            </div>
            {showProgressBar && (
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
                <Link
                  href="/student/summer-training-letter"
                  className={`inline-block text-sm font-medium underline underline-offset-4 mt-2 ${config.textColor}`}
                >
                  Enter or update grades (Application letter)
                </Link>
              </div>
            )}
            {showLetterApprovedGreen && (
              <Link
                href="/student/summer-training-letter"
                className={`inline-block text-sm font-medium underline underline-offset-4 ${config.textColor}`}
              >
                Update course table if needed
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
