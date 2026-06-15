"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { ProfileCard } from "@/components/student/profile-card";
import { ApplicationLetterProgressCard } from "@/components/student/application-letter-progress-card";
import { EligibilityStatusCardEnhanced } from "@/components/student/eligibility-status-card-enhanced";
import { InternshipTimeline } from "@/components/student/internship-timeline";
import { DashboardStats } from "@/components/student/dashboard-stats";
import { QuickActions } from "@/components/student/quick-actions";
import { NotificationsFeed } from "@/components/student/notifications-feed";
import { AIWidget } from "@/components/student/ai-widget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ApplicationStatus,
  StudentPlacementSummary,
  StudentNotification,
  SummerTrainingLetterStatus,
  User,
} from "@/types";
import { getMyNotifications, getStudentDashboardSummary, markNotificationAsRead } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

/** Öğrenci ana sayfası: özet ve bildirimler gerçek API'den çekilir */
export default function StudentDashboard() {
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [logbookEntriesCount, setLogbookEntriesCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [internshipStatus, setInternshipStatus] = useState<ApplicationStatus>("pending");
  const [summerTrainingLetterStatus, setSummerTrainingLetterStatus] =
    useState<SummerTrainingLetterStatus | null>(null);
  const [placementSummary, setPlacementSummary] = useState<StudentPlacementSummary | null>(null);
  const [trainingReportEligible, setTrainingReportEligible] = useState(false);
  const [summerTrainingReportSubmitted, setSummerTrainingReportSubmitted] = useState(false);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const eligibilityStatus = profileUser?.eligibilityStatus;
  const passedCourses = profileUser?.passedThirdYearCourses ?? 0;
  const requiredCourses = profileUser?.requiredThirdYearCourses ?? 5;

  // Dashboard için gerekli profil, sayaç ve bildirimleri tek özet endpointten çek
  useEffect(() => {
    Promise.all([getStudentDashboardSummary(), getMyNotifications()])
      .then(([summary, notificationList]) => {
        if (!summary) return;

        setProfileUser(summary.user);
        setApplicationsCount(summary.applicationsCount);
        setLogbookEntriesCount(summary.logbookEntriesCount);
        setReportsCount(summary.reportsCount);
        setInternshipStatus(summary.internshipStatus);
        setSummerTrainingLetterStatus(summary.summerTrainingLetterStatus ?? null);
        setPlacementSummary(summary.placementSummary ?? null);
        setTrainingReportEligible(summary.trainingReportEligible ?? false);
        setSummerTrainingReportSubmitted(summary.summerTrainingReportSubmitted ?? false);
        setNotifications(notificationList);
      })
      .catch(() => {});
  }, []);

  const handleMarkAsRead = (id: string) => {
    markNotificationAsRead(id).then((result) => {
      if (!result.success) return;

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? result.notification : notification
        )
      );
    });
  };

  const handleOpenChat = () => {
    const chatButton = document.querySelector('[data-ai-chat-trigger]') as HTMLElement;
    chatButton?.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's your overview."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          {profileUser && <ProfileCard user={profileUser} />}
          {profileUser && (
            <ApplicationLetterProgressCard status={summerTrainingLetterStatus} />
          )}
          {eligibilityStatus ? (
            <EligibilityStatusCardEnhanced
              status={eligibilityStatus}
              passedCourses={passedCourses}
              requiredCourses={requiredCourses}
              applicationLetterApproved={summerTrainingLetterStatus === "approved"}
            />
          ) : (
            <Card className="border-yellow-300 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="h-5 w-5" />
                  Internship eligibility — course grades
                </CardTitle>
                <CardDescription className="text-yellow-700 dark:text-yellow-300">
                  Enter every row in the{" "}
                  <Link href="/student/summer-training-letter" className="font-semibold underline underline-offset-4">
                    Application letter
                  </Link>{" "}
                  course table (status & grade) and click <strong>Save draft</strong>. The portal applies the same
                  passing-course rule (count toward internship eligibility). The official transcript PDF is uploaded
                  separately when you apply to a company.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-yellow-800 dark:text-yellow-200">
                Open{" "}
                <Link href="/student/summer-training-letter" className="font-semibold underline underline-offset-4">
                  Application letter — course table
                </Link>
                .
              </CardContent>
            </Card>
          )}
          {(eligibilityStatus === "eligible" || summerTrainingLetterStatus === "approved") && (
            <InternshipTimeline
              eligibilityStatus={eligibilityStatus ?? "not_eligible"}
              summerTrainingLetterStatus={summerTrainingLetterStatus}
              placementSummary={placementSummary}
              internshipStatus={internshipStatus}
              logbookEntriesCount={logbookEntriesCount}
              reportsCount={reportsCount}
              trainingReportEligible={trainingReportEligible}
              summerTrainingReportSubmitted={summerTrainingReportSubmitted}
            />
          )}
        </div>
        <div className="space-y-4">
          <AIWidget onOpenChat={handleOpenChat} />
          <QuickActions
            eligibilityStatus={eligibilityStatus ?? "not_eligible"}
            internshipStatus={internshipStatus}
            summerLetterApproved={summerTrainingLetterStatus === "approved"}
          />
        </div>
      </div>

      <DashboardStats
        internshipStatus={internshipStatus}
        applicationsCount={applicationsCount}
        logbookEntries={logbookEntriesCount}
        reportsCount={reportsCount}
      />

      {/* Removed NotificationsFeed from here. Users can view all via header bell or sidebar link. */}
      <div className="h-4" /> 
    </div>
  );
}
