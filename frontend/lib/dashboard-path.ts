import type { UserRole } from "@/types";

/** Oturumlu kullanıcının ana panel yolu (navbar / sidebar logo linki). */
export function dashboardPathForUser(role: UserRole, coordinatorPortal?: boolean): string {
  if (coordinatorPortal === true || role === "coordinator") return "/coordinator";
  switch (role) {
    case "student":
      return "/student";
    case "advisor":
      return "/advisor";
    case "company":
      return "/company";
    case "admin":
      return "/admin";
    default:
      return "/auth/login";
  }
}
