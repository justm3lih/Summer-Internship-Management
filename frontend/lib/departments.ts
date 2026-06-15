import { getPublicAppSettings } from "./api";

const STUDENT_DEPTS_KEY = "student.departments";

/** App setting JSON dizesini diziye çevirir */
export function parseDepartmentsSetting(json: string | undefined | null): string[] {
  if (!json?.trim()) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => (typeof x === "string" ? x.trim() : String(x).trim()))
      .filter((s) => s.length > 0);
  } catch {
    return [];
  }
}

/**
 * Giriş gerektirmez. Kayıt / filtre / select için güncel bölüm listesi.
 * `mergeWith` mevcut değer listede yoksa (eski veri) seçeneklere bir kez ekler.
 */
export async function fetchStudentDepartments(mergeWith?: string | null): Promise<string[]> {
  const data = await getPublicAppSettings();
  const list = parseDepartmentsSetting(data[STUDENT_DEPTS_KEY]);
  const m = mergeWith?.trim();
  if (m && !list.some((d) => d.toLowerCase() === m.toLowerCase())) {
    return [m, ...list];
  }
  return list;
}
