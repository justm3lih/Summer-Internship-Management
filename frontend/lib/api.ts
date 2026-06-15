import type {
  AcceptanceLetterPortalOverrides,
  AcceptanceLetterPortalSession,
  Application,
  AdminDashboardSummary,
  Company,
  CompanyDashboardSummary,
  CompanyIntern,
  CoordinatorDashboardSummary,
  CoordinatorStudentMonitoring,
  FinalReport,
  LogbookEntry,
  LogbookWeeklyApproval,
  LogbookCoordinatorRow,
  ManagedUser,
  PermissionCatalog,
  StaffRoleDefinition,
  StudentDashboardSummary,
  StudentNotification,
  StudentPlacementSummary,
  SummerTrainingLetterCourseRow,
  SummerTrainingLetterDetail,
  SummerTrainingLetterQueueItem,
  SummerTrainingLetterStatus,
  TrainingReportContentPayload,
  TrainingReportDetail,
  TrainingReportEligibility,
  TrainingReportPendingRow,
  User,
  UserRole,
} from "@/types";

// Backend API adresi: .env.local içindeki NEXT_PUBLIC_API_URL veya varsayılan 5004
export const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5004";
const withCreds: RequestCredentials = "include";

export type FileCategory =
  | "cv"
  | "motivation_letter"
  | "transcript"
  | "logbook"
  | "report"
  | "acceptance_letter"
  | "training_report_figure"
  | "other";

export interface UploadedFileInfo {
  id: string;
  url: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  category: FileCategory;
}

/** Bir dosyayı backend'e yükler ve metadata'sını döndürür. Dönen url'i indirme için kullanabilirsin. */
export async function uploadFile(
  file: File,
  category: FileCategory = "other"
): Promise<{ success: true; file: UploadedFileInfo } | { success: false; message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  const res = await fetch(`${getApiUrl()}/api/files/upload`, {
    method: "POST",
    credentials: withCreds,
    body: formData,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "File could not be uploaded." };
  }

  return {
    success: true,
    file: {
      id: body.id as string,
      url: body.url as string,
      originalName: body.originalName as string,
      contentType: body.contentType as string,
      sizeBytes: body.sizeBytes as number,
      category: body.category as FileCategory,
    },
  };
}

/**
 * Backend'in döndürdüğü göreceli URL'yi (örn. /api/files/{id}) tam URL'ye çevirir.
 * Yetki kontrolü cookie ile yapıldığı için indirme/açma işlemi credentials gerektirmez
 * sürece tarayıcı aynı origin'de değilse — bu yüzden indirme için fetch + blob kullanmayı tercih et.
 */
export function buildFileUrl(relativeUrl: string | null | undefined): string {
  if (!relativeUrl) return "";
  if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
  return `${getApiUrl()}${relativeUrl}`;
}

export interface ChatSource {
  id: string;
  title: string;
  category: string;
}

/** Knowledge base destekli AI asistana soru sorar */
export async function askAiAssistant(
  message: string
): Promise<
  | { success: true; answer: string; sources: ChatSource[] }
  | { success: false; message: string }
> {
  const res = await fetch(`${getApiUrl()}/api/chat`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      message: (body.message as string) || "Could not get a response from the AI assistant.",
    };
  }

  return {
    success: true,
    answer: body.answer as string,
    sources: ((body.sources as Array<Record<string, unknown>>) ?? []).map((source) => ({
      id: source.id as string,
      title: source.title as string,
      category: source.category as string,
    })),
  };
}

/** Cookie ile kimlik doğrulayarak dosyayı indirir ve tarayıcıda açar. */
export async function openProtectedFile(relativeUrl: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(buildFileUrl(relativeUrl), { credentials: withCreds });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        success: false,
        message: (body.message as string) || `Could not open file (${res.status}).`,
      };
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not open file.",
    };
  }
}

/** E-posta ve şifre ile giriş; başarılıysa kullanıcı bilgisi, değilse null döner */
export async function login(email: string, password: string): Promise<User | null> {
  const res = await fetch(`${getApiUrl()}/api/auth/login`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) return null;  // 401 vb. durumda null

  const data = await res.json();
  return {
    id: data.id as string,
    email: data.email as string,
    name: data.name as string,
    role: data.role as User["role"],
    studentId: data.studentId,
    department: data.department,
    currentSemester: data.currentSemester,
    cgpa: data.cgpa,
    homeAddress: data.homeAddress,
    homeTelephone: data.homeTelephone,
    mobileTelephone: data.mobileTelephone,
    addressNorthCyprus: data.addressNorthCyprus,
    photo: data.photo,
    eligibilityStatus: data.eligibilityStatus,
    passedThirdYearCourses: data.passedThirdYearCourses,
    requiredThirdYearCourses: data.requiredThirdYearCourses,
    transcriptVerifiedAt: data.transcriptVerifiedAt,
    permissions: Array.isArray(data.permissions) ? (data.permissions as string[]) : [],
    companyId: data.companyId as string | undefined,
    companyMembershipTier: data.companyMembershipTier as User["companyMembershipTier"],
    managedByCompanyUserId: data.managedByCompanyUserId as string | undefined,
    coordinatorPortal: data.coordinatorPortal === true,
    advisorUserId: data.advisorUserId as string | undefined,
  };
}

export type RegisterResult = { success: true; user: User } | { success: false; message: string };

/** Yeni öğrenci kaydı; başarılıysa user ile, hata varsa message ile döner */
export async function register(data: {
  studentId: string;
  email: string;
  name: string;
  department: string;
  password: string;
}): Promise<RegisterResult> {
  const res = await fetch(`${getApiUrl()}/api/auth/register`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { success: false, message: body.message || "Registration failed." };
  }

  // Başarılı yanıttan kullanıcı nesnesini oluştur
  const user: User = {
    id: body.id,
    email: body.email,
    name: body.name,
    role: body.role as User["role"],
    studentId: body.studentId,
    department: body.department,
    currentSemester: body.currentSemester,
    cgpa: typeof body.cgpa === "number" ? body.cgpa : undefined,
    homeAddress: body.homeAddress as string | undefined,
    homeTelephone: body.homeTelephone as string | undefined,
    mobileTelephone: body.mobileTelephone as string | undefined,
    addressNorthCyprus: body.addressNorthCyprus as string | undefined,
    photo: body.photo,
    eligibilityStatus: body.eligibilityStatus,
    passedThirdYearCourses: body.passedThirdYearCourses,
    requiredThirdYearCourses: body.requiredThirdYearCourses,
    transcriptVerifiedAt: body.transcriptVerifiedAt,
    permissions: Array.isArray(body.permissions) ? (body.permissions as string[]) : [],
    companyId: body.companyId as string | undefined,
    companyMembershipTier: body.companyMembershipTier as User["companyMembershipTier"],
    managedByCompanyUserId: body.managedByCompanyUserId as string | undefined,
    coordinatorPortal: body.coordinatorPortal === true,
    advisorUserId: body.advisorUserId as string | undefined,
  };
  return { success: true, user };
}

/** API'den gelen ham objeyi User tipine çevirir */
function mapUser(data: Record<string, unknown>): User {
  return {
    id: data.id as string,
    email: data.email as string,
    name: data.name as string,
    role: data.role as User["role"],
    studentId: data.studentId as string | undefined,
    department: data.department as string | undefined,
    currentSemester: data.currentSemester as number | undefined,
    cgpa: typeof data.cgpa === "number" ? data.cgpa : undefined,
    homeAddress: data.homeAddress as string | undefined,
    homeTelephone: data.homeTelephone as string | undefined,
    mobileTelephone: data.mobileTelephone as string | undefined,
    addressNorthCyprus: data.addressNorthCyprus as string | undefined,
    photo: data.photo as string | undefined,
    eligibilityStatus: data.eligibilityStatus as User["eligibilityStatus"],
    passedThirdYearCourses: data.passedThirdYearCourses as number | undefined,
    requiredThirdYearCourses: data.requiredThirdYearCourses as number | undefined,
    transcriptVerifiedAt: data.transcriptVerifiedAt as string | undefined,
    thirdYearCourseGradesJson: data.thirdYearCourseGradesJson as string | undefined,
    permissions: Array.isArray(data.permissions) ? (data.permissions as string[]) : [],
    companyId: data.companyId as string | undefined,
    companyMembershipTier: data.companyMembershipTier as User["companyMembershipTier"],
    managedByCompanyUserId: data.managedByCompanyUserId as string | undefined,
    coordinatorPortal: data.coordinatorPortal === true,
    advisorUserId: data.advisorUserId as string | undefined,
  };
}

/** Admin panelinde listelenen kullanıcıyı haritalar */
function mapManagedUser(data: Record<string, unknown>): ManagedUser {
  return {
    id: data.id as string,
    email: data.email as string,
    name: data.name as string,
    role: data.role as UserRole,
    studentId: data.studentId as string | undefined,
    department: data.department as string | undefined,
    companyId: (data.companyId as string | undefined) ?? undefined,
    permissions: Array.isArray(data.permissions) ? (data.permissions as string[]) : [],
  };
}

