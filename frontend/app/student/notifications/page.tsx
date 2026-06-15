"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/page-header";
import { NotificationsFeed } from "@/components/student/notifications-feed";
import { getMyNotifications, markNotificationAsRead } from "@/lib/api";
import { StudentNotification } from "@/types";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyNotifications()
      .then((data) => {
        setNotifications(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleMarkAsRead = (id: string) => {
    markNotificationAsRead(id).then((result) => {
      if (!result.success) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? result.notification : n))
      );
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Notifications"
        description="All your internship updates and alerts in one place."
      />

      <NotificationsFeed
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
      />
      
      {isLoading && notifications.length === 0 && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
