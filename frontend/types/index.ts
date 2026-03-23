export type UserRole = "student" | "coordinator" | "company" | "admin";

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
  photo?: string;
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
}

export interface Company {
  id: string;
  name: string;
  sector: string;
  location: string;
  description: string;
  positionsOffered: number;
  averageRating?: number;
  approved: boolean;
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