/** API'den gelen ham company objesini Company tipine çevirir */
function mapCompany(data: Record<string, unknown>): Company {
  return {
    id: data.id as string,
    name: data.name as string,
    sector: (data.sector as string) ?? "",
    address: (data.address as string | undefined) ?? "",
    location: (data.location as string) ?? "",
    fieldsOfWork: (data.fieldsOfWork as string | undefined) ?? "",
    description: (data.description as string) ?? "",
    phone: (data.phone as string | undefined) ?? "",
    fax: (data.fax as string | undefined) ?? "",
    contactEmail: (data.contactEmail as string | undefined) ?? "",
    website: (data.website as string | undefined) ?? "",
    positionsOffered: data.positionsOffered as number,
    remainingPositions: (data.remainingPositions as number) ?? (data.positionsOffered as number) ?? 0,
    averageRating: data.averageRating as number | undefined,
    approved: data.approved as boolean,
    hasPortalUser: data.hasPortalUser === true,
  };
}

function parseSupervisorProgramOutcomeScores(
  data: Record<string, unknown>
): (number | null)[] | undefined {
  const raw = data.supervisorProgramOutcomeScores;
  if (!Array.isArray(raw) || raw.length !== 11) return undefined;
  const out: (number | null)[] = [];
  for (let i = 0; i < 11; i++) {
    const v = raw[i];
    if (v === null || v === undefined) {
      out.push(null);
      continue;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      const n = Math.trunc(v);
      if (n >= 0 && n <= 4) out.push(n);
      else return undefined;
    } else return undefined;
  }
  return out;
}

function parseTraineeSummerSelfEvaluationScores(
  data: Record<string, unknown>
): (number | null)[] | undefined {
  const raw = data.traineeSummerSelfEvaluationScores;
  if (!Array.isArray(raw) || raw.length !== 12) return undefined;
  const out: (number | null)[] = [];
  for (let i = 0; i < 12; i++) {
    const v = raw[i];
    if (v === null || v === undefined) {
      out.push(null);
      continue;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      const n = Math.trunc(v);
      if (n >= 0 && n <= 4) out.push(n);
      else return undefined;
    } else return undefined;
  }
  return out;
}

