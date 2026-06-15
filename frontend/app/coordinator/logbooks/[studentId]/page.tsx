"use client";

import { useEffect, useState, use } from "react";
import { PageHeader } from "@/components/common/page-header";
import { LogbookCalendarView } from "@/components/student/logbook-calendar-view";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getLogbookByStudentIdForCoordinator, getCoordinatorMonitoring } from "@/lib/api";
import { LogbookEntry } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

export default function CoordinatorLogbookPreviewPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);
  const [internshipStart, setInternshipStart] = useState<string | undefined>(undefined);
  const [internshipEnd, setInternshipEnd] = useState<string | undefined>(undefined);
  const [studentName, setStudentName] = useState<string | undefined>(undefined);

  useEffect(() => {
    Promise.all([
      getLogbookByStudentIdForCoordinator(studentId),
      getCoordinatorMonitoring()
    ]).then(([list, monitoringList]) => {
      setEntries(list);
      const studentInfo = monitoringList.find(s => s.id === studentId || s.studentId === studentId);
      if (studentInfo) {
        setStudentName(studentInfo.name);
        if (studentInfo.latestApplication) {
          setInternshipStart(studentInfo.latestApplication.internshipStartDate?.toString());
          setInternshipEnd(studentInfo.latestApplication.internshipEndDate?.toString());
        }
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [studentId]);

  const handleDateClick = (date: Date, entry?: LogbookEntry) => {
    if (entry) {
      setSelectedEntry(entry);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading logbook...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Logbook View" 
          description={studentName ? `Viewing logbook entries for ${studentName}` : `Viewing logbook entries for student ${studentId}`} 
        />
        <Link href="/coordinator/logbooks">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
        </Link>
      </div>
      <div className="bg-slate-50 p-6 rounded-lg border">
         <LogbookCalendarView 
           entries={entries} 
           onDateClick={handleDateClick} 
           internshipStart={internshipStart}
           internshipEnd={internshipEnd}
         />
      </div>

      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Logbook Entry Details</DialogTitle>
            <DialogDescription>
              {selectedEntry?.date ? format(new Date(selectedEntry.date), "PPP") : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description of Work</label>
                <div className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap leading-relaxed">
                  {selectedEntry.description || "No description provided."}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hours Worked</label>
                  <div className="font-medium">{selectedEntry.hoursWorked}h</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                  <div className="font-medium">
                    {selectedEntry.supervisorApprovedAt ? "Approved" : "Pending / Draft"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
