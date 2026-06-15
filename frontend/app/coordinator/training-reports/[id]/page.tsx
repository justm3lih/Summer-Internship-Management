"use client";

import { useEffect, useState, use } from "react";
import { PageHeader } from "@/components/common/page-header";
import { getTrainingReportById } from "@/lib/api";
import type { TrainingReportDetail } from "@/types";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CoordinatorTrainingReportPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<(TrainingReportDetail & { studentName?: string; studentNumber?: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrainingReportById(id).then((res) => {
      if (res.success) {
        setReport(res.report as any);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading report...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader title="Report Not Found" description="The requested training report could not be found." />
        <Link href="/coordinator/training-reports">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
        </Link>
      </div>
    );
  }

  const { content } = report;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Training Report Preview" 
          description={`Report for ${report.studentName || "Student"} (${report.studentNumber || "N/A"})`} 
        />
        <Link href="/coordinator/training-reports">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        </Link>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Report Details</CardTitle>
            <StatusBadge status={report.status as any} />
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Last Updated: {report.updatedAt ? format(new Date(report.updatedAt), "PPP p") : "Unknown"}
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          
          <Section title="1. Introduction">
            <RichText html={content.introduction} />
            {(content.introductionSections || []).map((sec, i) => (
              <div key={i} className="mt-4">
                <h4 className="font-semibold text-sm mb-1">{sec.title}</h4>
                <RichText html={sec.body} />
              </div>
            ))}
          </Section>

          <Section title="2. Information About the Company">
            <RichText html={content.companyIntro} />
            <h4 className="font-semibold text-sm mt-4 mb-1">2.1 Aim and Establishment</h4>
            <RichText html={content.company21} />
            <h4 className="font-semibold text-sm mt-4 mb-1">2.2 Administrative Setup</h4>
            <RichText html={content.company22} />
            {(content.companySections || []).map((sec, i) => (
              <div key={i} className="mt-4">
                <h4 className="font-semibold text-sm mb-1">{sec.title}</h4>
                <RichText html={sec.body} />
              </div>
            ))}
          </Section>

          <Section title="3. Introduction to the Work Done">
            <RichText html={content.workDoneIntro} />
            <div className="mt-4">
              <h4 className="font-semibold text-sm mb-1">Problem Definition</h4>
              <RichText html={content.problemDefinition} />
            </div>
            <div className="mt-4">
              <h4 className="font-semibold text-sm mb-1">Work Experience Intro</h4>
              <RichText html={content.workExperienceIntro} />
            </div>
          </Section>

          <Section title="4. Detailed Report on Work Done">
             <div className="mt-4 p-4 border rounded-md bg-slate-50/50">
               <h4 className="font-semibold text-sm mb-2">{content.task1Title || "Task 1"}</h4>
               <RichText html={content.task1Body} />
             </div>
             <div className="mt-4 p-4 border rounded-md bg-slate-50/50">
               <h4 className="font-semibold text-sm mb-2">{content.task2Title || "Task 2"}</h4>
               <RichText html={content.task2Body} />
             </div>
            {(content.workExperienceSections || []).map((sec, i) => (
              <div key={i} className="mt-4 p-4 border rounded-md bg-slate-50/50">
                <h4 className="font-semibold text-sm mb-2">{sec.title}</h4>
                <RichText html={sec.body} />
              </div>
            ))}
          </Section>

          <Section title="5. Conclusions">
            <div className="mt-2 mb-4">
              <h4 className="font-semibold text-sm mb-1">Limitations</h4>
              <RichText html={content.limitations} />
            </div>
            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-1">Recent Topics</h4>
              <RichText html={content.recentTopics} />
            </div>
            <h4 className="font-semibold text-sm mb-1">Conclusion</h4>
            <RichText html={content.conclusion} />
            {(content.conclusionSections || []).map((sec, i) => (
              <div key={i} className="mt-4">
                <h4 className="font-semibold text-sm mb-1">{sec.title}</h4>
                <RichText html={sec.body} />
              </div>
            ))}
          </Section>

          <Section title="6. References">
            {(content.references || []).length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {(content.references || []).map((ref, i) => (
                  <li key={i} className="text-sm">[{i + 1}] {ref}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No references provided.</p>
            )}
          </Section>

          <Section title="7. Appendix">
             <RichText html={content.appendix} />
          </Section>

          {(report.figures || []).length > 0 && (
            <Section title="Figures">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {report.figures.map((fig) => (
                  <div key={fig.id} className="border rounded p-2 text-center bg-slate-50">
                    <img 
                      src={`/api/files/${fig.fileId}`} 
                      alt={fig.caption} 
                      className="max-h-60 mx-auto object-contain mb-2 rounded"
                    />
                    <p className="text-xs font-semibold text-slate-700">Figure {fig.sortOrder}: {fig.caption}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-bold text-slate-900 border-b pb-1">{title}</h3>
      <div className="text-slate-700 text-sm">{children}</div>
    </div>
  );
}

function RichText({ html }: { html: string }) {
  if (!html) return <p className="text-slate-400 italic text-sm">Empty section.</p>;
  return <div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: html }} />;
}