/** API'den gelen ham application objesini Application tipine çevirir */
function mapApplication(data: Record<string, unknown>): Application {
  const documents = (data.documents as Record<string, unknown> | undefined) ?? {};
  const student = data.student as Record<string, unknown> | undefined;
  const company = data.company as Record<string, unknown> | undefined;

  const parseOptionalIsoDate = (v: unknown): Date | undefined => {
    if (v == null || v === "") return undefined;
    const d = new Date(v as string);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  return {
    id: data.id as string,
    studentId: data.studentId as string,
    companyId: data.companyId as string,
    status: data.status as Application["status"],
    appliedDate: new Date(data.appliedDate as string),
    documents: {
      cv: documents.cv as string | undefined,
      motivationLetter: documents.motivationLetter as string | undefined,
      transcript: documents.transcript as string | undefined,
    },
    coordinatorComments: data.coordinatorComments as string | undefined,
    companyComments: data.companyComments as string | undefined,
    companySupervisorUserId: (data.companySupervisorUserId as string | null | undefined) ?? undefined,
    companySupervisorName: (data.companySupervisorName as string | null | undefined) ?? undefined,
    traineeJobTitle: (data.traineeJobTitle as string | undefined) ?? undefined,
    traineeJobOwnWords: (data.traineeJobOwnWords as string | undefined) ?? undefined,
    supervisorTitle: (data.supervisorTitle as string | undefined) ?? undefined,
    traineeDepartmentOrDivision: (data.traineeDepartmentOrDivision as string | undefined) ?? undefined,
    supervisorDepartmentOrDivision:
      (data.supervisorDepartmentOrDivision as string | undefined) ?? undefined,
    supervisorSpecialty: (data.supervisorSpecialty as string | undefined) ?? undefined,
    supervisorAcademicDegrees: (data.supervisorAcademicDegrees as string | undefined) ?? undefined,
    supervisorGraduatedUniversity:
      (data.supervisorGraduatedUniversity as string | undefined) ?? undefined,
    supervisorGraduationYear: (data.supervisorGraduationYear as string | undefined) ?? undefined,
    supervisorYearsInCompany: (data.supervisorYearsInCompany as string | undefined) ?? undefined,
    supervisorYearsExperience: (data.supervisorYearsExperience as string | undefined) ?? undefined,
    supervisorOverallPerformanceObservations:
      (data.supervisorOverallPerformanceObservations as string | undefined) ?? undefined,
    supervisorSuggestionsToUniversityAboutTrainee:
      (data.supervisorSuggestionsToUniversityAboutTrainee as string | undefined) ?? undefined,
    supervisorProgramOutcomeScores: parseSupervisorProgramOutcomeScores(data),
    traineeSummerSelfEvaluationScores: parseTraineeSummerSelfEvaluationScores(data),
    internshipStartDate: parseOptionalIsoDate(data.internshipStartDate),
    internshipEndDate: parseOptionalIsoDate(data.internshipEndDate),
    logbookSubmittedToSupervisorAt: parseOptionalIsoDate(data.logbookSubmittedToSupervisorAt),
    supervisorEvaluationCompletedAt: parseOptionalIsoDate(data.supervisorEvaluationCompletedAt),
    logbookSubmittedForCoordinatorReviewAt: parseOptionalIsoDate(
      data.logbookSubmittedForCoordinatorReviewAt
    ),
    logbookVerifiedByCoordinatorAt: parseOptionalIsoDate(data.logbookVerifiedByCoordinatorAt),
    acceptanceLetterUrl: (data.acceptanceLetterUrl as string | undefined) ?? undefined,
    acceptanceLetterPortalSaved: Boolean(data.acceptanceLetterPortalSaved),
    acceptanceLetterSubmittedAt: parseOptionalIsoDate(data.acceptanceLetterSubmittedAt),
    acceptanceLetterVerifiedAt: parseOptionalIsoDate(data.acceptanceLetterVerifiedAt),
    acceptanceLetterCoordinatorComments:
      (data.acceptanceLetterCoordinatorComments as string | undefined) ?? undefined,
    coordinatorPlacementApprovedAt: parseOptionalIsoDate(data.coordinatorPlacementApprovedAt),
    companyPlacementApprovedAt: parseOptionalIsoDate(data.companyPlacementApprovedAt),
    student: student ? mapUser(student) : undefined,
    company: company ? mapCompany(company) : undefined,
  };
}

/** API'den gelen ham notification objesini StudentNotification tipine çevirir */
function mapStudentNotification(data: Record<string, unknown>): StudentNotification {
  return {
    id: data.id as string,
    title: data.title as string,
    message: data.message as string,
    type: data.type as StudentNotification["type"],
    date: new Date(data.date as string),
    read: data.read as boolean,
  };
}

/** Aktif oturumdaki kullanıcıyı döndürür (cookie tabanlı) */
export async function getMe(): Promise<User | null> {
  const res = await fetch(`${getApiUrl()}/api/auth/me`, {
    credentials: withCreds,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return mapUser(data);
}

/** Aktif oturumu kapatır */
export async function logout(): Promise<void> {
  await fetch(`${getApiUrl()}/api/auth/logout`, {
    method: "POST",
    credentials: withCreds,
  });
}

/** Kullanıcı id'sine göre profil bilgisini API'den alır (GET /api/users/{id}) */
export async function getProfile(userId: string): Promise<User | null> {
  const res = await fetch(`${getApiUrl()}/api/users/${userId}`, {
    credentials: withCreds,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return mapUser(data);
}

export type UpdateProfileResult = { success: true; user: User } | { success: false; message: string };

/** Profil güncelle (ad, e-posta, öğrenci no, bölüm, dönem, fotoğraf) - PATCH /api/users/{id} */
export async function updateProfile(
  userId: string,
  data: {
    name?: string;
    email?: string;
    studentId?: string;
    department?: string;
    currentSemester?: number;
    cgpa?: number | null;
    homeAddress?: string | null;
    homeTelephone?: string | null;
    mobileTelephone?: string | null;
    addressNorthCyprus?: string | null;
    photo?: string;
    eligibilityStatus?: User["eligibilityStatus"];
    passedThirdYearCourses?: number;
    requiredThirdYearCourses?: number;
    transcriptVerifiedAt?: string;
    /** Boş string ile transcript notlarını temizle */
    thirdYearCourseGradesJson?: string | null;
    advisorUserId?: string | null;
  }
): Promise<UpdateProfileResult> {
  const res = await fetch(`${getApiUrl()}/api/users/${userId}`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: (body.message as string) || "Update failed." };
  return { success: true, user: mapUser(body) };
}

/** Şifre değiştir (mevcut + yeni şifre) - POST /api/users/{id}/change-password */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/users/${userId}/change-password`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: (body.message as string) || "Password update failed." };
  return { success: true, message: (body.message as string) || "Password updated." };
}

/** Coordinator için tüm başvuruları getirir */
export async function getCoordinatorApplications(): Promise<Application[]> {
  const res = await fetch(`${getApiUrl()}/api/applications/coordinator`, {
    credentials: withCreds,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map(mapApplication);
}

/** Coordinator başvurunun durumunu veya yorumunu günceller */
export async function reviewCoordinatorApplication(
  applicationId: string,
  data: {
    status?: "pending" | "approved" | "rejected";
    coordinatorComments?: string;
    traineeJobTitle?: string;
    supervisorTitle?: string;
    traineeDepartmentOrDivision?: string;
    supervisorDepartmentOrDivision?: string;
    supervisorSpecialty?: string;
    supervisorAcademicDegrees?: string;
    supervisorGraduatedUniversity?: string;
    supervisorGraduationYear?: string;
    supervisorYearsInCompany?: string;
    supervisorYearsExperience?: string;
    supervisorProgramOutcomeScores?: (number | null)[];
    supervisorOverallPerformanceObservations?: string;
    supervisorSuggestionsToUniversityAboutTrainee?: string;
    patchInternshipDates?: boolean;
    internshipStartDate?: string | null;
    internshipEndDate?: string | null;
  }
): Promise<{ success: true; application: Application } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/applications/${applicationId}/coordinator-review`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Application update failed." };
  }

  return { success: true, application: mapApplication(body as Record<string, unknown>) };
}

/** Coordinator monitoring ekranı için öğrenci özetlerini getirir */
export async function getCoordinatorMonitoring(): Promise<CoordinatorStudentMonitoring[]> {
  const res = await fetch(`${getApiUrl()}/api/applications/coordinator/monitoring`, { credentials: withCreds });
  if (!res.ok) return [];
  return res.json();
}

/** Koordinatör portalı: Öğrenci bazlı filtreleme/monitoring (V2 - Daha detaylı) */
export async function getCoordinatorMonitoringV2(): Promise<any[]> {
  const res = await fetch(`${getApiUrl()}/api/applications/coordinator/monitoring`, { credentials: withCreds });
  if (!res.ok) return [];
  return res.json();
}

export async function getCoordinatorMonitoringRaw(): Promise<CoordinatorStudentMonitoring[]> {
  const res = await fetch(`${getApiUrl()}/api/applications/coordinator/monitoring`, {
    credentials: withCreds,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map((item) => {
    const latestApplication = item.latestApplication as Record<string, unknown> | null | undefined;

    return {
      id: item.id as string,
      email: item.email as string,
      name: item.name as string,
      studentId: item.studentId as string | undefined,
      department: item.department as string | undefined,
      currentSemester: item.currentSemester as number | undefined,
      eligibilityStatus: item.eligibilityStatus as CoordinatorStudentMonitoring["eligibilityStatus"],
      internshipStatus: item.internshipStatus as CoordinatorStudentMonitoring["internshipStatus"],
      logbookEntriesCount: item.logbookEntriesCount as number,
      reportStatus: item.reportStatus as FinalReport["status"],
      advisorUserId: item.advisorUserId as string | undefined,
      summerTrainingLetterStatus:
        typeof item.summerTrainingLetterStatus === "string"
          ? (item.summerTrainingLetterStatus as CoordinatorStudentMonitoring["summerTrainingLetterStatus"])
          : item.summerTrainingLetterStatus === null
            ? null
            : undefined,
      latestApplication: latestApplication ? mapApplication(latestApplication) : null,
    };
  });
}

/** Öğrenci için onaylı şirketleri getirir */
export async function getApprovedCompanies(): Promise<Company[]> {
  const res = await fetch(`${getApiUrl()}/api/companies`, {
    credentials: withCreds,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map(mapCompany);
}

/** Coordinator için tüm şirketleri (onaylı + pending) getirir */
export async function getAllCompaniesForCoordinator(): Promise<Company[]> {
  const res = await fetch(`${getApiUrl()}/api/companies/coordinator`, {
    credentials: withCreds,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map(mapCompany);
}

export interface CompanyUpsertInput {
  name: string;
  sector?: string;
  address?: string;
  location?: string;
  fieldsOfWork?: string;
  description?: string;
  phone?: string;
  fax?: string;
  contactEmail?: string;
  website?: string;
  positionsOffered?: number;
  approved?: boolean;
}

/** Coordinator/admin yeni şirket ekler */
export async function createCompany(
  input: CompanyUpsertInput
): Promise<{ success: true; company: Company } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/companies`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Company could not be created." };
  }

  return { success: true, company: mapCompany(body as Record<string, unknown>) };
}

/** Koordinatör/admin: şirket için portal (company role) giriş hesabı oluşturur */
export async function createCompanyPortalUser(
  companyId: string,
  input: { email: string; name: string; password: string }
): Promise<
  { success: true; userId: string; email: string } | { success: false; message: string }
> {
  const res = await fetch(`${getApiUrl()}/api/companies/${companyId}/portal-user`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Portal user could not be created." };
  }
  return {
    success: true,
    userId: body.id as string,
    email: body.email as string,
  };
}

/** Coordinator/admin şirket bilgilerini günceller */
export async function updateCompany(
  id: string,
  input: Partial<CompanyUpsertInput>
): Promise<{ success: true; company: Company } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/companies/${id}`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Company could not be updated." };
  }

  return { success: true, company: mapCompany(body as Record<string, unknown>) };
}

/** Coordinator/admin şirket onay durumunu değiştirir */
export async function setCompanyApproval(
  id: string,
  approved: boolean
): Promise<{ success: true; company: Company } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/companies/${id}/approval`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Approval state could not be changed." };
  }

  return { success: true, company: mapCompany(body as Record<string, unknown>) };
}

/** Coordinator/admin bir şirketi siler (başvurusu yoksa) */
export async function deleteCompany(
  id: string
): Promise<{ success: true } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/companies/${id}`, {
    method: "DELETE",
    credentials: withCreds,
  });

  if (res.status === 204) {
    return { success: true };
  }

  const body = await res.json().catch(() => ({}));
  return { success: false, message: (body.message as string) || "Company could not be deleted." };
}

/** Öğrencinin kendi başvurularını getirir */
export async function getMyApplications(): Promise<Application[]> {
  const res = await fetch(`${getApiUrl()}/api/applications/my`, {
    credentials: withCreds,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map(mapApplication);
}

/** Öğrenci yeni başvuru oluşturur */
export async function createApplication(data: {
  companyId: string;
  cvFileId: string;
  motivationLetterFileId: string;
  transcriptFileId: string;
  proposedCompany?: any;
  internshipStartDate?: string;
  internshipEndDate?: string;
  supervisorName?: string;
  supervisorEmail?: string;
  supervisorTitle?: string;
}): Promise<{ success: true; application: Application } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/applications`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Application submission failed." };
  }

  return { success: true, application: mapApplication(body as Record<string, unknown>) };
}

/** Koordinatör acceptance letter doğrular veya doğrulamayı kaldırır */
export async function patchCoordinatorAcceptanceLetterVerification(
  applicationId: string,
  data: { verified: boolean; coordinatorComments?: string }
): Promise<{ success: true; application: Application } | { success: false; message: string }> {
  const res = await fetch(
    `${getApiUrl()}/api/applications/${applicationId}/acceptance-letter-verification`,
    {
      method: "PATCH",
      credentials: withCreds,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      message: (body.message as string) || "Verification could not be updated.",
    };
  }

  return { success: true, application: mapApplication(body as Record<string, unknown>) };
}

export function emptyTrainingReportContent(): TrainingReportContentPayload {
  return {
    introduction: "",
    introductionSections: [],
    companyIntro: "",
    company21: "",
    company22: "",
    companySections: [],
    workExperienceIntro: "",
    problemDefinition: "",
    workDoneIntro: "",
    task1Title: "Task1",
    task1Body: "",
    task2Title: "Task2",
    task2Body: "",
    workExperienceSections: [],
    limitations: "",
    recentTopics: "",
    conclusion: "",
    conclusionSections: [],
    appendix: "",
    references: [],
  };
}

function mapTrainingReportContent(raw: Record<string, unknown> | undefined): TrainingReportContentPayload {
  const e = emptyTrainingReportContent();
  if (!raw) return e;
  const pickStr = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "");
  const pickSections = (k: string) =>
    Array.isArray(raw[k])
      ? (raw[k] as any[]).map((x) => ({
          outlineNumber: typeof x.outlineNumber === "string" ? x.outlineNumber : "",
          title: typeof x.title === "string" ? x.title : "",
          body: typeof x.body === "string" ? x.body : "",
        }))
      : [];
  const refs = raw.references;
  return {
    introduction: pickStr("introduction") || e.introduction,
    introductionSections: pickSections("introductionSections"),
    companyIntro: pickStr("companyIntro"),
    company21: pickStr("company21"),
    company22: pickStr("company22"),
    companySections: pickSections("companySections"),
    workExperienceIntro: pickStr("workExperienceIntro"),
    problemDefinition: pickStr("problemDefinition"),
    workDoneIntro: pickStr("workDoneIntro"),
    task1Title: pickStr("task1Title") || e.task1Title,
    task1Body: pickStr("task1Body"),
    task2Title: pickStr("task2Title") || e.task2Title,
    task2Body: pickStr("task2Body"),
    workExperienceSections: pickSections("workExperienceSections"),
    limitations: pickStr("limitations"),
    recentTopics: pickStr("recentTopics"),
    conclusion: pickStr("conclusion"),
    conclusionSections: pickSections("conclusionSections"),
    appendix: pickStr("appendix"),
    references: Array.isArray(refs)
      ? refs.filter((x): x is string => typeof x === "string")
      : [],
  };
}

function mapTrainingReport(body: Record<string, unknown>): TrainingReportDetail {
  const figuresRaw = body.figures;
  const figures: TrainingReportDetail["figures"] = Array.isArray(figuresRaw)
    ? (figuresRaw as Record<string, unknown>[]).map((f) => ({
        id: String(f.id ?? ""),
        fileId: String(f.fileId ?? ""),
        url: String(f.url ?? ""),
        caption: typeof f.caption === "string" ? f.caption : "",
        sortOrder: typeof f.sortOrder === "number" ? f.sortOrder : 0,
      }))
    : [];

  return {
    id: String(body.id ?? ""),
    applicationId: String(body.applicationId ?? ""),
    status: (body.status as TrainingReportDetail["status"]) ?? "draft",
    content: mapTrainingReportContent(body.content as Record<string, unknown> | undefined),
    coordinatorFeedback: typeof body.coordinatorFeedback === "string" ? body.coordinatorFeedback : null,
    submittedAt: typeof body.submittedAt === "string" ? body.submittedAt : null,
    approvedAt: typeof body.approvedAt === "string" ? body.approvedAt : null,
    updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : null,
    companyName: typeof body.companyName === "string" ? body.companyName : null,
    figures,
  };
}

export async function getTrainingReportEligibility(): Promise<TrainingReportEligibility> {
  const res = await fetch(`${getApiUrl()}/api/training-reports/eligibility`, {
    credentials: withCreds,
    cache: "no-store",
  });
  if (!res.ok) {
    return {
      eligible: false,
      checks: {
        applicationApproved: false,
        acceptanceLetterVerified: false,
        logbookSubmittedToSupervisor: false,
        supervisorEvaluationDone: false,
        logbookSubmittedForCoordinator: false,
        coordinatorLogbookVerified: false,
      },
    };
  }
  return res.json();
}

export async function getMyTrainingReport(): Promise<
  { success: true; report: TrainingReportDetail } | { success: false; message: string }
> {
  const res = await fetch(`${getApiUrl()}/api/training-reports/me`, {
    credentials: withCreds,
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not load training report." };
  }
  return { success: true, report: mapTrainingReport(body as Record<string, unknown>) };
}

export async function updateTrainingReportContent(
  reportId: string,
  content: TrainingReportContentPayload
): Promise<{ success: true; report: TrainingReportDetail } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/training-reports/${reportId}/content`, {
    method: "PUT",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not save." };
  }
  return { success: true, report: mapTrainingReport(body as Record<string, unknown>) };
}

export async function addTrainingReportFigure(
  reportId: string,
  fileId: string,
  caption?: string
): Promise<{ success: true; report: TrainingReportDetail } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/training-reports/${reportId}/figures`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId, caption }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not attach figure." };
  }
  return { success: true, report: mapTrainingReport(body as Record<string, unknown>) };
}

export async function deleteTrainingReportFigure(
  reportId: string,
  figureId: string
): Promise<{ success: true; report: TrainingReportDetail } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/training-reports/${reportId}/figures/${figureId}`, {
    method: "DELETE",
    credentials: withCreds,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not delete figure." };
  }
  return { success: true, report: mapTrainingReport(body as Record<string, unknown>) };
}

export async function submitTrainingReport(
  reportId: string
): Promise<{ success: true; report: TrainingReportDetail } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/training-reports/${reportId}/submit`, {
    method: "POST",
    credentials: withCreds,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Submit failed." };
  }
  return { success: true, report: mapTrainingReport(body as Record<string, unknown>) };
}

export async function downloadTrainingReportWord(
  reportId: string
): Promise<{ success: true } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/training-reports/${reportId}/export-word`, {
    credentials: withCreds,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      success: false,
      message: (body.message as string) || "Word export failed.",
    };
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  let fileName = "SWEN300_training_report.docx";
  if (disposition) {
    const utf8Match = /filename\*=UTF-8''([^;\n]+)/i.exec(disposition);
    if (utf8Match?.[1]) {
      try {
        fileName = decodeURIComponent(utf8Match[1]);
      } catch {
        fileName = utf8Match[1];
      }
    } else {
      const fnMatch = /filename="?([^";\n]+)"?/i.exec(disposition);
      if (fnMatch?.[1]) fileName = fnMatch[1];
    }
  }
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
  return { success: true };
}

export async function getCoordinatorTrainingReportAll(): Promise<TrainingReportPendingRow[]> {
  const res = await fetch(`${getApiUrl()}/api/training-reports/coordinator/all`, {
    credentials: withCreds,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Record<string, unknown>[];
  return data.map((row) => ({
    id: String(row.id ?? ""),
    status: row.status as TrainingReportPendingRow["status"],
    submittedAt: typeof row.submittedAt === "string" ? row.submittedAt : undefined,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : undefined,
    studentId: String(row.studentId ?? ""),
    studentName: String(row.studentName ?? ""),
    studentNumber: typeof row.studentNumber === "string" ? row.studentNumber : null,
    companyName: String(row.companyName ?? ""),
    applicationId: String(row.applicationId ?? ""),
  }));
}


export async function getTrainingReportById(id: string): Promise<
  { success: true; report: TrainingReportDetail & { studentName?: string; studentNumber?: string } } | { success: false; message: string }
> {
  const res = await fetch(`${getApiUrl()}/api/training-reports/${id}`, {
    credentials: withCreds,
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: body.message || "Could not fetch report details." };
  return { success: true, report: mapTrainingReport(body as Record<string, unknown>) as any };
}


export async function requestTrainingReportRevision(
  reportId: string,
  feedback: string
): Promise<{ success: true } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/training-reports/${reportId}/request-revision`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not request revision." };
  }
  return { success: true };
}

export async function approveTrainingReport(
  reportId: string
): Promise<{ success: true } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/training-reports/${reportId}/approve`, {
    method: "PATCH",
    credentials: withCreds,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not approve." };
  }
  return { success: true };
}

export async function updateTrainingReportFeedback(
  reportId: string,
  feedback: string
): Promise<{ success: true; feedback: string | null } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/training-reports/${reportId}/feedback`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not save feedback." };
  }
  return { success: true, feedback: body.feedback as string | null };
}

/** Öğrenci pending başvurusunu geri çeker */
export async function withdrawApplication(
  applicationId: string
): Promise<{ success: true; application: Application } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/applications/${applicationId}/withdraw`, {
    method: "POST",
    credentials: withCreds,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Withdraw failed." };
  }

  return { success: true, application: mapApplication(body as Record<string, unknown>) };
}

/** Şirket hesabı için başvuruları getirir */
export async function getCompanyApplications(): Promise<Application[]> {
  const res = await fetch(`${getApiUrl()}/api/applications/company`, {
    credentials: withCreds,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map(mapApplication);
}

/** Şirket başvuru durumunu veya yorumunu günceller */
export async function reviewCompanyApplication(
  applicationId: string,
  data: {
    status?: "approved" | "rejected" | "ongoing" | "completed";
    companyComments?: string;
    traineeJobTitle?: string;
    supervisorTitle?: string;
    traineeDepartmentOrDivision?: string;
    supervisorDepartmentOrDivision?: string;
    supervisorSpecialty?: string;
    supervisorAcademicDegrees?: string;
    supervisorGraduatedUniversity?: string;
    supervisorGraduationYear?: string;
    supervisorYearsInCompany?: string;
    supervisorYearsExperience?: string;
    supervisorProgramOutcomeScores?: (number | null)[];
    supervisorOverallPerformanceObservations?: string;
    supervisorSuggestionsToUniversityAboutTrainee?: string;
    patchInternshipDates?: boolean;
    internshipStartDate?: string | null;
    internshipEndDate?: string | null;
  }
): Promise<{ success: true; application: Application } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/applications/${applicationId}/company-review`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Company application update failed." };
  }

  return { success: true, application: mapApplication(body as Record<string, unknown>) };
}

/** Şirketin aktif stajyerlerini getirir */
export async function getCompanyInterns(): Promise<CompanyIntern[]> {
  const res = await fetch(`${getApiUrl()}/api/applications/company/interns`, {
    credentials: withCreds,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map((item) => ({
    id: item.id as string,
    studentName: item.studentName as string,
    studentId: item.studentId as string,
    startDate: new Date(item.startDate as string),
    status: item.status as CompanyIntern["status"],
    logbookEntries: item.logbookEntries as number,
    reportSubmitted: item.reportSubmitted as boolean,
    companySupervisorUserId: (item.companySupervisorUserId as string | null | undefined) ?? null,
    companySupervisorName: (item.companySupervisorName as string | null | undefined) ?? null,
    application: mapApplication(item.application as Record<string, unknown>),
  }));
}

/** Şirket portalı: bağlı şirket kaydı (logbook/export için adres vb.) */
export async function getCompanyOrganization(): Promise<Company | null> {
  const res = await fetch(`${getApiUrl()}/api/company/organization`, { credentials: withCreds });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, unknown>;
  return mapCompany(data);
}

export type CompanyOrganizationPatchInput = Partial<
  Pick<
    CompanyUpsertInput,
    | "name"
    | "sector"
    | "address"
    | "location"
    | "fieldsOfWork"
    | "description"
    | "phone"
    | "fax"
    | "contactEmail"
    | "website"
    | "positionsOffered"
  >
>;

/** Şirket ana hesabı: şirket kaydını günceller */
export async function updateCompanyOrganization(
  input: CompanyOrganizationPatchInput
): Promise<{ success: true; company: Company } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/company/organization`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Company profile could not be updated." };
  }
  return { success: true, company: mapCompany(body as Record<string, unknown>) };
}

export interface CompanyStaffMember {
  id: string;
  email: string;
  name: string;
  permissions: string[];
}

/** Ana şirket hesabı alt kullanıcıları listeler */
export async function listCompanyStaff(): Promise<CompanyStaffMember[]> {
  const res = await fetch(`${getApiUrl()}/api/company/staff`, { credentials: withCreds });
  if (!res.ok) return [];
  const data = (await res.json()) as CompanyStaffMember[];
  return Array.isArray(data) ? data : [];
}

/** Ana şirket hesabı yeni alt kullanıcı oluşturur */
export async function createCompanyStaff(data: {
  email: string;
  name: string;
  password: string;
}): Promise<{ success: true; staff: CompanyStaffMember } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/company/staff`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not create staff user." };
  }
  return {
    success: true,
    staff: {
      id: body.id as string,
      email: body.email as string,
      name: body.name as string,
      permissions: Array.isArray(body.permissions) ? (body.permissions as string[]) : [],
    },
  };
}

/** Ana şirket hesabı alt kullanıcıyı siler */
export async function deleteCompanyStaff(
  staffId: string
): Promise<{ success: true } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/company/staff/${encodeURIComponent(staffId)}`, {
    method: "DELETE",
    credentials: withCreds,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { success: false, message: (body.message as string) || "Could not remove staff user." };
  }
  return { success: true };
}

/** Başvuruya şirket içi süpervizör (staff) atanır; null ile kaldırılır — yalnız ana şirket hesabı */
export async function assignApplicationCompanySupervisor(
  applicationId: string,
  companySupervisorUserId: string | null
): Promise<{ success: true; application: Application } | { success: false; message: string }> {
  const res = await fetch(
    `${getApiUrl()}/api/applications/${encodeURIComponent(applicationId)}/company-supervisor`,
    {
      method: "PATCH",
      credentials: withCreds,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companySupervisorUserId }),
    }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Assignment failed." };
  }
  return { success: true, application: mapApplication(body as Record<string, unknown>) };
}

