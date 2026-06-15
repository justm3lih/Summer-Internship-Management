"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2, Eye, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { 
  getCompanyInterns,
} from "@/lib/api";
import type { CompanyIntern } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { PageHeader } from "@/components/common/page-header";

export default function CompanyLogbookPage() {
  const [interns, setInterns] = useState<CompanyIntern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanyInterns().then((data) => {
      setInterns(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Intern Logbooks"
        description="Monitor daily progress, approve entries, and provide feedback to your assigned interns."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-6 w-6 animate-spin" /> Loading interns...
        </div>
      ) : interns.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No interns found</CardTitle>
            <CardDescription>You are not currently supervising any students with active logbooks.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {interns.map((intern) => (
            <Card key={intern.id} className="flex flex-col border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold">{intern.studentName}</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-semibold tracking-wider">
                      {intern.studentId}
                    </CardDescription>
                  </div>
                  <StatusBadge status={intern.status} />
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-50 p-2 rounded-md flex items-center gap-2 border border-slate-100">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Entries</span>
                      <span className="font-bold">{intern.logbookEntries} days</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-md flex items-center gap-2 border border-slate-100">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Evaluation</span>
                      <span className="font-bold text-[11px]">
                        {intern.application.supervisorEvaluationCompletedAt ? "Completed" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 italic">Progress:</span>
                      <span className={intern.application.logbookSubmittedToSupervisorAt ? "text-blue-600 font-bold" : "text-slate-400"}>
                        {intern.application.logbookSubmittedToSupervisorAt ? "Submitted" : "Ongoing"}
                      </span>
                   </div>
                   <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full transition-all" 
                        style={{ width: intern.application.supervisorEvaluationCompletedAt ? "100%" : intern.application.logbookSubmittedToSupervisorAt ? "75%" : intern.logbookEntries > 0 ? "40%" : "10%" }}
                      />
                   </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Link href={`/company/logbook/${intern.studentId}`} className="w-full">
                    <Button type="button" size="sm" variant="default" className="w-full bg-slate-800">
                      <Eye className="mr-2 h-4 w-4" /> Review Logbook
                    </Button>
                  </Link>
                </div>
                
                <div className="text-[9px] text-slate-400 flex justify-between items-center pt-2 border-t mt-auto">
                   <span>ID: {intern.studentId}</span>
                   <span>Start: {format(new Date(intern.startDate), "dd/MM/yyyy")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
