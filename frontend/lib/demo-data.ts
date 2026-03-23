import { User, UserRole, ApplicationStatus, EligibilityStatus, Company, Application, LogbookEntry, FinalReport } from "@/types";

export const demoStudent: User = {
  id: "1",
  email: "student@university.edu",
  name: "John Doe",
  role: "student",
  studentId: "2021001",
  department: "Computer Science",
  currentSemester: 7,
  photo: "https://ui-avatars.com/api/?size=100&name=John+Doe",
};

export const demoEligibility = {
  status: "eligible" as EligibilityStatus,
  passedCourses: 6,
  requiredCourses: 5,
  courses: [
    { code: "CS301", name: "Advanced Programming", semester: 5, passed: true, grade: "A" },
    { code: "CS302", name: "Data Structures", semester: 5, passed: true, grade: "B+" },
    { code: "CS401", name: "Database Systems", semester: 6, passed: true, grade: "A-" },
    { code: "CS402", name: "Software Engineering", semester: 6, passed: true, grade: "B" },
    { code: "CS501", name: "Machine Learning", semester: 7, passed: true, grade: "A" },
    { code: "CS502", name: "Web Development", semester: 7, passed: true, grade: "A-" },
  ],
};

export const demoCompanies: Company[] = [
  {
    id: "1",
    name: "Tech Solutions Inc.",
    sector: "Technology",
    location: "Nicosia",
    description: "Leading software development company specializing in enterprise solutions.",
    positionsOffered: 5,
    averageRating: 4.5,
    approved: true,
  },
  {
    id: "2",
    name: "Digital Innovations",
    sector: "Software",
    location: "Limassol",
    description: "Innovative startup focused on AI and machine learning applications.",
    positionsOffered: 3,
    averageRating: 4.8,
    approved: true,
  },
  {
    id: "3",
    name: "Cyprus Tech Hub",
    sector: "IT Services",
    location: "Nicosia",
    description: "Full-service IT consulting and development firm.",
    positionsOffered: 4,
    averageRating: 4.2,
    approved: true,
  },
  {
    id: "4",
    name: "Cloud Systems Ltd",
    sector: "Cloud Computing",
    location: "Larnaca",
    description: "Cloud infrastructure and DevOps solutions provider.",
    positionsOffered: 2,
    averageRating: 4.6,
    approved: true,
  },
  {
    id: "5",
    name: "Mobile Apps Co",
    sector: "Mobile Development",
    location: "Paphos",
    description: "Mobile app development for iOS and Android platforms.",
    positionsOffered: 3,
    averageRating: 4.4,
    approved: true,
  },
];

export const demoApplications: Application[] = [
  {
    id: "1",
    studentId: "2021001",
    companyId: "1",
    status: "pending",
    appliedDate: new Date("2024-03-15"),
    documents: {
      cv: "/documents/cv.pdf",
      motivationLetter: "/documents/motivation.pdf",
      transcript: "/documents/transcript.pdf",
    },
    coordinatorComments: undefined,
    companyComments: undefined,
  },
  {
    id: "2",
    studentId: "2021001",
    companyId: "2",
    status: "approved",
    appliedDate: new Date("2024-03-10"),
    documents: {
      cv: "/documents/cv.pdf",
      motivationLetter: "/documents/motivation.pdf",
      transcript: "/documents/transcript.pdf",
    },
    coordinatorComments: "Student meets all requirements. Approved for internship.",
    companyComments: "Looking forward to working with this candidate.",
  },
];

