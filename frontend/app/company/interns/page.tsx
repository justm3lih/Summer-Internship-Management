"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, FileCheck, GraduationCap, CheckCircle2 } from "lucide-react";
import type { CompanyIntern, Application } from "@/types";
import {
  assignApplicationCompanySupervisor,
  getCompanyInterns,
  listCompanyStaff,
  type CompanyStaffMember,
} from "@/lib/api";
import { format } from "date-fns";
import { ApplicationDetailModal } from "@/components/application/application-detail-modal";
import { StudentEvaluationModal } from "@/components/company/student-evaluation-modal";
import { StatusBadge } from "@/components/common/status-badge";
import { usePermissions } from "@/lib/use-permissions";
import { isCompanyPrimaryPortal } from "@/lib/permissions";
import { useToastContext } from "@/components/providers/toast-provider";

const UNASSIGNED = "__unassigned__";

export default function InternsPage() {
  const { user, loading: userLoading, can } = usePermissions();
  const { showToast } = useToastContext();
  const [interns, setInterns] = useState<CompanyIntern[]>([]);
  const [staffList, setStaffList] = useState<CompanyStaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIntern, setSelectedIntern] = useState<CompanyIntern | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const isPrimary = user ? isCompanyPrimaryPortal(user) : false;
  const canEditPlacement = can("applications.review") || can("applications.comment");

  const handlePlacementSaved = (updated: Application) => {
    setInterns((prev) =>
      prev.map((row) =>
        row.application.id === updated.id ? { ...row, application: updated } : row
      )
    );
    setSelectedIntern((cur) =>
      cur?.application.id === updated.id ? { ...cur, application: updated } : cur
    );
  };

  useEffect(() => {
    let isMounted = true;

    const loadInterns = async () => {
      setIsLoading(true);
      const data = await getCompanyInterns();
      if (!isMounted) return;
      setInterns(data);
      setIsLoading(false);
    };

    loadInterns();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isPrimary || userLoading) return;
    let ok = true;
    listCompanyStaff().then((rows) => {
      if (ok) setStaffList(rows);
    });
    return () => {
      ok = false;
    };
  }, [isPrimary, userLoading]);

  const handleSupervisorChange = async (intern: CompanyIntern, value: string) => {
    const supervisorId = value === UNASSIGNED ? null : value;
    setAssigningId(intern.id);
    const result = await assignApplicationCompanySupervisor(intern.application.id, supervisorId);
    setAssigningId(null);
    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    const nameLookup = new Map(staffList.map((s) => [s.id, s.name]));
    setInterns((prev) =>
      prev.map((row) =>
        row.id === intern.id
          ? {
              ...row,
              application: result.application,
              companySupervisorUserId: result.application.companySupervisorUserId ?? null,
              companySupervisorName: result.application.companySupervisorUserId
                ? nameLookup.get(result.application.companySupervisorUserId) ?? null
                : null,
            }
          : row
      )
    );
    showToast("Supervisor assignment updated.", "success");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Supervise Interns</h1>
        <p className="text-muted-foreground">
          Monitor and provide feedback to your interns
          {!isPrimary && user?.role === "company"
            ? ". Your primary contact assigns interns to your account."
            : null}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Interns</CardTitle>
          <CardDescription>
            {isLoading ? "Loading assigned interns..." : "Students currently interning at your company"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Logbook Entries</TableHead>
                <TableHead>Report</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && interns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No interns assigned yet
                  </TableCell>
                </TableRow>
              )}
              {interns.map((intern) => {
                const selectValue = intern.companySupervisorUserId ?? UNASSIGNED;
                return (
                  <TableRow key={intern.id}>
                    <TableCell className="font-medium">{intern.studentName}</TableCell>
                    <TableCell>{intern.studentId}</TableCell>
                    <TableCell>{format(intern.startDate, "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <StatusBadge status={intern.status} />
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      {isPrimary ? (
                        <Select
                          value={selectValue}
                          disabled={assigningId === intern.id || staffList.length === 0}
                          onValueChange={(v) => void handleSupervisorChange(intern, v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={staffList.length === 0 ? "Add staff first" : "Assign"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED}>Not assigned</SelectItem>
                            {staffList.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {intern.companySupervisorName ?? "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{intern.logbookEntries}</TableCell>
                    <TableCell>
                      {intern.reportSubmitted ? (
                        <FileCheck className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedIntern(intern);
                            setIsModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {intern.application.logbookSubmittedToSupervisorAt && !intern.application.supervisorEvaluationCompletedAt && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 bg-amber-500 hover:bg-amber-600 text-white font-bold"
                            onClick={() => {
                              setSelectedIntern(intern);
                              setIsEvalModalOpen(true);
                            }}
                          >
                            <GraduationCap className="h-4 w-4 mr-2" />
                            Evaluate
                          </Button>
                        )}
                        {intern.application.supervisorEvaluationCompletedAt && (
                          <div className="flex items-center gap-1 text-green-600 text-[10px] font-bold uppercase ml-2">
                            <CheckCircle2 className="h-3 w-3" />
                            Rated
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ApplicationDetailModal
        application={selectedIntern?.application || null}
        company={selectedIntern?.application.company || null}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        placementEditorRole={canEditPlacement ? "company" : undefined}
        onPlacementSaved={handlePlacementSaved}
      />

      <StudentEvaluationModal
        application={selectedIntern?.application || null}
        isOpen={isEvalModalOpen}
        onClose={() => setIsEvalModalOpen(false)}
        onSaved={handlePlacementSaved}
      />
    </div>
  );
}
