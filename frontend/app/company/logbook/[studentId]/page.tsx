"use client";

import { useEffect, useState, use } from "react";
import { PageHeader } from "@/components/common/page-header";
import { LogbookCalendarView } from "@/components/student/logbook-calendar-view";
import { Loader2, ArrowLeft, CheckCircle2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCompanyLogbookEntries, approveLogbookEntry, addLogbookFeedback, CompanyLogbookEntry, getCompanyInterns } from "@/lib/api";
import { LogbookEntry } from "@/types";
import { useToastContext } from "@/components/providers/toast-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

export default function CompanyLogbookPreviewPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  const { showToast } = useToastContext();
  const [entries, setEntries] = useState<CompanyLogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<CompanyLogbookEntry | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [internshipStart, setInternshipStart] = useState<string | undefined>(undefined);
  const [internshipEnd, setInternshipEnd] = useState<string | undefined>(undefined);
  const [studentName, setStudentName] = useState<string | undefined>(undefined);

  const load = () => {
    setLoading(true);
    Promise.all([
      getCompanyLogbookEntries(studentId),
      getCompanyInterns()
    ]).then(([list, internsList]) => {
      setEntries(list);
      const internInfo = internsList.find(i => i.id === studentId || i.studentId === studentId || i.application?.studentId === studentId);
      if (internInfo) {
        setStudentName(internInfo.studentName);
        if (internInfo.application) {
          setInternshipStart(internInfo.application.internshipStartDate?.toString());
          setInternshipEnd(internInfo.application.internshipEndDate?.toString());
        }
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, [studentId]);

  const handleDateClick = (date: Date, entry?: LogbookEntry) => {
    if (entry) {
      const companyEntry = entry as CompanyLogbookEntry;
      setSelectedEntry(companyEntry);
      setFeedback(companyEntry.supervisorFeedback || "");
    }
  };

  const handleApprove = async () => {
    if (!selectedEntry) return;
    setIsSubmitting(true);
    const res = await approveLogbookEntry(selectedEntry.id);
    setIsSubmitting(false);
    if (res.success) {
      showToast("Entry approved", "success");
      setSelectedEntry(null);
      load();
    } else {
      showToast(res.message || "Failed to approve", "error");
    }
  };

  const handleSendFeedback = async () => {
    if (!selectedEntry) return;
    setIsSubmitting(true);
    const res = await addLogbookFeedback(selectedEntry.id, feedback);
    setIsSubmitting(false);
    if (res.success) {
      showToast("Feedback sent", "success");
      setSelectedEntry(null);
      load();
    } else {
      showToast(res.message || "Failed to send feedback", "error");
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
          title="Logbook Review" 
          description={studentName ? `Reviewing logbook for ${studentName}` : `Reviewing logbook for student ${studentId}`} 
        />
        <Link href="/company/logbook">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
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
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Review Logbook Entry</DialogTitle>
            <DialogDescription>
              {selectedEntry?.date ? format(new Date(selectedEntry.date), "PPP") : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-6 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description of Work</label>
                <div className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {selectedEntry.description || "No description provided."}
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Supervisor Feedback</label>
                 <Textarea 
                   placeholder="Enter any necessary feedback or revisions here before returning to student..."
                   value={feedback}
                   onChange={(e) => setFeedback(e.target.value)}
                   disabled={!!selectedEntry.supervisorApprovedAt || isSubmitting}
                   className="min-h-[80px]"
                 />
              </div>

              {!selectedEntry.supervisorApprovedAt ? (
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={handleSendFeedback}
                    disabled={isSubmitting || !feedback.trim()}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" /> Send Feedback
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700" 
                    onClick={handleApprove}
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Entry
                  </Button>
                </div>
              ) : (
                <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm text-center font-medium border border-green-200">
                  <CheckCircle2 className="inline-block mr-2 h-4 w-4 mb-0.5" />
                  This entry was approved on {format(new Date(selectedEntry.supervisorApprovedAt), "PPp")}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
