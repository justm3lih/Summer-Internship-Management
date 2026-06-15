import Link from "next/link";
import type { SummerTrainingLetterStatus } from "@/types";
import { describeApplicationLetterStatus } from "@/lib/application-letter-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ApplicationLetterProgressCardProps {
  status: SummerTrainingLetterStatus | null;
}

export function ApplicationLetterProgressCard({ status }: ApplicationLetterProgressCardProps) {
  const getStatusConfig = (s: SummerTrainingLetterStatus | null) => {
    switch (s) {
      case "approved":
        return { color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle2, border: "border-green-500/20" };
      case "advisor_pending":
      case "coordinator_pending":
        return { color: "text-blue-500", bg: "bg-blue-500/10", icon: Clock, border: "border-blue-500/20" };
      case "advisor_rejected":
      case "coordinator_rejected":
        return { color: "text-red-500", bg: "bg-red-500/10", icon: AlertCircle, border: "border-red-500/20" };
      case "draft":
        return { color: "text-amber-500", bg: "bg-amber-500/10", icon: FileText, border: "border-amber-500/20" };
      default:
        return { color: "text-muted-foreground", bg: "bg-muted", icon: FileText, border: "border-border" };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Card className="overflow-hidden border-none shadow-xl shadow-primary/5 bg-gradient-to-br from-card to-muted/30 relative">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <config.icon className="h-24 w-24" />
      </div>
      
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-2xl", config.bg, config.color)}>
              <config.icon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg tracking-tight">Application Letter</h3>
                <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", config.bg, config.color, config.border)}>
                  {status?.replace("_", " ") || "Not Started"}
                </div>
              </div>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                {describeApplicationLetterStatus(status)}
              </p>
            </div>
          </div>
          
          <Button asChild className="group shadow-lg shadow-primary/20 font-bold px-6">
            <Link href="/student/summer-training-letter" className="flex items-center gap-2">
              Review Document
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
