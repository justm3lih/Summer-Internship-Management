"use client";

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApplicationTable, ApplicationTableColumn } from "@/components/common/application-table";
import { Pagination } from "@/components/common/pagination";
import { StatusBadge } from "@/components/common/status-badge";
import { StudentDetailModal } from "@/components/coordinator/student-detail-modal";
import { StudentMonitoringFilters } from "@/components/coordinator/student-monitoring-filters";
import { useToastContext } from "@/components/providers/toast-provider";
import { Eye, Mail, FileText } from "lucide-react";
import { ApplicationStatus, EligibilityStatus } from "@/types";
import { demoStudents, demoEligibility, demoLogbookEntries, demoFinalReport } from "@/lib/demo-data";

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
  student: any;
}

export default function MonitoringPage() {
  const { showToast } = useToastContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [eligibilityFilter, setEligibilityFilter] = useState<EligibilityStatus | "all">("all");
  const [internshipStatusFilter, setInternshipStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const students: StudentRow[] = demoStudents.map((student) => ({
    id: student.id,
    name: student.name,
    studentId: student.studentId || "",
    department: student.department || "",
    semester: student.currentSemester || 7,
    eligibilityStatus: student.eligibilityStatus,
    internshipStatus: student.internshipStatus,
    logbookEntries: student.logbookEntriesCount || 0,
    reportStatus: student.reportStatus || "not_submitted",
    student: student,
  }));

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
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
  }, [searchTerm, departmentFilter, eligibilityFilter, internshipStatusFilter, reportStatusFilter, students]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setDepartmentFilter("all");
    setEligibilityFilter("all");
    setInternshipStatusFilter("all");
    setReportStatusFilter("all");
    setCurrentPage(1);
  };

  // Paginate filtered data
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, departmentFilter, eligibilityFilter, internshipStatusFilter, reportStatusFilter]);

  const handleViewDetails = (row: StudentRow) => {
    setSelectedStudent(row.student);
    setIsModalOpen(true);
  };

  const handleSendReminder = (row: StudentRow) => {
    showToast(`Reminder sent to ${row.name}`, "success");
  };

  const columns: ApplicationTableColumn[] = [
    {
      key: "name",
      label: "Student",
      render: (value, row) => (
        <div>
          <span className="font-medium">{value}</span>
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
      render: (value) => `Semester ${value}`,
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
      render: (value) => (
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>{value} entries</span>
        </div>
      ),
    },
    {
      key: "reportStatus",
      label: "Report",
      render: (value) => (
        <span className="text-xs capitalize">{value.replace("_", " ")}</span>
      ),
    },
  ];

  const actions = [
    {
      icon: Eye,
      onClick: handleViewDetails,
    },
    {
      icon: Mail,
      onClick: handleSendReminder,
      variant: "ghost" as const,
      className: "text-blue-600",
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
            {filteredStudents.length} student(s) found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApplicationTable columns={columns} data={paginatedStudents} actions={actions} />
          {filteredStudents.length > 0 && (
            <Pagination
              currentPage={currentPage}
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
          student={selectedStudent}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