export const demoLogbookEntries: LogbookEntry[] = [
  {
    id: "1",
    studentId: "2021001",
    date: new Date("2024-06-01"),
    description: "Orientation day. Met with supervisor and team members. Reviewed project requirements.",
    hoursWorked: 8,
    attachments: ["/attachments/orientation.jpg"],
    supervisorFeedback: "Great first day! Keep up the enthusiasm.",
    supervisorId: "super1",
  },
  {
    id: "2",
    studentId: "2021001",
    date: new Date("2024-06-02"),
    description: "Started working on frontend development. Set up development environment and began implementing user interface components.",
    hoursWorked: 7.5,
    attachments: [],
    supervisorFeedback: undefined,
    supervisorId: undefined,
  },
  {
    id: "3",
    studentId: "2021001",
    date: new Date("2024-06-03"),
    description: "Continued frontend work. Implemented authentication flow and user dashboard.",
    hoursWorked: 8,
    attachments: ["/attachments/dashboard.png"],
    supervisorFeedback: "Excellent progress on the dashboard implementation.",
    supervisorId: "super1",
  },
];

export const demoFinalReport: FinalReport = {
  id: "1",
  studentId: "2021001",
  submittedDate: undefined,
  fileUrl: undefined,
  status: "not_submitted",
  coordinatorFeedback: undefined,
  companyFeedback: undefined,
};

export const demoNotifications: Array<{
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  date: Date;
  read: boolean;
}> = [
  {
    id: "1",
    title: "You are now eligible for internship!",
    message: "You can now apply for summer internships.",
    type: "success" as const,
    date: new Date("2024-03-14"),
    read: false,
  },
  {
    id: "2",
    title: "Application Approved",
    message: "Your application to Digital Innovations has been approved by the coordinator.",
    type: "info" as const,
    date: new Date("2024-03-12"),
    read: false,
  },
  {
    id: "3",
    title: "Transcript Processing Complete",
    message: "Your transcript has been scanned and processed.",
    type: "info" as const,
    date: new Date("2024-03-10"),
    read: true,
  },
];

export const demoTranscriptHistory = [
  {
    id: "1",
    uploadedDate: new Date("2024-03-10"),
    fileName: "transcript_spring_2024.pdf",
    status: "processed",
    coursesDetected: 6,
    eligibilityStatus: "eligible",
  },
  {
    id: "2",
    uploadedDate: new Date("2024-01-15"),
    fileName: "transcript_fall_2023.pdf",
    status: "processed",
    coursesDetected: 4,
    eligibilityStatus: "almost_eligible",
  },
];

// Coordinator Demo Data
export const demoCoordinator = {
  id: "coord1",
  name: "Dr. Sarah Johnson",
  email: "coordinator@university.edu",
  role: "coordinator" as UserRole,
  department: "Computer Science",
};

export const demoStudents = [
  {
    ...demoStudent,
    id: "1",
    name: "John Doe",
    studentId: "2021001",
    department: "Computer Science",
    currentSemester: 7,
    eligibilityStatus: "eligible" as EligibilityStatus,
    internshipStatus: "pending" as ApplicationStatus,
    applicationsCount: 2,
    logbookEntriesCount: 15,
    reportStatus: "not_submitted" as FinalReport["status"],
  },
  {
    id: "2",
    email: "jane.smith@university.edu",
    name: "Jane Smith",
    role: "student" as UserRole,
    studentId: "2021002",
    department: "Computer Science",
    currentSemester: 7,
    eligibilityStatus: "eligible" as EligibilityStatus,
    internshipStatus: "not_applied" as ApplicationStatus,
    applicationsCount: 0,
    logbookEntriesCount: 0,
    reportStatus: "not_submitted" as FinalReport["status"],
  },
  {
    id: "3",
    email: "mike.wilson@university.edu",
    name: "Mike Wilson",
    role: "student" as UserRole,
    studentId: "2021003",
    department: "Computer Science",
    currentSemester: 6,
    eligibilityStatus: "almost_eligible" as EligibilityStatus,
    internshipStatus: "not_applied" as ApplicationStatus,
    applicationsCount: 0,
    logbookEntriesCount: 0,
    reportStatus: "not_submitted" as FinalReport["status"],
  },
  {
    id: "4",
    email: "emma.brown@university.edu",
    name: "Emma Brown",
    role: "student" as UserRole,
    studentId: "2021004",
    department: "Computer Science",
    currentSemester: 7,
    eligibilityStatus: "eligible" as EligibilityStatus,
    internshipStatus: "ongoing" as ApplicationStatus,
    applicationsCount: 1,
    logbookEntriesCount: 45,
    reportStatus: "not_submitted" as FinalReport["status"],
  },
  {
    id: "5",
    email: "david.lee@university.edu",
    name: "David Lee",
    role: "student" as UserRole,
    studentId: "2021005",
    department: "Computer Science",
    currentSemester: 8,
    eligibilityStatus: "eligible" as EligibilityStatus,
    internshipStatus: "completed" as ApplicationStatus,
    applicationsCount: 1,
    logbookEntriesCount: 120,
    reportStatus: "approved" as FinalReport["status"],
  },
];

