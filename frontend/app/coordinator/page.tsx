"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { CoordinatorDashboardStats } from "@/components/coordinator/dashboard-stats";
import { EligibilityOverview } from "@/components/coordinator/eligibility-overview";
import { NotificationsFeed } from "@/components/student/notifications-feed";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Users, Building2, BookOpen } from "lucide-react";
import Link from "next/link";
import { CoordinatorDashboardSummary, StudentNotification } from "@/types";
import {
  getCoordinatorDashboardSummary,
  getMyNotifications,
  markNotificationAsRead,
} from "@/lib/api";

export default function CoordinatorDashboard() {
  const [dashboard, setDashboard] = useState<CoordinatorDashboardSummary | null>(null);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);

  useEffect(() => {
    Promise.all([getCoordinatorDashboardSummary(), getMyNotifications()])
      .then(([summary, notificationList]) => {
        if (summary) setDashboard(summary);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coordinator Dashboard"
        description="Overview of internship applications and student status"
      />

      <CoordinatorDashboardStats
        pendingApplications={dashboard?.pendingApplications ?? 0}
        eligibleNotApplied={dashboard?.eligibleNotApplied ?? 0}
        ongoingInternships={dashboard?.ongoingInternships ?? 0}
        completedInternships={dashboard?.completedInternships ?? 0}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <EligibilityOverview
          eligibleStudents={dashboard?.eligibleStudents ?? 0}
          totalUpperYearStudents={dashboard?.totalUpperYearStudents ?? 0}
        />

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/coordinator/applications">
              <Button className="w-full justify-start" variant="default">
                <ClipboardList className="mr-2 h-4 w-4" />
                Review Applications
              </Button>
            </Link>
            <Link href="/coordinator/monitoring">
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Monitor Students
              </Button>
            </Link>
            <Link href="/coordinator/logbooks">
              <Button className="w-full justify-start" variant="outline">
                <BookOpen className="mr-2 h-4 w-4" />
                Student Logbooks
              </Button>
            </Link>
            <Link href="/coordinator/companies">
              <Button className="w-full justify-start" variant="outline">
                <Building2 className="mr-2 h-4 w-4" />
                Manage Companies
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <NotificationsFeed
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
      />
    </div>
  );
}
