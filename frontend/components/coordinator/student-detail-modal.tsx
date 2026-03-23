"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToastContext } from "@/components/providers/toast-provider";
import { FileText, BookOpen, MessageSquare, Mail, CheckCircle2 } from "lucide-react";
import { ApplicationStatus, EligibilityStatus } from "@/types";
import { demoEligibility, demoLogbookEntries, demoFinalReport } from "@/lib/demo-data";
import { format } from "date-fns";

interface StudentDetailModalProps {
  student: any;
  isOpen: boolean;
  onClose: () => void;
}

export function StudentDetailModal({
  student,
  isOpen,
  onClose,
}: StudentDetailModalProps) {
  const { showToast } = useToastContext();
  const [note, setNote] = useState("");

  const handleSendReminder = () => {
    showToast(`Reminder sent to ${student.name}`, "success");
  };

  const handleAddNote = () => {
    if (note.trim()) {
      showToast("Internal note added", "success");
      setNote("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Details: {student.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
            <TabsTrigger value="logbook">Logbook</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Student ID</Label>
                <p className="text-sm font-medium">{student.studentId}</p>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <p className="text-sm font-medium">{student.department}</p>
              </div>
              <div className="space-y-2">
                <Label>Current Semester</Label>
                <p className="text-sm font-medium">Semester {student.currentSemester}</p>
              </div>
              <div className="space-y-2">
                <Label>Internship Status</Label>
                <StatusBadge status={student.internshipStatus as ApplicationStatus} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Actions</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSendReminder}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Reminder
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  placeholder="Add internal notes about this student..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleAddNote} size="sm">
                  Add Note
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="eligibility" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Eligibility Status</h3>
                <StatusBadge
                  status={demoEligibility.status}
                  type="eligibility"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  {demoEligibility.passedCourses} / {demoEligibility.requiredCourses} required
                  courses passed
                </p>
                <div className="space-y-2">
                  <Label>Passed Courses</Label>
                  <div className="space-y-1">
                    {demoEligibility.courses
                      .filter((c) => c.passed)
                      .map((course) => (
                        <div
                          key={course.code}
                          className="flex items-center justify-between rounded-lg border p-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{course.code}</p>
                            <p className="text-xs text-muted-foreground">{course.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Semester {course.semester}</span>
                            {course.grade && (
                              <span className="text-sm font-medium">{course.grade}</span>
                            )}
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logbook" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Logbook Entries</h3>
                <span className="text-sm text-muted-foreground">
                  {demoLogbookEntries.length} total entries
                </span>
              </div>
              <div className="space-y-2">
                {demoLogbookEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">
                          {format(entry.date, "MMM dd, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.hoursWorked} hours worked
                        </p>
                      </div>
                    </div>
                    <p className="text-sm mb-2">{entry.description}</p>
                    {entry.supervisorFeedback && (
                      <div className="mt-2 rounded-lg bg-muted p-2">
                        <p className="text-xs font-medium mb-1">Supervisor Feedback:</p>
                        <p className="text-xs">{entry.supervisorFeedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="report" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Final Report Status</h3>
                <StatusBadge
                  status={
                    demoFinalReport.status === "not_submitted"
                      ? "not_applied"
                      : demoFinalReport.status === "approved"
                      ? "approved"
                      : demoFinalReport.status === "rejected"
                      ? "rejected"
                      : "pending"
                  }
                />
              </div>
              {demoFinalReport.submittedDate && (
                <div className="space-y-2">
                  <Label>Submitted Date</Label>
                  <p className="text-sm">
                    {format(demoFinalReport.submittedDate, "MMM dd, yyyy")}
                  </p>
                </div>
              )}
              {demoFinalReport.coordinatorFeedback && (
                <div className="space-y-2">
                  <Label>Your Feedback</Label>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm">{demoFinalReport.coordinatorFeedback}</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
