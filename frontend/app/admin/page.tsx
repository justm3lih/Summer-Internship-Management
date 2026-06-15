"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Database, Settings, TrendingUp, CheckCircle2, Loader2 } from "lucide-react";
import { AdminDashboardSummary, StudentNotification } from "@/types";
import {
  getAdminDashboardSummary,
  getAppSettings,
  getMyNotifications,
  markNotificationAsRead,
  type AppSettings,
} from "@/lib/api";
import { NotificationsFeed } from "@/components/student/notifications-feed";

const quickActions = [
  { href: "/admin/users", icon: Users, label: "Manage Users" },
  { href: "/admin/knowledge-base", icon: Database, label: "Knowledge Base" },
  { href: "/admin/config", icon: Settings, label: "System Configuration" },
];

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<AdminDashboardSummary | null>(null);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [settings, setSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      const [summary, notificationList, appSettings] = await Promise.all([
        getAdminDashboardSummary(),
        getMyNotifications(),
        getAppSettings(),
      ]);
      if (!isMounted) return;
      if (summary) setDashboard(summary);
      setNotifications(notificationList);
      setSettings(appSettings);
      setLoading(false);
    };

    load().catch(() => {
      if (isMounted) setLoading(false);
    });

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

  const eligibilityThreshold = settings["eligibility.requiredCourses"] || "—";
  const activeTerm =
    settings["term.active"] && settings["term.year"]
      ? `${settings["term.active"]} ${settings["term.year"]}`
      : "Not set";
  const applicationDeadline = settings["application.deadline"]
    ? new Date(settings["application.deadline"]).toLocaleDateString()
    : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">All roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligibility Scans</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.eligibilityScans ?? 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.approvedCompanies ?? 0}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Internships</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.activeInternships ?? 0}</div>
            <p className="text-xs text-muted-foreground">Currently ongoing</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex w-full items-center justify-start rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {action.label}
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Eligibility Threshold</span>
                  <span className="text-sm font-medium">
                    {eligibilityThreshold} course{eligibilityThreshold === "1" ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Term</span>
                  <span className="text-sm font-medium">{activeTerm}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Application Deadline</span>
                  <span className="text-sm font-medium">{applicationDeadline}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Internships</span>
                  <span className="text-sm font-medium">{dashboard?.activeInternships ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending Applications</span>
                  <span className="text-sm font-medium">{dashboard?.pendingApplications ?? 0}</span>
                </div>
              </div>
            )}
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
