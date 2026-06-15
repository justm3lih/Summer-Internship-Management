import { StatCard } from "@/components/common/stat-card";
import { ClipboardList, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";

interface CoordinatorStatsProps {
  pendingApplications: number;
  eligibleNotApplied: number;
  ongoingInternships: number;
  completedInternships: number;
}

export function CoordinatorDashboardStats({
  pendingApplications,
  eligibleNotApplied,
  ongoingInternships,
  completedInternships,
}: CoordinatorStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Pending Applications"
        value={pendingApplications}
        description="Awaiting your review"
        icon={ClipboardList}
        iconClassName="text-yellow-500"
      />
      <StatCard
        title="Eligible Not Applied"
        value={eligibleNotApplied}
        description="Students who can apply"
        icon={AlertCircle}
        iconClassName="text-primary"
      />
      <StatCard
        title="Ongoing Internships"
        value={ongoingInternships}
        description="Currently active"
        icon={TrendingUp}
        iconClassName="text-green-500"
      />
      <StatCard
        title="Completed"
        value={completedInternships}
        description="This semester"
        icon={CheckCircle2}
        iconClassName="text-primary"
      />
    </div>
  );
}
