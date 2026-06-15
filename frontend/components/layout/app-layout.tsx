"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { AIChat } from "@/components/ai-assistant/ai-chat";
import { UserRole, User } from "@/types";
import { getMe } from "@/lib/api";
import { dashboardPathForUser } from "@/lib/dashboard-path";

interface AppLayoutProps {
  children: React.ReactNode;
  requiredRole?: UserRole;  // Bu sayfa sadece bu rol için mi (örn. student); yoksa herkes girebilir
}

/** Tüm giriş yapmış sayfaların ortak layout'u: navbar, sidebar, içerik; giriş yoksa login'e yönlendirir */
export function AppLayout({ children, requiredRole }: AppLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Aktif kullanıcıyı cookie tabanlı auth/me endpoint'inden al
  useEffect(() => {
    getMe()
      .then((me) => {
        if (!me) {
          router.push("/auth/login");
          return;
        }

        if (requiredRole) {
          const allowed =
            requiredRole === "coordinator"
              ? me.coordinatorPortal === true
              : me.role === requiredRole;
          if (!allowed) {
            router.push(dashboardPathForUser(me.role, me.coordinatorPortal === true));
            return;
          }
        }

        setUser(me);
      })
      .finally(() => setIsLoading(false));
  }, [router, requiredRole]);

  if (isLoading || !user) {
    return null;
  }

  // Rol bazlı profil ve ayarlar linkleri (navbar dropdown için)
  const getProfileLink = () => {
    if (user.coordinatorPortal) return "/coordinator/profile";
    switch (user.role) {
      case "student":
        return "/student/profile";
      case "coordinator":
        return "/coordinator/profile";
      case "advisor":
        return "/advisor/profile";
      case "company":
        return "/company/profile";
      case "admin":
        return "/admin/profile";
      default:
        return "#";
    }
  };

  const getSettingsLink = () => {
    if (user.coordinatorPortal) return "/coordinator/settings";
    switch (user.role) {
      case "student":
        return "/student/settings";
      case "coordinator":
        return "/coordinator/settings";
      case "company":
        return "/company/settings";
      case "admin":
        return "/admin/settings";
      default:
        return "#";
    }
  };

  return (
    <div className="flex h-screen flex-col relative">
      <Navbar
        brandHref={dashboardPathForUser(user.role, user.coordinatorPortal === true)}
        userName={user.name}
        userRole={user.role}
        userProfileLink={getProfileLink()}
        userSettingsLink={user.role === "student" ? getSettingsLink() : undefined}  // Şimdilik sadece öğrenci için ayarlar linki
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          role={user.role}
          coordinatorPortal={user.coordinatorPortal === true}
          permissions={user.permissions}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:ml-0 transition-all duration-300 relative z-0">
          {children}
        </main>
      </div>
      <AIChat />
    </div>
  );
}
