"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  BookOpen,
  FileCheck,
  Building2,
  MessageSquare,
  Users,
  User,
  Settings,
  ClipboardList,
  UserCheck,
  Database,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const studentMenu: SidebarItem[] = [
  { title: "Dashboard", href: "/student", icon: LayoutDashboard },
  { title: "Profile", href: "/student/profile", icon: User },
  { title: "Settings", href: "/student/settings", icon: Settings },
  { title: "Upload Transcript", href: "/student/transcript", icon: FileText },
  { title: "Apply for Internship", href: "/student/apply", icon: Briefcase },
  { title: "My Applications", href: "/student/applications", icon: ClipboardList },
  { title: "Daily Logbook", href: "/student/logbook", icon: BookOpen },
  { title: "Final Report", href: "/student/report", icon: FileCheck },
  { title: "Companies", href: "/student/companies", icon: Building2 },
  { title: "AI Assistant", href: "/student/ai-assistant", icon: MessageSquare },
];

const coordinatorMenu: SidebarItem[] = [
  { title: "Dashboard", href: "/coordinator", icon: LayoutDashboard },
  { title: "Profile", href: "/coordinator/profile", icon: User },
  { title: "Applications", href: "/coordinator/applications", icon: ClipboardList },
  { title: "Student Monitoring", href: "/coordinator/monitoring", icon: Users },
  { title: "Companies", href: "/coordinator/companies", icon: Building2 },
  { title: "Knowledge Base", href: "/coordinator/knowledge-base", icon: Database },
];

const companyMenu: SidebarItem[] = [
  { title: "Dashboard", href: "/company", icon: LayoutDashboard },
  { title: "Profile", href: "/company/profile", icon: User },
  { title: "Review Applications", href: "/company/applications", icon: UserCheck },
  { title: "Supervise Interns", href: "/company/interns", icon: Users },
];

const adminMenu: SidebarItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Profile", href: "/admin/profile", icon: User },
  { title: "User Management", href: "/admin/users", icon: Users },
  { title: "Knowledge Base", href: "/admin/knowledge-base", icon: Database },
  { title: "System Config", href: "/admin/config", icon: Settings },
];

const getMenuByRole = (role: UserRole): SidebarItem[] => {
  switch (role) {
    case "student":
      return studentMenu;
    case "coordinator":
      return coordinatorMenu;
    case "company":
      return companyMenu;
    case "admin":
      return adminMenu;
    default:
      return [];
  }
};

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const menuItems = getMenuByRole(role);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Improved active state logic - prevents multiple items from being active
  const isActive = (href: string) => {
    // Exact match
    if (pathname === href) return true;
    
    // For dashboard routes (root level), only match exactly - never match children
    const isDashboardRoute = href === "/student" || 
                            href === "/coordinator" || 
                            href === "/company" || 
                            href === "/admin";
    
    if (isDashboardRoute) {
      return false; // Dashboard routes only match exactly (handled above)
    }
    
    // For other routes, allow matching if pathname starts with href + "/"
    // This allows /student/transcript to match /student/transcript
    // But prevents /student from matching when on /student/transcript
    return pathname.startsWith(href + "/");
  };

  const SidebarContent = () => (
    <nav className="flex-1 space-y-1 p-4 overflow-y-auto sidebar-scroll">
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsMobileOpen(false)}
            className={cn(
              "flex items-center rounded-lg text-sm font-medium",
              "transition-all duration-300 ease-in-out",
              "transform hover:scale-[1.02] active:scale-[0.98]",
              isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
              active
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
            )}
            title={isCollapsed ? item.title : undefined}
            style={{
              animationDelay: `${index * 20}ms`,
            }}
          >
            <Icon
              className={cn(
                "flex-shrink-0 transition-all duration-300",
                isCollapsed ? "h-5 w-5" : "h-5 w-5",
                active ? "scale-110" : "scale-100"
              )}
            />
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-300 ease-in-out",
                isCollapsed
                  ? "opacity-0 w-0 overflow-hidden ml-0"
                  : "opacity-100 w-auto ml-0"
              )}
            >
              {item.title}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-20 left-4 z-50 transition-all duration-300 ease-in-out"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <div className="relative w-5 h-5">
          <Menu
            className={cn(
              "absolute inset-0 h-5 w-5 transition-all duration-300 ease-in-out",
              isMobileOpen ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
            )}
          />
          <X
            className={cn(
              "absolute inset-0 h-5 w-5 transition-all duration-300 ease-in-out",
              isMobileOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
            )}
          />
        </div>
      </Button>

      {/* Mobile overlay */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out",
          isMobileOpen ? "opacity-100 visible" : "opacity-0 invisible"
        )}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "flex h-full flex-col border-r bg-card",
          "transition-all duration-500 ease-in-out",
          isCollapsed ? "w-16" : "w-64",
          "fixed lg:static z-40",
          isMobileOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-full lg:translate-x-0 opacity-100"
        )}
        style={{
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="flex h-16 items-center justify-between border-b px-4 transition-all duration-300">
          <h2
            className={cn(
              "text-lg font-semibold whitespace-nowrap transition-all duration-300 ease-in-out",
              isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
            )}
          >
            Internship System
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex transition-transform duration-300 hover:scale-110"
          >
            <div className="relative w-4 h-4">
              <ChevronLeft
                className={cn(
                  "absolute inset-0 h-4 w-4 transition-all duration-300 ease-in-out",
                  isCollapsed ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
                )}
              />
              <ChevronRight
                className={cn(
                  "absolute inset-0 h-4 w-4 transition-all duration-300 ease-in-out",
                  isCollapsed ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
                )}
              />
            </div>
          </Button>
        </div>
        <SidebarContent />
      </div>
    </>
  );
}