/** Şirket dashboard özet kartlarını getirir */
export async function getCompanyDashboard(): Promise<CompanyDashboardSummary | null> {
  const res = await fetch(`${getApiUrl()}/api/applications/company/dashboard`, {
    credentials: withCreds,
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Record<string, unknown>;

  return {
    assignedInterns: data.assignedInterns as number,
    pendingApplications: data.pendingApplications as number,
    completedInternships: data.completedInternships as number,
  };
}

function parseOptionalDate(value: unknown): Date | undefined {
  if (value == null || value === "") return undefined;
  return new Date(value as string);
}

function mapLogbookEntry(entry: Record<string, unknown>): LogbookEntry {
  return {
    id: entry.id as string,
    studentId: entry.studentId as string,
    date: new Date(entry.date as string),
    description: entry.description as string,
    hoursWorked: entry.hoursWorked as number,
    attachments: entry.attachments as string[] | undefined,
    supervisorFeedback: entry.supervisorFeedback as string | undefined,
    supervisorId: entry.supervisorId as string | undefined,
    supervisorApprovedAt: parseOptionalDate(entry.supervisorApprovedAt),
    supervisorApprovedByUserId: entry.supervisorApprovedByUserId as string | undefined,
    supervisorApprovedByName: (entry.supervisorApprovedByName as string | undefined) || undefined,
  };
}

function mapCompanyLogbookEntry(entry: Record<string, unknown>): CompanyLogbookEntry {
  return {
    ...mapLogbookEntry(entry),
    studentName: (entry.studentName as string) ?? "",
  };
}

function mapLogbookWeeklyApproval(row: Record<string, unknown>): LogbookWeeklyApproval {
  return {
    id: row.id as string,
    studentId: row.studentId as string,
    weekStartUtc: new Date(row.weekStartUtc as string),
    approvedAtUtc: new Date(row.approvedAtUtc as string),
    approvedByUserId: row.approvedByUserId as string,
    approvedByName: (row.approvedByName as string) ?? "",
    notes: row.notes as string | undefined,
  };
}

export interface CompanyLogbookEntry extends LogbookEntry {
  studentName: string;
}

/** Şirketin aktif stajyerlerinden gelen logbook kayıtlarını getirir */
export async function getCompanyLogbookEntries(studentId?: string): Promise<CompanyLogbookEntry[]> {
  const url = new URL(`${getApiUrl()}/api/logbook/company`);
  if (studentId) url.searchParams.set("studentId", studentId);

  const res = await fetch(url.toString(), { credentials: withCreds });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map((entry) => mapCompanyLogbookEntry(entry));
}

/** Şirket belirli bir logbook kaydına feedback ekler */
export async function addLogbookFeedback(
  entryId: string,
  supervisorFeedback: string
): Promise<{ success: true; entry: CompanyLogbookEntry } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/logbook/${entryId}/feedback`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ supervisorFeedback }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Feedback could not be saved." };
  }

  const entry = body as Record<string, unknown>;
  return {
    success: true,
    entry: mapCompanyLogbookEntry(entry),
  };
}

/** Şirket: günlük satırı geri bildirim olmadan onaylar */
export async function approveLogbookEntry(
  entryId: string
): Promise<{ success: true; entry: CompanyLogbookEntry } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/logbook/${entryId}/supervisor-approve`, {
    method: "PATCH",
    credentials: withCreds,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Entry could not be approved." };
  }

  return {
    success: true,
    entry: mapCompanyLogbookEntry(body as Record<string, unknown>),
  };
}

/** Öğrenci: kendi haftalık onay kayıtları */
export async function getMyWeeklyApprovals(): Promise<LogbookWeeklyApproval[]> {
  const res = await fetch(`${getApiUrl()}/api/logbook/weekly-approvals`, {
    credentials: withCreds,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map(mapLogbookWeeklyApproval);
}

/** Koordinatör / şirket: seçilen öğrencinin haftalık onayları */
export async function getWeeklyApprovalsForStudent(studentId: string): Promise<LogbookWeeklyApproval[]> {
  const url = new URL(`${getApiUrl()}/api/logbook/weekly-approvals`);
  url.searchParams.set("studentId", studentId);
  const res = await fetch(url.toString(), { credentials: withCreds });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map(mapLogbookWeeklyApproval);
}

/** Koordinatör portalı: Tüm öğrencilerin logbook özet listesini getirir. */
export async function getCoordinatorLogbookAll(): Promise<LogbookCoordinatorRow[]> {
  const res = await fetch(`${getApiUrl()}/api/logbook/coordinator/all`, {
    credentials: withCreds,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as LogbookCoordinatorRow[];
  return data;
}

/** Koordinatör portalı: Belirli bir öğrencinin logbook kayıtlarını getirir. */
export async function getLogbookByStudentIdForCoordinator(studentId: string): Promise<LogbookEntry[]> {
  const url = new URL(`${getApiUrl()}/api/logbook/coordinator`);
  url.searchParams.set("studentId", studentId);
  const res = await fetch(url.toString(), { credentials: withCreds });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map((entry) => mapLogbookEntry(entry));
}

/** Koordinatör portalı: Logbook'u onaylar ve stajı tamamlar. */
export async function verifyLogbookByCoordinator(applicationId: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${getApiUrl()}/api/logbook/${applicationId}/verify-logbook`, {
    method: "PATCH",
    credentials: withCreds,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { success: false, message: body.message || "Verification failed." };
  }
  return { success: true };
}

/** Koordinatör portalı: Logbook'u revizyon için öğrenciye geri gönderir. */
export async function returnLogbookByCoordinator(applicationId: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${getApiUrl()}/api/logbook/${applicationId}/return-logbook`, {
    method: "PATCH",
    credentials: withCreds,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { success: false, message: body.message || "Return failed." };
  }
  return { success: true };
}

/** Şirket: haftalık “bu hafta tamam” upsert */
export async function upsertCompanyWeeklyApproval(data: {
  studentId: string;
  /** ISO tarih (yyyy-MM-dd); sunucu Pazartesi UTC’ye normalize eder */
  weekStart: string;
  notes?: string;
}): Promise<{ success: true; approval: LogbookWeeklyApproval } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/logbook/company/weekly-approvals`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: data.studentId,
      weekStart: data.weekStart,
      notes: data.notes,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Weekly approval could not be saved." };
  }

  return {
    success: true,
    approval: mapLogbookWeeklyApproval(body as Record<string, unknown>),
  };
}

/**
 * Üniversite .docx şablonunu (backend/Templates) doldurup indirir.
 * Öğrenci: studentId verme. Koordinatör/şirket: hedef öğrenci `studentId` ile.
 */
export async function downloadLogbookWordExport(
  studentId?: string
): Promise<{ success: true } | { success: false; message: string }> {
  const url = new URL(`${getApiUrl()}/api/export/logbook-word`);
  if (studentId) url.searchParams.set("studentId", studentId);
  const res = await fetch(url.toString(), { credentials: withCreds });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      success: false,
      message: (body.message as string) || "Word file could not be generated.",
    };
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  let fileName = "logbook.docx";
  if (disposition) {
    const utf8Match = /filename\*=UTF-8''([^;\n]+)/i.exec(disposition);
    if (utf8Match?.[1]) {
      try {
        fileName = decodeURIComponent(utf8Match[1]);
      } catch {
        fileName = utf8Match[1];
      }
    } else {
      const fnMatch = /filename="?([^";\n]+)"?/i.exec(disposition);
      if (fnMatch?.[1]) fileName = fnMatch[1];
    }
  }
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
  return { success: true };
}

/** Üniversite yazlık başvuru şablonu (.docx) — etiketler boş/elle doldurulur. */
export async function downloadSummerApplicationLetterBlank(): Promise<
  { success: true } | { success: false; message: string }
> {
  const url = `${getApiUrl()}/api/export/summer-application-letter-blank`;
  const res = await fetch(url, { credentials: withCreds });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      success: false,
      message: (body.message as string) || "Blank template could not be downloaded.",
    };
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  let fileName = "summer_application_letter_blank.docx";
  if (disposition) {
    const utf8Match = /filename\*=UTF-8''([^;\n]+)/i.exec(disposition);
    if (utf8Match?.[1]) {
      try {
        fileName = decodeURIComponent(utf8Match[1]);
      } catch {
        fileName = utf8Match[1];
      }
    } else {
      const fnMatch = /filename="?([^";\n]+)"?/i.exec(disposition);
      if (fnMatch?.[1]) fileName = fnMatch[1];
    }
  }
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
  return { success: true };
}

/**
 * Yazlık mektubu + profil ile dolu Word. Öğrenci studentId kullanmayın.
 * Koordinatör / danışman: öğrenci id’si ile.
 */
export async function downloadSummerApplicationLetterWord(studentId?: string): Promise<
  { success: true } | { success: false; message: string }
> {
  const url = new URL(`${getApiUrl()}/api/export/summer-application-letter-word`);
  if (studentId) url.searchParams.set("studentId", studentId);
  const res = await fetch(url.toString(), { credentials: withCreds });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      success: false,
      message: (body.message as string) || "Word file could not be generated.",
    };
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  let fileName = "summer_training_letter.docx";
  if (disposition) {
    const utf8Match = /filename\*=UTF-8''([^;\n]+)/i.exec(disposition);
    if (utf8Match?.[1]) {
      try {
        fileName = decodeURIComponent(utf8Match[1]);
      } catch {
        fileName = utf8Match[1];
      }
    } else {
      const fnMatch = /filename="?([^";\n]+)"?/i.exec(disposition);
      if (fnMatch?.[1]) fileName = fnMatch[1];
    }
  }
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
  return { success: true };
}

/** Summer acceptance letter şablonu (boş .docx). */
export async function downloadSummerAcceptanceLetterBlank(): Promise<
  { success: true } | { success: false; message: string }
> {
  const url = `${getApiUrl()}/api/export/summer-acceptance-letter-blank`;
  const res = await fetch(url, { credentials: withCreds });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      success: false,
      message: (body.message as string) || "Blank template could not be downloaded.",
    };
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  let fileName = "summer_acceptance_letter_blank.docx";
  if (disposition) {
    const utf8Match = /filename\*=UTF-8''([^;\n]+)/i.exec(disposition);
    if (utf8Match?.[1]) {
      try {
        fileName = decodeURIComponent(utf8Match[1]);
      } catch {
        fileName = utf8Match[1];
      }
    } else {
      const fnMatch = /filename="?([^";\n]+)"?/i.exec(disposition);
      if (fnMatch?.[1]) fileName = fnMatch[1];
    }
  }
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
  return { success: true };
}

/**
 * Acceptance letter + öğrenci ve yerleşim bilgisi ile dolu Word.
 * Öğrenci: studentId kullanmayın. Koordinatör/danışman: öğrenci id gerekli.
 */
export async function downloadSummerAcceptanceLetterWord(studentId?: string): Promise<
  { success: true } | { success: false; message: string }
> {
  const url = new URL(`${getApiUrl()}/api/export/summer-acceptance-letter-word`);
  if (studentId) url.searchParams.set("studentId", studentId);
  const res = await fetch(url.toString(), { credentials: withCreds });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      success: false,
      message: (body.message as string) || "Word file could not be generated.",
    };
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  let fileName = "summer_acceptance_letter.docx";
  if (disposition) {
    const utf8Match = /filename\*=UTF-8''([^;\n]+)/i.exec(disposition);
    if (utf8Match?.[1]) {
      try {
        fileName = decodeURIComponent(utf8Match[1]);
      } catch {
        fileName = utf8Match[1];
      }
    } else {
      const fnMatch = /filename="?([^";\n]+)"?/i.exec(disposition);
      if (fnMatch?.[1]) fileName = fnMatch[1];
    }
  }
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
  return { success: true };
}

export async function getMyAcceptanceLetterPortal(): Promise<
  | { success: true; session: AcceptanceLetterPortalSession }
  | { success: false; message: string }
> {
  const res = await fetch(`${getApiUrl()}/api/applications/my/acceptance-letter-portal`, {
    credentials: withCreds,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      success: false,
      message: (body.message as string) || "Could not load acceptance letter portal.",
    };
  }
  const data = (await res.json()) as Record<string, unknown>;
  return {
    success: true,
    session: {
      applicationId: data.applicationId as string,
      effectivePreview: (data.effectivePreview as Record<string, string>) ?? {},
      savedOverrides: (data.savedOverrides as AcceptanceLetterPortalOverrides | null) ?? null,
    },
  };
}

export async function putMyAcceptanceLetterPortal(
  body: AcceptanceLetterPortalOverrides
): Promise<{ success: true; application: Application } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/applications/my/acceptance-letter-portal`, {
    method: "PUT",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      message: (payload.message as string) || "Could not save acceptance letter form.",
    };
  }
  return { success: true, application: mapApplication(payload as Record<string, unknown>) };
}

/** Öğrencinin kendi logbook kayıtlarını getirir */
export async function getMyLogbookEntries(): Promise<LogbookEntry[]> {
  const res = await fetch(`${getApiUrl()}/api/logbook/my`, {
    credentials: withCreds,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map((entry) => mapLogbookEntry(entry));
}
export async function getCoordinatorLogbookForStudent(
  studentId: string
): Promise<LogbookEntry[]> {
  const url = new URL(`${getApiUrl()}/api/logbook/coordinator`);
  url.searchParams.set("studentId", studentId);
  const res = await fetch(url.toString(), { credentials: withCreds });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map((entry) => mapLogbookEntry(entry));
}

/** Öğrenci yeni logbook kaydı ekler */
export async function createLogbookEntry(data: {
  date: string;
  description: string;
  hoursWorked: number;
  attachmentFileIds?: string[];
}): Promise<{ success: true; entry: LogbookEntry } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/logbook`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Logbook entry could not be saved." };
  }

  const entry = body as Record<string, unknown>;
  return {
    success: true,
    entry: mapLogbookEntry(entry),
  };
}

/** Öğrenci kendi logbook kaydını günceller */
export async function updateLogbookEntry(
  id: string,
  data: {
    date?: string;
    description?: string;
    hoursWorked?: number;
    attachmentFileIds?: string[];
  }
): Promise<{ success: true; entry: LogbookEntry } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/logbook/${id}`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Logbook entry could not be updated." };
  }

  const entry = body as Record<string, unknown>;
  return {
    success: true,
    entry: mapLogbookEntry(entry),
  };
}

/** Öğrenci kendi logbook kaydını siler */
export async function deleteLogbookEntry(
  id: string
): Promise<{ success: true } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/logbook/${id}`, {
    method: "DELETE",
    credentials: withCreds,
  });

  if (res.status === 204) return { success: true };

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Logbook entry could not be deleted." };
  }
  return { success: true };
}

/** Tüm satırlar süpervizör onaylıysa logbook'u şirket yetkilisine son değerlendirmesi için iletir (Phase 1) */
export async function submitLogbookToSupervisor(): Promise<
  { success: true; submittedAt: Date } | { success: false; message: string }
> {
  const res = await fetch(`${getApiUrl()}/api/logbook/submit-to-supervisor`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not submit logbook to supervisor." };
  }

  const atRaw = body.logbookSubmittedToSupervisorAt as string | undefined;
  const submittedAt = atRaw ? new Date(atRaw) : new Date();
  return { success: true, submittedAt };
}

/** Şirket yetkilisi kendi değerlendirmesini tamamlar ve öğrenciye yollar (Phase 2) */
export async function completeSupervisorEvaluation(applicationId: string): Promise<
  { success: true; completedAt: Date } | { success: false; message: string }
> {
  const res = await fetch(`${getApiUrl()}/api/logbook/${applicationId}/complete-supervisor-evaluation`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not complete evaluation." };
  }

  const atRaw = body.supervisorEvaluationCompletedAt as string | undefined;
  const completedAt = atRaw ? new Date(atRaw) : new Date();
  return { success: true, completedAt };
}

/** Öğrenci staj logbook ve self-eval sürecini bitirip son onayı için üniversiteye iletir (Phase 3) */
export async function submitLogbookToCoordinator(): Promise<
  { success: true; submittedAt: Date } | { success: false; message: string }
> {
  const res = await fetch(`${getApiUrl()}/api/logbook/submit-to-coordinator`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not submit logbook to coordinator." };
  }

  const atRaw = body.logbookSubmittedForCoordinatorReviewAt as string | undefined;
  const submittedAt = atRaw ? new Date(atRaw) : new Date();
  return { success: true, submittedAt };
}

/** Koordinatör son aşamada logbook'u onaylar (Phase 4) */
export async function verifyLogbook(applicationId: string): Promise<
  { success: true; verifiedAt: Date } | { success: false; message: string }
> {
  const res = await fetch(`${getApiUrl()}/api/logbook/${applicationId}/verify-logbook`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not verify logbook." };
  }

  const atRaw = body.logbookVerifiedByCoordinatorAt as string | undefined;
  const verifiedAt = atRaw ? new Date(atRaw) : new Date();
  return { success: true, verifiedAt };
}

export async function returnLogbook(applicationId: string): Promise<
  { success: true } | { success: false; message: string }
> {
  const res = await fetch(`${getApiUrl()}/api/logbook/${applicationId}/return-logbook`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not return logbook." };
  }

  return { success: true };
}

/** Öğrenci: yaz staj öz-değerlendirme (12 satır, koordinatör gönderiminden sonra) */
export async function patchTraineeSummerSelfEvaluation(
  applicationId: string,
  scores: (number | null)[]
): Promise<{ success: true; application: Application } | { success: false; message: string }> {
  const res = await fetch(
    `${getApiUrl()}/api/applications/${applicationId}/trainee-summer-self-evaluation`,
    {
      method: "PATCH",
      credentials: withCreds,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores }),
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not save evaluation." };
  }

  return { success: true, application: mapApplication(body as Record<string, unknown>) };
}

/** Öğrenci: Daily Work Log'daki iş tanımı (kendi kelimeleriyle); koordinatöre gönderilene kadar. */
export async function patchTraineeJobOwnWords(
  applicationId: string,
  traineeJobOwnWords: string
): Promise<{ success: true; application: Application } | { success: false; message: string }> {
  const res = await fetch(
    `${getApiUrl()}/api/applications/${applicationId}/trainee-job-own-words`,
    {
      method: "PATCH",
      credentials: withCreds,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ traineeJobOwnWords }),
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      message: (body.message as string) || "Could not save job details.",
    };
  }

  return { success: true, application: mapApplication(body as Record<string, unknown>) };
}

/** Öğrenci dashboard placement özeti */
function mapStudentPlacementSummary(raw: unknown): StudentPlacementSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    applicationId: o.applicationId as string,
    status: o.status as StudentPlacementSummary["status"],
    companyName: o.companyName as string | undefined,
    companySupervisorAssigned: Boolean(o.companySupervisorAssigned),
    companySupervisorName: (o.companySupervisorName as string | null | undefined) ?? null,
    acceptanceLetterVerified: Boolean(o.acceptanceLetterVerified),
    internshipDatesSet: Boolean(o.internshipDatesSet),
    logbookSubmittedToSupervisorAt: (() => {
      const v = o.logbookSubmittedToSupervisorAt;
      if (v == null || v === "") return undefined;
      const d = new Date(v as string);
      return Number.isNaN(d.getTime()) ? undefined : d;
    })(),
    supervisorEvaluationCompletedAt: (() => {
      const v = o.supervisorEvaluationCompletedAt;
      if (v == null || v === "") return undefined;
      const d = new Date(v as string);
      return Number.isNaN(d.getTime()) ? undefined : d;
    })(),
    logbookSubmittedForCoordinatorReviewAt: (() => {
      const v = o.logbookSubmittedForCoordinatorReviewAt;
      if (v == null || v === "") return undefined;
      const d = new Date(v as string);
      return Number.isNaN(d.getTime()) ? undefined : d;
    })(),
    logbookVerifiedByCoordinatorAt: (() => {
      const v = o.logbookVerifiedByCoordinatorAt;
      if (v == null || v === "") return undefined;
      const d = new Date(v as string);
      return Number.isNaN(d.getTime()) ? undefined : d;
    })(),
    coordinatorPlacementApprovedAt: (() => {
      const v = o.coordinatorPlacementApprovedAt;
      if (v == null || v === "") return undefined;
      const d = new Date(v as string);
      return Number.isNaN(d.getTime()) ? undefined : d;
    })(),
    companyPlacementApprovedAt: (() => {
      const v = o.companyPlacementApprovedAt;
      if (v == null || v === "") return undefined;
      const d = new Date(v as string);
      return Number.isNaN(d.getTime()) ? undefined : d;
    })(),
  };
}

/** Student dashboard özeti ve türetilmiş bildirimleri getirir */
export async function getStudentDashboardSummary(): Promise<StudentDashboardSummary | null> {
  const res = await fetch(`${getApiUrl()}/api/dashboard/student`, {
    credentials: withCreds,
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Record<string, unknown>;

  const boolish = (v: unknown): boolean =>
    v === true || v === "true" || (typeof v === "string" && v.toLowerCase() === "true");

  return {
    user: mapUser(data.user as Record<string, unknown>),
    summerTrainingLetterStatus: (data.summerTrainingLetterStatus as SummerTrainingLetterStatus | null | undefined) ?? null,
    placementSummary: mapStudentPlacementSummary(data.placementSummary),
    internshipStatus: data.internshipStatus as StudentDashboardSummary["internshipStatus"],
    trainingReportEligible: boolish(data.trainingReportEligible ?? data.TrainingReportEligible),
    summerTrainingReportSubmitted: boolish(data.summerTrainingReportSubmitted ?? data.SummerTrainingReportSubmitted),
    applicationsCount: data.applicationsCount as number,
    logbookEntriesCount: data.logbookEntriesCount as number,
    reportsCount: data.reportsCount as number,
  };
}

/** Aktif kullanıcının bildirimlerini getirir (API kapalı / ağ hatasında boş dizi) */
export async function getMyNotifications(): Promise<StudentNotification[]> {
  try {
    const res = await fetch(`${getApiUrl()}/api/notifications/my`, {
      credentials: withCreds,
    });
    if (!res.ok) return [];

    const data = (await res.json()) as Array<Record<string, unknown>>;
    return data.map(mapStudentNotification);
  } catch {
    return [];
  }
}

/** Tek bildirimi okundu olarak işaretler */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: true; notification: StudentNotification } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/notifications/${notificationId}/read`, {
    method: "POST",
    credentials: withCreds,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Notification could not be updated." };
  }

  return { success: true, notification: mapStudentNotification(body as Record<string, unknown>) };
}

/** Tüm bildirimleri okundu olarak işaretler */
export async function markAllNotificationsAsRead(): Promise<{ success: boolean }> {
  const res = await fetch(`${getApiUrl()}/api/notifications/read-all`, {
    method: "POST",
    credentials: withCreds,
  });
  return { success: res.ok };
}

/** Coordinator dashboard özet sayaçlarını getirir */
export async function getCoordinatorDashboardSummary(): Promise<CoordinatorDashboardSummary | null> {
  const res = await fetch(`${getApiUrl()}/api/dashboard/coordinator`, {
    credentials: withCreds,
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Record<string, unknown>;
  return {
    pendingApplications: data.pendingApplications as number,
    eligibleNotApplied: data.eligibleNotApplied as number,
    ongoingInternships: data.ongoingInternships as number,
    completedInternships: data.completedInternships as number,
    eligibleStudents: data.eligibleStudents as number,
    totalUpperYearStudents: data.totalUpperYearStudents as number,
  };
}

/** Admin için tüm kullanıcı listesini getirir (rol filtresi opsiyonel) */
export async function getAdminUsers(role?: UserRole): Promise<ManagedUser[]> {
  const url = new URL(`${getApiUrl()}/api/admin/users`);
  if (role) url.searchParams.set("role", role);

  const res = await fetch(url.toString(), { credentials: withCreds });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map(mapManagedUser);
}

/** Admin için rol bazlı izin kataloğunu getirir */
export async function getPermissionCatalog(): Promise<PermissionCatalog | null> {
  const res = await fetch(`${getApiUrl()}/api/admin/permissions`, {
    credentials: withCreds,
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Record<string, unknown>;
  return {
    coordinator: Array.isArray(data.coordinator) ? (data.coordinator as string[]) : [],
    company: Array.isArray(data.company) ? (data.company as string[]) : [],
  };
}

/** Admin: özel personel rol tanımları (koordinatör portalı) */
export async function getStaffRoleDefinitions(): Promise<StaffRoleDefinition[]> {
  const res = await fetch(`${getApiUrl()}/api/admin/staff-roles`, { credentials: withCreds });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map((row) => ({
    id: row.id as string,
    key: row.key as string,
    label: row.label as string,
  }));
}

export async function createStaffRoleDefinition(payload: {
  key: string;
  label: string;
}): Promise<{ success: true } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/admin/staff-roles`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not create role." };
  }

  return { success: true };
}

export async function deleteStaffRoleDefinition(
  id: string
): Promise<{ success: true } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/admin/staff-roles/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: withCreds,
  });

  if (res.status === 204) return { success: true };

  const body = await res.json().catch(() => ({}));
  return { success: false, message: (body.message as string) || "Could not delete role." };
}

/** Admin yeni kullanıcı oluşturur */
export async function createAdminUser(data: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  companyId?: string;
  permissions?: string[];
}): Promise<{ success: true; user: ManagedUser } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/admin/users`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "User creation failed." };
  }

  return { success: true, user: mapManagedUser(body as Record<string, unknown>) };
}

/** Admin kullanıcı bilgisi veya yetkilerini günceller */
export async function updateAdminUser(
  userId: string,
  data: {
    email?: string;
    name?: string;
    password?: string;
    permissions?: string[];
  }
): Promise<{ success: true; user: ManagedUser } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/admin/users/${userId}`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "User update failed." };
  }

  return { success: true, user: mapManagedUser(body as Record<string, unknown>) };
}

/** Admin kullanıcıyı siler */
export async function deleteAdminUser(
  userId: string
): Promise<{ success: true } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/admin/users/${userId}`, {
    method: "DELETE",
    credentials: withCreds,
  });

  if (res.status === 204) return { success: true };

  const body = await res.json().catch(() => ({}));
  return { success: false, message: (body.message as string) || "User deletion failed." };
}

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  authorId?: string | null;
  authorName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapKnowledgeBaseEntry(data: Record<string, unknown>): KnowledgeBaseEntry {
  return {
    id: data.id as string,
    title: data.title as string,
    content: data.content as string,
    category: data.category as string,
    authorId: (data.authorId as string | null | undefined) ?? null,
    authorName: (data.authorName as string | null | undefined) ?? null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };
}

/** Knowledge base kayıtlarını getirir */
export async function getKnowledgeBaseEntries(
  category?: string,
  search?: string
): Promise<KnowledgeBaseEntry[]> {
  const url = new URL(`${getApiUrl()}/api/knowledge-base`);
  if (category && category !== "all") url.searchParams.set("category", category);
  if (search && search.length > 0) url.searchParams.set("search", search);

  const res = await fetch(url.toString(), { credentials: withCreds });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map(mapKnowledgeBaseEntry);
}

export async function createKnowledgeBaseEntry(input: {
  title: string;
  content: string;
  category: string;
}): Promise<{ success: true; entry: KnowledgeBaseEntry } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/knowledge-base`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Entry could not be created." };
  }
  return { success: true, entry: mapKnowledgeBaseEntry(body as Record<string, unknown>) };
}

export async function updateKnowledgeBaseEntry(
  id: string,
  input: { title?: string; content?: string; category?: string }
): Promise<{ success: true; entry: KnowledgeBaseEntry } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/knowledge-base/${id}`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Entry could not be updated." };
  }
  return { success: true, entry: mapKnowledgeBaseEntry(body as Record<string, unknown>) };
}

