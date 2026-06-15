import type { SummerTrainingLetterStatus } from "@/types";

export const APPLICATION_LETTER_STATUS_DESCRIPTION: Record<SummerTrainingLetterStatus, string> = {
  draft: "Draft — complete the course table, accept the terms, then submit to your advisor.",
  advisor_pending: "Waiting for advisor approval.",
  advisor_rejected: "Advisor rejected — update and submit again.",
  coordinator_pending: "Waiting for internship coordinator approval.",
  coordinator_rejected:
    "Coordinator rejected — update as needed and resubmit (goes to your advisor first again).",
  approved: "Approved — you may apply for an internship placement.",
};

/** Human-readable workflow line for the student application letter (SWEN period letter). */
export function describeApplicationLetterStatus(
  status: SummerTrainingLetterStatus | null | undefined,
  missing: "short" | "hint" = "hint"
): string {
  if (status == null) {
    return missing === "short"
      ? "Not started yet."
      : "Not started yet — open Application letter to fill your course table.";
  }
  return APPLICATION_LETTER_STATUS_DESCRIPTION[status];
}
