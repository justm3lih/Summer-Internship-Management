export type UserRole = "student" | "coordinator" | "company" | "admin" | (string & {});

export interface StaffRoleDefinition {
  id: string;
  key: string;
  label: string;
}

/** Şirket portalı: ana hesap veya alt kullanıcı */
export type CompanyMembershipTier = "primary" | "staff";

export type EligibilityStatus = "eligible" | "almost_eligible" | "not_eligible";

export type ApplicationStatus =
  | "not_applied"
  | "pending"
  | "approved"
  | "rejected"
  | "ongoing"
  | "completed";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studentId?: string;
  department?: string;
  currentSemester?: number;
  cgpa?: number;
  homeAddress?: string;
  homeTelephone?: string;
  mobileTelephone?: string;
  addressNorthCyprus?: string;
  photo?: string;
  eligibilityStatus?: EligibilityStatus;
  passedThirdYearCourses?: number;
  requiredThirdYearCourses?: number;
  transcriptVerifiedAt?: string;
  /** Transcript uygunluk sayfasından kaydedilen ders kodu → not JSON */
  thirdYearCourseGradesJson?: string;
  permissions?: string[];
  /** Şirket kullanıcıları için */
  companyId?: string;
  companyMembershipTier?: CompanyMembershipTier;
  managedByCompanyUserId?: string;
  /** Koordinatör rotası (/coordinator) ve API: özel personel rolleri için true */
  coordinatorPortal?: boolean;
  advisorUserId?: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studentId?: string;
  department?: string;
  companyId?: string;
  permissions: string[];
}

export interface PermissionCatalog {
  coordinator: string[];
  company: string[];
}

export interface EligibilityCheck {
  status: EligibilityStatus;
  passedCourses: number;
  requiredCourses: number;
  courses: Course[];
}

export interface Course {
  code: string;
  name: string;
  semester: number;
  passed: boolean;
  grade?: string;
}

export interface Application {
  id: string;
  studentId: string;
  companyId: string;
  status: ApplicationStatus;
  appliedDate: Date;
  documents: {
    cv?: string;
    motivationLetter?: string;
    transcript?: string;
  };
  coordinatorComments?: string;
  companyComments?: string;
  /** Atanan şirket içi süpervizör (staff kullanıcı id); ana hesap atar */
  companySupervisorUserId?: string | null;
  /** API’nin döndürdüğü süpervizör hesap adı (şirket personeli) */
  companySupervisorName?: string | null;
  traineeJobTitle?: string;
  /** Daily Work Log — “Trainee's Job Details” (öğrenci metni, Word {{TraineeJobOwnWords}}) */
  traineeJobOwnWords?: string;
  supervisorTitle?: string;
  /** Word HR paragrafı: şirketteki birim */
  traineeDepartmentOrDivision?: string;
  supervisorDepartmentOrDivision?: string;
  supervisorSpecialty?: string;
  supervisorAcademicDegrees?: string;
  supervisorGraduatedUniversity?: string;
  supervisorGraduationYear?: string;
  supervisorYearsInCompany?: string;
  supervisorYearsExperience?: string;
  /** Logbook koordinatöre gönderim sonrası süpervizör kapanış metinleri (Word {{…}}) */
  supervisorOverallPerformanceObservations?: string;
  supervisorSuggestionsToUniversityAboutTrainee?: string;
  /** Summer training self-eval (trainee), 12 rows; null = not set */
  traineeSummerSelfEvaluationScores?: (number | null)[];
  internshipStartDate?: Date;
  internshipEndDate?: Date;
  /** Öğrenci logbook'u şirkete gönderdiği an */
  logbookSubmittedToSupervisorAt?: Date;
  /** Şirket değerlendirmeyi bitirdiği an */
  supervisorEvaluationCompletedAt?: Date;
  /** Öğrenci logbook'u koordinatör onayına gönderdiği zaman (varsa) */
  logbookSubmittedForCoordinatorReviewAt?: Date;
  /** Koordinatör logbook'u onayladığı an */
  logbookVerifiedByCoordinatorAt?: Date;
  /** Eski akışta portal dosya URL'i (/api/files/…); yeni akışta yükleme zorunlu değil */
  acceptanceLetterUrl?: string;
  /** Öğrenci acceptance letter portal formunu kaydettiyse true */
  acceptanceLetterPortalSaved?: boolean;
  acceptanceLetterSubmittedAt?: Date;
  /** Koordinatör doğruladığında günlük logbook açılır */
  acceptanceLetterVerifiedAt?: Date;
  acceptanceLetterCoordinatorComments?: string;
  /** Yerleşim: üniversite koordinatör onayı zamanı */
  coordinatorPlacementApprovedAt?: Date;
  /** Yerleşim: şirket kabul zamanı */
  companyPlacementApprovedAt?: Date;
  /** Süpervizör PO1–PO11 puanları (logbook sürecinden sonra) */
  supervisorProgramOutcomeScores?: (number | null)[];
  student?: User;
  company?: Company;
}