export async function deleteKnowledgeBaseEntry(
  id: string
): Promise<{ success: true } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/knowledge-base/${id}`, {
    method: "DELETE",
    credentials: withCreds,
  });

  if (res.status === 204) return { success: true };
  const body = await res.json().catch(() => ({}));
  return { success: false, message: (body.message as string) || "Entry could not be deleted." };
}

/** PDF dosyasını yükler, sistem otomatik olarak parçalayıp KB kayıtları oluşturur */
export async function uploadKnowledgeBasePdf(
  file: File,
  category?: string
): Promise<
  | { success: true; count: number; entries: KnowledgeBaseEntry[] }
  | { success: false; message: string }
> {
  const formData = new FormData();
  formData.append("file", file);
  if (category) formData.append("category", category);

  const res = await fetch(`${getApiUrl()}/api/knowledge-base/upload-pdf`, {
    method: "POST",
    credentials: withCreds,
    body: formData,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      message: (body.message as string) || "PDF could not be processed.",
    };
  }

  const entries = ((body.entries as Array<Record<string, unknown>>) ?? []).map(
    mapKnowledgeBaseEntry
  );
  return {
    success: true,
    count: (body.count as number) ?? entries.length,
    entries,
  };
}

export type AppSettings = Record<string, string>;

/** Herkese açık ayarlar (kayıt sayfası bölüm listesi vb., cookie gerekmez) */
export async function getPublicAppSettings(): Promise<AppSettings> {
  const res = await fetch(`${getApiUrl()}/api/settings/public`, { credentials: "omit" });
  if (!res.ok) return {};
  return (await res.json()) as AppSettings;
}

/** Sistem ayarlarını getirir */
export async function getAppSettings(): Promise<AppSettings> {
  const res = await fetch(`${getApiUrl()}/api/settings`, { credentials: withCreds });
  if (!res.ok) return {};
  return (await res.json()) as AppSettings;
}

/** Admin sistem ayarlarını günceller */
export async function updateAppSettings(
  changes: Record<string, string>
): Promise<{ success: true; settings: AppSettings } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/settings`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Settings could not be saved." };
  }
  return { success: true, settings: body as AppSettings };
}