export const demoCoordinatorApplications = [
  {
    ...demoApplications[0],
    student: demoStudents[0],
    company: demoCompanies[0],
  },
  {
    id: "3",
    studentId: "2021002",
    companyId: "2",
    status: "pending" as ApplicationStatus,
    appliedDate: new Date("2024-03-16"),
    documents: {
      cv: "/documents/cv_jane.pdf",
      motivationLetter: "/documents/motivation_jane.pdf",
      transcript: "/documents/transcript_jane.pdf",
    },
    student: demoStudents[1],
    company: demoCompanies[1],
  },
  {
    id: "4",
    studentId: "2021004",
    companyId: "1",
    status: "approved" as ApplicationStatus,
    appliedDate: new Date("2024-02-20"),
    documents: {
      cv: "/documents/cv_emma.pdf",
      motivationLetter: "/documents/motivation_emma.pdf",
      transcript: "/documents/transcript_emma.pdf",
    },
    coordinatorComments: "Excellent candidate with strong academic background.",
    student: demoStudents[3],
    company: demoCompanies[0],
  },
];

export const demoCoordinatorStats = {
  pendingApplications: 2,
  eligibleNotApplied: 1,
  ongoingInternships: 1,
  totalUpperYearStudents: 25,
  eligibleStudents: 18,
  completedInternships: 1,
};

export const demoCoordinatorNotifications: Array<{
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  date: Date;
  read: boolean;
}> = [
  {
    id: "1",
    title: "New Application Received",
    message: "John Doe has submitted an application to Tech Solutions Inc.",
    type: "info" as const,
    date: new Date("2024-03-15"),
    read: false,
  },
  {
    id: "2",
    title: "Transcript Scan Needs Review",
    message: "Mike Wilson's transcript requires manual review for eligibility.",
    type: "warning" as const,
    date: new Date("2024-03-14"),
    read: false,
  },
  {
    id: "3",
    title: "Eligible Student Not Applied",
    message: "Jane Smith is eligible but hasn't applied yet. Consider sending a reminder.",
    type: "info" as const,
    date: new Date("2024-03-13"),
    read: true,
  },
];

export const demoKnowledgeBaseItems = [
  {
    id: "1",
    title: "Eligibility Requirements",
    content: "Students must pass at least 5 courses from 5th to 8th semester. Courses must be upper-level (300+ level).",
    category: "Eligibility",
    lastUpdated: new Date("2024-03-01"),
  },
  {
    id: "2",
    title: "Application Process",
    content: "Step-by-step guide: 1) Upload transcript, 2) Wait for eligibility check, 3) Apply to approved companies, 4) Await coordinator approval.",
    category: "Application",
    lastUpdated: new Date("2024-02-15"),
  },
  {
    id: "3",
    title: "Logbook Requirements",
    content: "Students must submit daily logbook entries during their internship. Each entry should include date, hours worked, and description of activities.",
    category: "Logbook",
    lastUpdated: new Date("2024-01-20"),
  },
  {
    id: "4",
    title: "Final Report Guidelines",
    content: "Final report must be submitted within 2 weeks of internship completion. Report should be 10-15 pages and include reflection on learning outcomes.",
    category: "Report",
    lastUpdated: new Date("2024-02-01"),
  },
];
