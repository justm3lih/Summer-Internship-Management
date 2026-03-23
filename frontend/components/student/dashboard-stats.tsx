import { StatCard } from "@/components/common/stat-card";
import { ApplicationStatus } from "@/types";
import { Briefcase, BookOpen, FileText, Clock, CheckCircle2, TrendingUp, XCircle } from "lucide-react";

interface DashboardStatsProps {
  internshipStatus: ApplicationStatus;
  applicationsCount: number;
  logbookEntries: number;
  reportsCount: number;
}

export function DashboardStats({
  internshipStatus,
  applicationsCount,
  logbookEntries,
  reportsCount,
}: DashboardStatsProps) {
  const getStatusIcon = () => {
    switch (internshipStatus) {
      case "not_applied":
        return Clock;
      case "pending":
        return Clock;
      case "approved":
        return CheckCircle2;
      case "ongoing":
        return TrendingUp;
      case "completed":
        return CheckCircle2;
      default:
        return XCircle;
    }
  };

  const getStatusText = () => {
    switch (internshipStatus) {
      case "not_applied":
        return "Not Applied";
      case "pending":
        return "Pending Approval";
      case "approved":
        return "Approved";
      case "ongoing":
        return "Ongoing";
      case "completed":
        return "Completed";
      default:
        return "Rejected";
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Internship Status"
        value={getStatusText()}
        description="Current application status"
        icon={StatusIcon}
        iconClassName={
          internshipStatus === "approved" || internshipStatus === "completed"
            ? "text-green-500"
            : internshipStatus === "pending" || internshipStatus === "ongoing"
            ? "text-yellow-500"
            : internshipStatus === "rejected"
            ? "text-red-500"
            : ""
        }
      />
      <StatCard
        title="Applications"
        value={applicationsCount}
        description="Total applications"
        icon={Briefcase}
      />
      <StatCard
        title="Logbook Entries"
        value={logbookEntries}
        description="This month"
        icon={BookOpen}
      />
      <StatCard
        title="Reports"
        value={reportsCount}
        description="Submitted"
        icon={FileText}
      />
    </div>
  );
}