/** Summer acceptance letter — portal üzerinden Word şablonuna yazılan isteğe bağlı alanlar (camelCase JSON). */
export type AcceptanceLetterPortalOverrides = Partial<{
  studentName: string;
  studentId: string;
  department: string;
  currentSemester: string;
  semester: string;
  cgpa: string;
  homeAddress: string;
  homeTelephone: string;
  mobileTelephone: string;
  addressNorthCyprus: string;
  studentEmail: string;
  companyName: string;
  companyFieldsOfWork: string;
  companyAddress: string;
  companyTelephone: string;
  companyFax: string;
  companyEmail: string;
  companyWebsite: string;
  traineeJobTitle: string;
  traineeJobOwnWords: string;
  supervisorTitle: string;
  traineeDepartmentOrDivision: string;
  supervisorDepartmentOrDivision: string;
  supervisorSpecialty: string;
  supervisorAcademicDegrees: string;
  supervisorGraduatedUniversity: string;
  supervisorGraduationYear: string;
  supervisorYearsInCompany: string;
  supervisorYearsExperience: string;
  supervisorName: string;
  supervisorEmail: string;
  internshipStartDate: string;
  internshipEndDate: string;
  studentSignatureDateSlash: string;
  traineeSupervisorSignatureDateSlash: string;
}>;

export interface AcceptanceLetterPortalSession {
  applicationId: string;
  effectivePreview: Record<string, string>;
  savedOverrides: AcceptanceLetterPortalOverrides | null;
}

export interface Company {
  id: string;
  name: string;
  sector: string;
  address?: string;
  location: string;
  fieldsOfWork?: string;
  description: string;
  phone?: string;
  fax?: string;
  contactEmail?: string;
  website?: string;
  positionsOffered: number;
  remainingPositions: number;
  averageRating?: number;
  approved: boolean;
  /** Koordinatör listesinde: role=company + CompanyId eşleşen kullanıcı var mı */
  hasPortalUser?: boolean;
}

export interface LogbookEntry {
  id: string;
  studentId: string;
  date: Date;
  description: string;
  hoursWorked: number;
  attachments?: string[];
  supervisorFeedback?: string;
  supervisorId?: string;
  /** Şirket süpervizör satır onayı (geri bildirimle birlikte de set edilir) */
  supervisorApprovedAt?: Date;
  supervisorApprovedByUserId?: string;
  supervisorApprovedByName?: string;
}

/** Şirket: haftalık “bu hafta tamam” kaydı */
export interface LogbookWeeklyApproval {
  id: string;
  studentId: string;
  weekStartUtc: Date;
  approvedAtUtc: Date;
  approvedByUserId: string;
  approvedByName: string;
  notes?: string;
}

export interface LogbookCoordinatorRow {
    studentId: string;
    studentName: string;
    studentNumber?: string;
    companyName: string;
    applicationId: string;
    status: ApplicationStatus;
    entryCount: number;
    submittedToSupervisorAt?: string;
    supervisorEvaluationCompletedAt?: string;
    submittedToCoordinatorAt?: string;
    verifiedByCoordinatorAt?: string;
    updatedAt?: string;
}

export interface FinalReport {
  id: string;
  studentId: string;
  submittedDate?: Date;
  fileUrl?: string;
  status: "not_submitted" | "pending" | "approved" | "rejected";
  coordinatorFeedback?: string;
  companyFeedback?: string;
}

export type TrainingReportStatus = "draft" | "submitted" | "revision_requested" | "approved";

export interface TrainingReportDynamicSection {
  outlineNumber: string;
  title: string;
  body: string;
}

export interface TrainingReportContentPayload {
  introduction: string;
  introductionSections: TrainingReportDynamicSection[];
  companyIntro: string;
  company21: string;
  company22: string;
  companySections: TrainingReportDynamicSection[];
  workExperienceIntro: string;
  problemDefinition: string;
  workDoneIntro: string;
  task1Title: string;
  task1Body: string;
  task2Title: string;
  task2Body: string;
  workExperienceSections: TrainingReportDynamicSection[];
  limitations: string;
  recentTopics: string;
  conclusion: string;
  conclusionSections: TrainingReportDynamicSection[];
  appendix: string;
  references: string[];
}

export interface TrainingReportFigureRow {
  id: string;
  fileId: string;
  url: string;
  caption: string;
  sortOrder: number;
}

export interface TrainingReportDetail {
  id: string;
  applicationId: string;
  status: TrainingReportStatus;
  content: TrainingReportContentPayload;
  coordinatorFeedback?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  updatedAt?: string | null;
  companyName?: string | null;
  figures: TrainingReportFigureRow[];
}

export interface TrainingReportEligibility {
  eligible: boolean;
  applicationId?: string;
  companyName?: string;
  checks: {
    applicationApproved: boolean;
    acceptanceLetterVerified: boolean;
    logbookSubmittedToSupervisor: boolean;
    supervisorEvaluationDone: boolean;
    logbookSubmittedForCoordinator: boolean;
    coordinatorLogbookVerified: boolean;
  };
}

