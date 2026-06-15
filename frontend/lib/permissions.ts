import type { User, UserRole } from "@/types";

/** Ana şirket portal hesabı mı (alt kullanıcı değil)? */
export function isCompanyPrimaryPortal(
  user: Pick<User, "role" | "companyMembershipTier"> | null | undefined
): boolean {
  if (!user || user.role !== "company") return false;
  const t = user.companyMembershipTier;
  return t == null || t === "primary";
}

// Coordinator rolü için tanımlı yetkiler
export const COORDINATOR_PERMISSIONS = {
  applicationsView: "applications.view",
  applicationsReview: "applications.review",
  applicationsComment: "applications.comment",
  applicationsBulk: "applications.bulk",
  applicationsInternshipOverride: "applications.internship.override",
  studentsView: "students.view",
  companiesView: "companies.view",
  companiesAdd: "companies.add",
  companiesApprove: "companies.approve",
  companiesEdit: "companies.edit",
  knowledgeView: "knowledge.view",
  knowledgeManage: "knowledge.manage",
  reportsReview: "reports.review",
  summerLettersReview: "summer-letter.review",
  trainingReportReview: "training-report.review",
} as const;

// Company rolü için tanımlı yetkiler
export const COMPANY_PERMISSIONS = {
  applicationsView: "applications.view",
  applicationsReview: "applications.review",
  applicationsComment: "applications.comment",
  internsView: "interns.view",
  logbookView: "logbook.view",
  logbookFeedback: "logbook.feedback",
  reportsView: "reports.view",
  reportsReview: "reports.review",
} as const;

// İzin anahtarı -> kullanıcı dostu etiket ve açıklama
export const PERMISSION_META: Record<string, { role: UserRole; label: string; description: string }> = {
  // Coordinator
  "applications.view": {
    role: "coordinator",
    label: "View applications",
    description: "List incoming internship applications.",
  },
  "applications.review": {
    role: "coordinator",
    label: "Review applications",
    description: "Approve or reject internship applications.",
  },
  "applications.comment": {
    role: "coordinator",
    label: "Comment on applications",
    description: "Add notes or comments to applications.",
  },
  "applications.bulk": {
    role: "coordinator",
    label: "Bulk actions on applications",
    description: "Approve/reject multiple applications at once.",
  },
  "applications.internship.override": {
    role: "coordinator",
    label: "Override internship dates",
    description:
      "Change confirmed internship start/end dates without company approval (coordinator correction).",
  },
  "students.view": {
    role: "coordinator",
    label: "Monitor students",
    description: "Access the student monitoring list.",
  },
  "companies.view": {
    role: "coordinator",
    label: "View companies",
    description: "Browse the companies list.",
  },
  "companies.add": {
    role: "coordinator",
    label: "Add companies",
    description: "Register new companies.",
  },
  "companies.approve": {
    role: "coordinator",
    label: "Approve companies",
    description: "Mark companies as approved for internships.",
  },
  "companies.edit": {
    role: "coordinator",
    label: "Edit companies",
    description: "Update existing company information.",
  },
  "knowledge.view": {
    role: "coordinator",
    label: "View knowledge base",
    description: "See knowledge base documents and FAQs.",
  },
  "knowledge.manage": {
    role: "coordinator",
    label: "Manage knowledge base",
    description: "Add, edit or remove knowledge base entries.",
  },
  "reports.review": {
    role: "coordinator",
    label: "Review final reports",
    description: "Review and grade submitted internship reports.",
  },
  "summer-letter.review": {
    role: "coordinator",
    label: "Review application letters",
    description: "Approve coordinator step for SWEN internship application letters.",
  },
  "training-report.review": {
    role: "coordinator",
    label: "Training reports (review)",
    description:
      "View SWEN300 training reports and request revisions. Final approval requires reports.review.",
  },
  // Company (same keys conflict with coordinator, so we key by "role:permission" in UI)
};

// Role'e göre anahtardan label döner (ortak anahtarlar için role context'i lazım)
export function getPermissionLabel(role: UserRole, permission: string): string {
  return PERMISSION_LABELS[role]?.[permission] ?? permission;
}

export function getPermissionDescription(role: UserRole, permission: string): string {
  return PERMISSION_DESCRIPTIONS[role]?.[permission] ?? "";
}

const PERMISSION_LABELS: Record<UserRole, Record<string, string>> = {
  student: {},
  admin: {},
  coordinator: {
    "applications.view": "View applications",
    "applications.review": "Review applications",
    "applications.comment": "Comment on applications",
    "applications.bulk": "Bulk actions on applications",
    "applications.internship.override": "Override internship dates",
    "students.view": "Monitor students",
    "companies.view": "View companies",
    "companies.add": "Add companies",
    "companies.approve": "Approve companies",
    "companies.edit": "Edit companies",
    "knowledge.view": "View knowledge base",
    "knowledge.manage": "Manage knowledge base",
    "reports.review": "Review final reports",
    "summer-letter.review": "Review application letters",
    "training-report.review": "Training reports (review)",
  },
  company: {
    "applications.view": "View applications",
    "applications.review": "Review applications",
    "applications.comment": "Comment on applications",
    "interns.view": "View interns",
    "logbook.view": "View logbook entries",
    "logbook.feedback": "Give logbook feedback",
    "reports.view": "View final reports",
    "reports.review": "Review final reports",
  },
};

const PERMISSION_DESCRIPTIONS: Record<UserRole, Record<string, string>> = {
  student: {},
  admin: {},
  coordinator: {
    "applications.view": "List incoming internship applications.",
    "applications.review": "Approve or reject internship applications.",
    "applications.comment": "Add notes or comments to applications.",
    "applications.bulk": "Approve/reject multiple applications at once.",
    "applications.internship.override":
      "Set or correct internship start/end dates without following the company confirmation flow.",
    "students.view": "Access the student monitoring list.",
    "companies.view": "Browse the companies list.",
    "companies.add": "Register new companies.",
    "companies.approve": "Mark companies as approved for internships.",
    "companies.edit": "Update existing company information.",
    "knowledge.view": "See knowledge base documents and FAQs.",
    "knowledge.manage": "Add, edit or remove knowledge base entries.",
    "reports.review": "Review and grade submitted internship reports.",
    "summer-letter.review": "Final approval step for SWEN internship application letters.",
    "training-report.review":
      "View SWEN300 training reports and request revisions. Final approval requires reports.review.",
  },
  company: {
    "applications.view": "See incoming applications for your company.",
    "applications.review": "Approve or reject incoming applications.",
    "applications.comment": "Add comments on applications.",
    "interns.view": "See the list of active interns.",
    "logbook.view": "See logbook entries from your interns.",
    "logbook.feedback": "Leave feedback on logbook entries.",
    "reports.view": "See final reports from your interns.",
    "reports.review": "Review and comment on final reports.",
  },
};

/** Kullanıcı belirli yetkiye sahip mi kontrol eder (admin her zaman true) */
export function hasPermission(user: Pick<User, "role" | "permissions"> | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return (user.permissions ?? []).includes(permission);
}

/** Birden fazla yetkiden en az birine sahip mi */
export function hasAnyPermission(
  user: Pick<User, "role" | "permissions"> | null | undefined,
  permissions: string[]
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const owned = user.permissions ?? [];
  return permissions.some((permission) => owned.includes(permission));
}
