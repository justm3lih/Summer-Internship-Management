"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ApplicationTable,
  ApplicationTableAction,
  ApplicationTableColumn,
} from "@/components/common/application-table";
import { Pagination } from "@/components/common/pagination";
import { StatusBadge } from "@/components/common/status-badge";
import { StudentDetailModal } from "@/components/coordinator/student-detail-modal";
import { StudentMonitoringFilters } from "@/components/coordinator/student-monitoring-filters";
import { Eye, FileText } from "lucide-react";
import { ApplicationStatus, CoordinatorStudentMonitoring, EligibilityStatus } from "@/types";
import { getCoordinatorMonitoring } from "@/lib/api";
import { fetchStudentDepartments } from "@/lib/departments";
import Link from "next/link";

interface StudentRow {
  id: string;
  name: string;
  studentId: string;
  department: string;
  semester: number;
  eligibilityStatus: EligibilityStatus;
  internshipStatus: ApplicationStatus;
  logbookEntries: number;
  reportStatus: string;
  student: CoordinatorStudentMonitoring;
}

export default function MonitoringPage() {
  const [students, setStudents] = useState<CoordinatorStudentMonitoring[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [eligibilityFilter, setEligibilityFilter] = useState<EligibilityStatus | "all">("all");
  const [internshipStatusFilter, setInternshipStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStudent, setSelectedStudent] = useState<CoordinatorStudentMonitoring | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deptListSettings, setDeptListSettings] = useState<string[]>([]);

  const refetchStudents = useCallback(async () => {
    const [data, depts] = await Promise.all([
      getCoordinatorMonitoring(),
      fetchStudentDepartments(),
    ]);
    setStudents(data);
    setDeptListSettings(depts);
    setSelectedStudent((prev) => {
      if (!prev) return null;
      return data.find((s) => s.id === prev.id) ?? prev;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      const [data, depts] = await Promise.all([
        getCoordinatorMonitoring(),
        fetchStudentDepartments(),
      ]);
      if (!isMounted) return;
      setStudents(data);
      setDeptListSettings(depts);
      setIsLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const filterDepartmentOptions = useMemo(() => {
    const set = new Set<string>(deptListSettings);
    students.forEach((s) => {
      const d = s.department?.trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [deptListSettings, students]);

  const studentRows: StudentRow[] = useMemo(
    () =>
      students.map((student) => ({
        id: student.id,
        name: student.name,
        studentId: student.studentId || "",
        department: student.department || "",
        semester: student.currentSemester || 0,
        eligibilityStatus: student.eligibilityStatus,
        internshipStatus: student.internshipStatus,
        logbookEntries: student.logbookEntriesCount,
        reportStatus: student.reportStatus,
        student,
      })),
    [students]
  );

  const filteredStudents = useMemo(() => {
    return studentRows.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.includes(searchTerm);
      const matchesDepartment = departmentFilter === "all" || student.department === departmentFilter;
      const matchesEligibility =
        eligibilityFilter === "all" || student.eligibilityStatus === eligibilityFilter;
      const matchesInternshipStatus =
        internshipStatusFilter === "all" || student.internshipStatus === internshipStatusFilter;
      const matchesReportStatus =
        reportStatusFilter === "all" || student.reportStatus === reportStatusFilter;
      return (
        matchesSearch &&
        matchesDepartment &&
        matchesEligibility &&
        matchesInternshipStatus &&
        matchesReportStatus
      );
    });
  }, [searchTerm, departmentFilter, eligibilityFilter, internshipStatusFilter, reportStatusFilter, studentRows]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setDepartmentFilter("all");
    setEligibilityFilter("all");
    setInternshipStatusFilter("all");
    setReportStatusFilter("all");
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Paginate filtered data
  const paginatedStudents = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, safeCurrentPage, pageSize]);

  const handleViewDetails = (row: StudentRow) => {
    setSelectedStudent(row.student);
    setIsModalOpen(true);
  };

  const columns: ApplicationTableColumn<StudentRow>[] = [
    {
      key: "name",
      label: "Student",
      render: (value, row) => (
        <div>
          <span className="font-medium">{value as string}</span>
          <p className="text-xs text-muted-foreground">ID: {row.studentId}</p>
        </div>
      ),
    },
    {
      key: "department",
      label: "Department",
    },
    {
      key: "semester",
      label: "Semester",
      render: (value) => `Semester ${value as number}`,
    },
    {
      key: "eligibilityStatus",
      label: "Eligibility",
      render: (value) => <StatusBadge status={value as EligibilityStatus} type="eligibility" />,
    },
    {
      key: "internshipStatus",
      label: "Internship Status",
      render: (value) => <StatusBadge status={value as ApplicationStatus} />,
    },
    {
      key: "logbookEntries",
      label: "Logbook",
      render: (value, row) => (
        <Link href={`/coordinator/logbooks/${row.id}`} className="text-blue-600 hover:underline font-medium">
          {value as number} entries
        </Link>
      ),
    },
    {
      key: "reportStatus",
      label: "Report",
      render: (value) => (
        <span className="text-xs capitalize">{String(value).replace("_", " ")}</span>
      ),
    },
  ];

  const actions: ApplicationTableAction<StudentRow>[] = [
    {
      icon: Eye,
      onClick: handleViewDetails,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Monitoring"
        description="Monitor department students and their internship progress"
      />

      <StudentMonitoringFilters
        searchTerm={searchTerm}
        departmentFilter={departmentFilter}
        departmentOptions={filterDepartmentOptions}
        eligibilityFilter={eligibilityFilter}
        internshipStatusFilter={internshipStatusFilter}
        reportStatusFilter={reportStatusFilter}
        onSearchChange={setSearchTerm}
        onDepartmentFilterChange={setDepartmentFilter}
        onEligibilityFilterChange={setEligibilityFilter}
        onInternshipStatusFilterChange={setInternshipStatusFilter}
        onReportStatusFilterChange={setReportStatusFilter}
        onClearFilters={handleClearFilters}
      />

      <Card>
        <CardHeader>
          <CardTitle>Department Students</CardTitle>
          <CardDescription>
            {isLoading ? "Loading monitoring data..." : `${filteredStudents.length} student(s) found`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApplicationTable<StudentRow> columns={columns} data={paginatedStudents} actions={actions} />
          {filteredStudents.length > 0 && (
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredStudents.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <StudentDetailModal
          key={`${selectedStudent.id}-${selectedStudent.department || ""}-${selectedStudent.advisorUserId ?? ""}-${selectedStudent.summerTrainingLetterStatus ?? ""}`}
          student={selectedStudent}
          departmentOptions={deptListSettings}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onDepartmentUpdated={refetchStudents}
          onAdvisorUpdated={refetchStudents}
        />
      )}
    </div>
  );
}