export interface TrainingReportPendingRow {
  id: string;
  status: TrainingReportStatus;
  submittedAt?: string | null;
  updatedAt?: string | null;
  studentId: string;
  studentName: string;
  studentNumber?: string | null;
  companyName: string;
  applicationId: string;
}

export type SummerTrainingLetterStatus =
  | "draft"
  | "advisor_pending"
  | "advisor_rejected"
  | "coordinator_pending"
  | "coordinator_rejected"
  | "approved";

export interface SummerTrainingLetterCourseRow {
  code: string;
  name: string;
  registered: string;
  grade: string;
}

export interface SummerTrainingLetterDetail {
  id: string;
  academicPeriodKey: string;
  status: SummerTrainingLetterStatus;
  studentId: string;
  advisorUserId?: string;
  advisorName?: string;
  submittedToAdvisorAt?: string;
  studentElectronicAcceptanceAt?: string;
  advisorApprovedAt?: string;
  advisorRejectedAt?: string;
  advisorComments?: string;
  coordinatorApprovedAt?: string;
  coordinatorRejectedAt?: string;
  coordinatorComments?: string;
  coordinatorApproverName?: string;
  courseRows: SummerTrainingLetterCourseRow[];
  updatedUtc: string;
}

export interface SummerTrainingLetterQueueItem {
  id: string;
  status: SummerTrainingLetterStatus;
  submittedToAdvisorAt?: string;
  advisorApprovedAt?: string;
  /** Öğrencinin kaydettiği tablo; danışman/koordinatör incelemesi için */
  courseRows?: SummerTrainingLetterCourseRow[];
  student?: {
    id: string;
    name: string;
    email: string;
    studentId?: string;
    department?: string;
    currentSemester?: number;
    cgpa?: number;
    advisorName?: string;
  };
}


export interface CoordinatorStudentMonitoring {
  id: string;
  email: string;
  name: string;
  studentId?: string;
  department?: string;
  currentSemester?: number;
  eligibilityStatus: EligibilityStatus;
  internshipStatus: ApplicationStatus;
  logbookEntriesCount: number;
  reportStatus: FinalReport["status"];
  advisorUserId?: string;
  summerTrainingLetterStatus?: SummerTrainingLetterStatus | null;
  latestApplication?: Application | null;
}

export interface CompanyIntern {
  id: string;
  studentName: string;
  studentId: string;
  startDate: Date;
  status: ApplicationStatus;
  logbookEntries: number;
  reportSubmitted: boolean;
  companySupervisorUserId?: string | null;
  companySupervisorName?: string | null;
  application: Application;
}

export interface CompanyDashboardSummary {
  assignedInterns: number;
  pendingApplications: number;
  completedInternships: number;
}

export interface StudentNotification {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  date: Date;
  read: boolean;
}

export interface StudentPlacementSummary {
  applicationId: string;
  status: ApplicationStatus;
  companyName?: string;
  companySupervisorAssigned: boolean;
  companySupervisorName?: string | null;
  acceptanceLetterVerified: boolean;
  internshipDatesSet: boolean;
  /** Öğrenci logbook'u şirkete gönderdiği an */
  logbookSubmittedToSupervisorAt?: Date;
  /** Şirket değerlendirmeyi bitirdiği an */
  supervisorEvaluationCompletedAt?: Date;
  /** Günlük koordinatöre gönderildiyse (timeline “logbook tamam” için) */
  logbookSubmittedForCoordinatorReviewAt?: Date;
  /** Koordinatör logbook'u onayladığı an */
  logbookVerifiedByCoordinatorAt?: Date;
  /** Yerleşim: üniversite koordinatör onayı (şirketten bağımsız) */
  coordinatorPlacementApprovedAt?: Date;
  /** Yerleşim: şirket kabulü (koordinatörden bağımsız) */
  companyPlacementApprovedAt?: Date;
}

export interface StudentDashboardSummary {
  user: User;
  /** Aktif dönem yaz staj mektubu durumu (dashboard için) */
  summerTrainingLetterStatus?: SummerTrainingLetterStatus | null;
  /** Yerleşim özeti: varsa son aktif staj başvurusu (approved/ongoing/completed), yoksa en güncel başvuru */
  placementSummary?: StudentPlacementSummary | null;
  internshipStatus: ApplicationStatus;
  /** SWEN 300 rapor sayfasının açılması (tamamlanmış placement); `/api/training-reports/eligibility` ile aynı kural */
  trainingReportEligible?: boolean;
  /** Son tamamlanmış placement için SWEN300 raporu gönderilmiş veya onaylanmış */
  summerTrainingReportSubmitted?: boolean;
  applicationsCount: number;
  logbookEntriesCount: number;
  reportsCount: number;
}

export interface CoordinatorDashboardSummary {
  pendingApplications: number;
  eligibleNotApplied: number;
  ongoingInternships: number;
  completedInternships: number;
  eligibleStudents: number;
  totalUpperYearStudents: number;
}

export interface AdminDashboardSummary {
  totalUsers: number;
  eligibilityScans: number;
  approvedCompanies: number;
  activeInternships: number;
  pendingApplications: number;
}