/** Koordinatör / admin: üyelikte görünecek bölüm listesini kaydeder */
export async function updateStudentDepartments(
  departments: string[]
): Promise<{ success: true; departments: string[] } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/settings/student-departments`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ departments }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (body.message as string) || "Could not save departments." };
  }
  return { success: true, departments: (body.departments as string[]) || [] };
}

/** Admin dashboard sistem özetini getirir */
export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary | null> {
  const res = await fetch(`${getApiUrl()}/api/dashboard/admin`, {
    credentials: withCreds,
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Record<string, unknown>;
  return {
    totalUsers: data.totalUsers as number,
    eligibilityScans: data.eligibilityScans as number,
    approvedCompanies: data.approvedCompanies as number,
    activeInternships: data.activeInternships as number,
    pendingApplications: data.pendingApplications as number,
  };
}

function mapSummerTrainingLetterCourseRow(
  raw: Record<string, unknown>
): SummerTrainingLetterCourseRow {
  return {
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    registered: String(raw.registered ?? ""),
    grade: String(raw.grade ?? ""),
  };
}

function mapSummerTrainingLetterDetail(body: Record<string, unknown>): SummerTrainingLetterDetail {
  const rows = (body.courseRows as Array<Record<string, unknown>> | undefined) ?? [];
  return {
    id: body.id as string,
    academicPeriodKey: body.academicPeriodKey as string,
    status: body.status as SummerTrainingLetterDetail["status"],
    studentId: body.studentId as string,
    advisorUserId: body.advisorUserId as string | undefined,
    advisorName: body.advisorName as string | undefined,
    submittedToAdvisorAt: body.submittedToAdvisorAt as string | undefined,
    studentElectronicAcceptanceAt: body.studentElectronicAcceptanceAt as string | undefined,
    advisorApprovedAt: body.advisorApprovedAt as string | undefined,
    advisorRejectedAt: body.advisorRejectedAt as string | undefined,
    advisorComments: body.advisorComments as string | undefined,
    coordinatorApprovedAt: body.coordinatorApprovedAt as string | undefined,
    coordinatorRejectedAt: body.coordinatorRejectedAt as string | undefined,
    coordinatorComments: body.coordinatorComments as string | undefined,
    coordinatorApproverName: body.coordinatorApproverName as string | undefined,
    courseRows: rows.map(mapSummerTrainingLetterCourseRow),
    updatedUtc: body.updatedUtc as string,
  };
}

function mapSummerTrainingLetterQueueItem(
  body: Record<string, unknown>
): SummerTrainingLetterQueueItem {
  const student = body.student as Record<string, unknown> | undefined;
  const rows = body.courseRows as Array<Record<string, unknown>> | undefined;
  return {
    id: body.id as string,
    status: body.status as SummerTrainingLetterQueueItem["status"],
    submittedToAdvisorAt: body.submittedToAdvisorAt as string | undefined,
    advisorApprovedAt: body.advisorApprovedAt as string | undefined,
    courseRows: rows?.map(mapSummerTrainingLetterCourseRow),
    student:
      student === undefined
        ? undefined
        : {
            id: student.id as string,
            name: student.name as string,
            email: student.email as string,
            studentId: student.studentId as string | undefined,
            department: student.department as string | undefined,
            currentSemester: student.currentSemester as number | undefined,
            cgpa: typeof student.cgpa === "number" ? student.cgpa : undefined,
            advisorName: student.advisorName as string | undefined,
          },
  };
}

export async function getSummerTrainingCurriculumCourses(): Promise<Array<{ code: string; name: string }>> {
  const res = await fetch(`${getApiUrl()}/api/summer-training-letters/curriculum`, {
    credentials: "omit",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map((r) => ({
    code: String(r.code ?? ""),
    name: String(r.name ?? ""),
  }));
}

export async function getCoordinatorAdvisorDirectory(): Promise<
  Array<{ id: string; name: string; email: string }>
> {
  const res = await fetch(`${getApiUrl()}/api/summer-training-letters/advisors`, { credentials: withCreds });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    email: r.email as string,
  }));
}

export async function getMySummerTrainingLetter(): Promise<SummerTrainingLetterDetail | null> {
  const res = await fetch(`${getApiUrl()}/api/summer-training-letters/me`, { credentials: withCreds });
  if (!res.ok) return null;
  const data = await res.json();
  return mapSummerTrainingLetterDetail(data as Record<string, unknown>);
}

export async function patchSummerTrainingLetterCourses(
  letterId: string,
  courseRows: SummerTrainingLetterCourseRow[]
): Promise<{ success: true; letter: SummerTrainingLetterDetail } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/summer-training-letters/${letterId}`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseRows }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: (body.message as string) || "Could not save." };
  return { success: true, letter: mapSummerTrainingLetterDetail(body as Record<string, unknown>) };
}

