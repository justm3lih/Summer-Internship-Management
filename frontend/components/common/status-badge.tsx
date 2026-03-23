import { Badge } from "@/components/ui/badge";
import { ApplicationStatus, EligibilityStatus } from "@/types";

interface StatusBadgeProps {
  status: ApplicationStatus | EligibilityStatus;
  type?: "application" | "eligibility";
}

export function StatusBadge({ status, type = "application" }: StatusBadgeProps) {
  if (type === "eligibility") {
    const eligibilityStatus = status as EligibilityStatus;
    switch (eligibilityStatus) {
      case "eligible":
        return <Badge variant="success">Eligible</Badge>;
      case "almost_eligible":
        return <Badge variant="warning">Almost</Badge>;
      case "not_eligible":
        return <Badge variant="destructive">Not Eligible</Badge>;
    }
  }

  const applicationStatus = status as ApplicationStatus;
  switch (applicationStatus) {
    case "pending":
      return <Badge variant="warning">Pending</Badge>;
    case "approved":
      return <Badge variant="success">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    case "ongoing":
      return <Badge variant="default">Ongoing</Badge>;
    case "completed":
      return <Badge variant="success">Completed</Badge>;
    case "not_applied":
      return <Badge variant="secondary">Not Applied</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
