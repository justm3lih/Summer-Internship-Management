"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { CoordinatorDashboardStats } from "@/components/coordinator/dashboard-stats";
import { EligibilityOverview } from "@/components/coordinator/eligibility-overview";
import { NotificationsFeed } from "@/components/student/notifications-feed";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Users, Building2 } from "lucide-react";
import Link from "next/link";
import {
  demoCoordinatorStats,
  demoCoordinatorNotifications,
} from "@/lib/demo-data";

export default function CoordinatorDashboard() {
  const [notifications, setNotifications] = useState(demoCoordinatorNotifications);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coordinator Dashboard"
        description="Overview of internship applications and student status"
      />

      <CoordinatorDashboardStats
        pendingApplications={demoCoordinatorStats.pendingApplications}
        eligibleNotApplied={demoCoordinatorStats.eligibleNotApplied}
        ongoingInternships={demoCoordinatorStats.ongoingInternships}
        completedInternships={demoCoordinatorStats.completedInternships}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <EligibilityOverview
          eligibleStudents={demoCoordinatorStats.eligibleStudents}
          totalUpperYearStudents={demoCoordinatorStats.totalUpperYearStudents}
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