export async function submitSummerTrainingLetterToAdvisor(
  letterId: string
): Promise<{ success: true; letter: SummerTrainingLetterDetail } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/summer-training-letters/${letterId}/submit-to-advisor`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acceptElectronicTerms: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: (body.message as string) || "Could not submit." };
  return { success: true, letter: mapSummerTrainingLetterDetail(body as Record<string, unknown>) };
}

export async function getAdvisorPendingSummerLetters(): Promise<SummerTrainingLetterQueueItem[]> {
  const res = await fetch(`${getApiUrl()}/api/summer-training-letters/advisor/pending`, {
    credentials: withCreds,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map(mapSummerTrainingLetterQueueItem);
}

export async function advisorReviewSummerLetter(
  letterId: string,
  approve: boolean,
  comments?: string
): Promise<{ success: true; letter: SummerTrainingLetterDetail } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/summer-training-letters/${letterId}/advisor-review`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approve, comments }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: (body.message as string) || "Could not update." };
  return { success: true, letter: mapSummerTrainingLetterDetail(body as Record<string, unknown>) };
}

export async function getCoordinatorPendingSummerLetters(): Promise<SummerTrainingLetterQueueItem[]> {
  const res = await fetch(`${getApiUrl()}/api/summer-training-letters/coordinator/pending`, {
    credentials: withCreds,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map(mapSummerTrainingLetterQueueItem);
}

export async function coordinatorReviewSummerLetter(
  letterId: string,
  approve: boolean,
  comments?: string
): Promise<{ success: true; letter: SummerTrainingLetterDetail } | { success: false; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/summer-training-letters/${letterId}/coordinator-review`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approve, comments }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: (body.message as string) || "Could not update." };
  return { success: true, letter: mapSummerTrainingLetterDetail(body as Record<string, unknown>) };
}
