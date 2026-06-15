"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCompanyDashboard, getMyNotifications, markNotificationAsRead } from "@/lib/api";
import { CompanyDashboardSummary, StudentNotification } from "@/types";
import { formatDistanceToNow } from "date-fns";

export default function CompanyDashboard() {
  const [dashboard, setDashboard] = useState<CompanyDashboardSummary | null>(null);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      const [data, notificationList] = await Promise.all([
        getCompanyDashboard(),
        getMyNotifications(),
      ]);
      if (!isMounted) return;
      setDashboard(data);
      setNotifications(notificationList);
      setIsLoading(false);
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
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
      <div>
        <h1 className="text-3xl font-bold">Company Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your internship program
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Interns</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.assignedInterns ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active interns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.pendingApplications ?? 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.completedInternships ?? 0}</div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/company/applications">
              <Button className="w-full justify-start" variant="default">
                <ClipboardList className="mr-2 h-4 w-4" />
                Review Applications
              </Button>
            </Link>
            <Link href="/company/interns">
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Supervise Interns
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>{isLoading ? "Loading latest updates..." : "Latest updates"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!isLoading && notifications.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent activity yet.</p>
              )}
              {notifications.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-start gap-4 rounded-lg border p-3 transition-colors ${
                    !activity.read ? "bg-primary/5 border-primary/20" : "hover:bg-accent"
                  }`}
                  onClick={() => !activity.read && handleMarkAsRead(activity.id)}
                >
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(activity.date, { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
