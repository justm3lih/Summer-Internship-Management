import type { SummerTrainingLetterCourseRow } from "@/types";
import {
  SUMMER_LETTER_GRADE_EMPTY_SENTINEL,
  summerLetterGradeToSelectValue,
  summerLetterSelectValueToGrade,
} from "@/lib/summer-letter-grade-options";

/** API / Word ile uyumlu (SummerTrainingCurriculum). */
export const UNIFIED_REGISTERED_STAR = "*";
export const UNIFIED_REGISTERED_NOT_ENROLLED = "Not enrolled";
export const UNIFIED_REGISTERED_PREVIOUSLY_COMPLETED = "Previously completed";
const LEGACY_TR_REGISTERED = "Kayıtlı değilim";

export const UNIFIED_STATUS_NOT_ENROLLED_VALUE = "__course_not_enrolled__";

export function normalizeSummerLetterRegisteredUi(registered: string): string {
  if (registered === LEGACY_TR_REGISTERED) return UNIFIED_REGISTERED_NOT_ENROLLED;
  return registered.trim();
}

/** Tek sütun seçimi → JSON satırı (registered + grade). */
export function unifiedCourseSelectToRowFields(selectValue: string): Pick<
  SummerTrainingLetterCourseRow,
  "registered" | "grade"
> {
  if (!selectValue || selectValue === SUMMER_LETTER_GRADE_EMPTY_SENTINEL) {
    return { registered: "", grade: "" };
  }
  if (selectValue === UNIFIED_STATUS_NOT_ENROLLED_VALUE) {
    return { registered: UNIFIED_REGISTERED_NOT_ENROLLED, grade: "" };
  }
  if (selectValue === UNIFIED_REGISTERED_STAR) {
    return { registered: UNIFIED_REGISTERED_STAR, grade: UNIFIED_REGISTERED_STAR };
  }
  const grade = summerLetterSelectValueToGrade(selectValue);
  return {
    registered: UNIFIED_REGISTERED_PREVIOUSLY_COMPLETED,
    grade,
  };
}

/** Kayıtlı satır → tek Select value (legacy kombinasyonları tolere eder). */
export function summerLetterRowToUnifiedSelectValue(
  row: SummerTrainingLetterCourseRow,
  rowIndex: number
): string {
  const reg = normalizeSummerLetterRegisteredUi(row.registered);
  const g = row.grade.trim();

  if (reg === UNIFIED_REGISTERED_NOT_ENROLLED && !g) {
    return UNIFIED_STATUS_NOT_ENROLLED_VALUE;
  }

  if (g && g !== UNIFIED_REGISTERED_STAR) {
    return summerLetterGradeToSelectValue(g, rowIndex);
  }

  if (reg === UNIFIED_REGISTERED_STAR && (!g || g === UNIFIED_REGISTERED_STAR)) {
    return UNIFIED_REGISTERED_STAR;
  }

  if (!reg && !g) return SUMMER_LETTER_GRADE_EMPTY_SENTINEL;

  if (reg === UNIFIED_REGISTERED_PREVIOUSLY_COMPLETED && !g) {
    return SUMMER_LETTER_GRADE_EMPTY_SENTINEL;
  }

  return SUMMER_LETTER_GRADE_EMPTY_SENTINEL;
}

/** Danışman/koordinatör salt okunur tablo için tek metin. */
export function formatSummerLetterCourseRowSummary(row: SummerTrainingLetterCourseRow): string {
  const reg = normalizeSummerLetterRegisteredUi(row.registered);
  const g = row.grade.trim();

  if (reg === UNIFIED_REGISTERED_NOT_ENROLLED && !g) return "Not enrolled yet";

  if (reg === UNIFIED_REGISTERED_STAR && (!g || g === UNIFIED_REGISTERED_STAR)) {
    return "Taking this term (grade pending)";
  }

  if (g && g !== UNIFIED_REGISTERED_STAR) return g;

  if (reg && g) return `${reg} · ${g}`;
  if (reg) return reg;
  if (g) return g;
  return "—";
}
