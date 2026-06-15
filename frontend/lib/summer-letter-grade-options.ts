/** Backend <see cref="ThirdYearEligibilityEvaluator.PassingGrades"/> ile aynı küme (geçen sayımı). */
export const SUMMER_LETTER_PASSING_GRADES = [
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
] as const;

/** Dropdown’da gösterilen ek notlar (geçmeyen / bekleyen). */
export const SUMMER_LETTER_OTHER_GRADE_VALUES = ["F", "FF", "FX", "*"] as const;

export const SUMMER_LETTER_GRADE_EMPTY_SENTINEL = "__grade_none__";

export const SUMMER_LETTER_GRADE_SELECT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  ...SUMMER_LETTER_PASSING_GRADES.map((g) => ({ value: g, label: g })),
  ...SUMMER_LETTER_OTHER_GRADE_VALUES.map((g) =>
    g === "*" ? { value: "*", label: "* (pending)" } : { value: g, label: g },
  ),
];

/** Birleşik course seçiminde * yalnız “bu dönem / bekleyen” grubunda; harf notları burada (pending hariç). */
export const SUMMER_LETTER_TRANSCRIPT_GRADE_OPTIONS = SUMMER_LETTER_GRADE_SELECT_OPTIONS.filter(
  (o) => o.value !== "*"
);

const selectableSet = new Set(
  SUMMER_LETTER_GRADE_SELECT_OPTIONS.map((o) => o.value),
);

export function isSelectableSummerLetterGrade(grade: string): boolean {
  return selectableSet.has(grade.trim());
}

/** Listedeki olmayan kayıtlı not → Select value (satır indeksi + encode). */
export function summerLetterLegacyGradeSelectValue(rowIndex: number, grade: string): string {
  return `__legacy_${rowIndex}_${encodeURIComponent(grade.trim())}`;
}

export function summerLetterGradeToSelectValue(grade: string, rowIndex: number): string {
  const g = grade.trim();
  if (!g) return SUMMER_LETTER_GRADE_EMPTY_SENTINEL;
  if (selectableSet.has(g)) return g;
  return summerLetterLegacyGradeSelectValue(rowIndex, g);
}

export function parseSummerLetterLegacySelectValue(value: string): string | null {
  const prefix = "__legacy_";
  if (!value.startsWith(prefix)) return null;
  const rest = value.slice(prefix.length);
  const underscore = rest.indexOf("_");
  if (underscore < 0) return null;
  const encoded = rest.slice(underscore + 1);
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

export function summerLetterSelectValueToGrade(selectValue: string): string {
  if (selectValue === SUMMER_LETTER_GRADE_EMPTY_SENTINEL) return "";
  const legacy = parseSummerLetterLegacySelectValue(selectValue);
  if (legacy !== null) return legacy;
  return selectValue;
}
