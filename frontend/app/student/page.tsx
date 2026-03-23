"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/page-header";
import { ProfileCard } from "@/components/student/profile-card";
import { EligibilityStatusCardEnhanced } from "@/components/student/eligibility-status-card-enhanced";
import { InternshipTimeline } from "@/components/student/internship-timeline";
import { DashboardStats } from "@/components/student/dashboard-stats";
import { QuickActions } from "@/components/student/quick-actions";
import { NotificationsFeed } from "@/components/student/notifications-feed";
import { AIWidget } from "@/components/student/ai-widget";
import {
  demoEligibility,
  demoApplications,
  demoLogbookEntries,
  demoNotifications,
} from "@/lib/demo-data";
import { ApplicationStatus } from "@/types";
import { getMe, getProfile } from "@/lib/api";
import type { User } from "@/types";

/** Öğrenci ana sayfası: profil API'den çekilir, diğer bloklar demo veri kullanır */
export default function StudentDashboard() {
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState(demoNotifications);
  const internshipStatus: ApplicationStatus =
    demoApplications.find((app) => app.status === "approved" || app.status === "ongoing")
      ?.status || "pending";

  // Giriş yapan kullanıcıyı auth/me ile bul, sonra API'den güncel profil çek (ProfileCard için)
  useEffect(() => {
    getMe()
      .then((me) => {
        if (!me?.id) return;
        return getProfile(me.id).then((apiUser) => {
          if (apiUser) setProfileUser(apiUser);
        });
      })
      .catch(() => {});
  }, []);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
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
          <EligibilityStatusCardEnhanced
            status={demoEligibility.status}
            passedCourses={demoEligibility.passedCourses}
            requiredCourses={demoEligibility.requiredCourses}
          />
          <InternshipTimeline status={internshipStatus} />
        </div>
        <div className="space-y-4">
          <AIWidget onOpenChat={handleOpenChat} />
          <QuickActions eligibilityStatus={demoEligibility.status} />
        </div>
      </div>

      <DashboardStats
        internshipStatus={internshipStatus}
        applicationsCount={demoApplications.length}
        logbookEntries={demoLogbookEntries.length}
        reportsCount={0}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <NotificationsFeed
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
        />
        <div className="space-y-4">
          {/* Additional widgets can go here */}
        </div>
      </div>
    </div>
  );
}
