"use client";

import { useState, useMemo, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Circle, MessageSquare } from "lucide-react";
import { LogbookEntry } from "@/types";

interface LogbookCalendarViewProps {
  entries: LogbookEntry[];
  onDateClick: (date: Date, entry?: LogbookEntry) => void;
  internshipStart?: Date | string;
  internshipEnd?: Date | string;
}

export function LogbookCalendarView({ entries, onDateClick, internshipStart, internshipEnd }: LogbookCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const parseDateRobust = (val: Date | string | null | undefined): Date | null => {
    if (val == null || val === "") return null;
    if (val instanceof Date) return val;
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    try {
      const p = parseISO(val);
      if (!isNaN(p.getTime())) return p;
    } catch {}
    return null;
  };

  const parsedStart = useMemo(() => parseDateRobust(internshipStart), [internshipStart]);
  const parsedEnd = useMemo(() => parseDateRobust(internshipEnd), [internshipEnd]);

  useEffect(() => {
    if (parsedStart) {
      setCurrentMonth(parsedStart);
    }
  }, [parsedStart]);

  const isWithinRange = (date: Date) => {
    if (!parsedStart || !parsedEnd) return true;
    // Normalize dates to midnight for comparison
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const s = new Date(parsedStart);
    s.setHours(0, 0, 0, 0);
    const e = new Date(parsedEnd);
    e.setHours(0, 0, 0, 0);
    return d >= s && d <= e;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startDate,
      end: endDate,
    });
  }, [startDate, endDate]);

  const entriesMap = useMemo(() => {
    const map = new Map<string, LogbookEntry>();
    entries.forEach((entry) => {
      try {
        const d = typeof entry.date === "string" ? parseISO(entry.date) : new Date(entry.date);
        if (!isNaN(d.getTime())) {
          const dateKey = format(d, "yyyy-MM-dd");
          map.set(dateKey, entry);
        }
      } catch (e) {
        // Skip invalid dates
      }
    });
    return map;
  }, [entries]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="space-y-6 relative">
      {/* Background decoration */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent capitalize">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <p className="text-sm text-muted-foreground">Manage your daily internship activities</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl border border-border/50 backdrop-blur-sm">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 hover:bg-background">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 hover:bg-background">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-md shadow-2xl shadow-primary/5 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div
              key={day}
              className="py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-border/20">
          {calendarDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const entry = entriesMap.get(dateKey);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const today = isToday(day);
            const inRange = isWithinRange(day);
            
            let statusStyles = "bg-background/80 hover:bg-muted/50";
            let dotColor = "bg-muted-foreground/20";
            let indicator = null;

            if (entry) {
              if (entry.supervisorApprovedAt) {
                statusStyles = "bg-green-500/5 hover:bg-green-500/10 border-green-500/10";
                dotColor = "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]";
                indicator = <CheckCircle2 className="h-3 w-3 text-green-500/50" />;
              } else {
                statusStyles = "bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/10";
                dotColor = "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]";
                indicator = <Clock className="h-3 w-3 text-blue-500/50" />;
              }
            } else if (!isCurrentMonth || !inRange) {
               statusStyles = "bg-muted/10 opacity-30 cursor-default";
            }

            return (
              <button
                key={day.toString()}
                onClick={() => (entry ? onDateClick(day, entry) : (isCurrentMonth && inRange && onDateClick(day, entry)))}
                disabled={!entry && (!isCurrentMonth || !inRange)}
                className={cn(
                  "relative min-h-[100px] p-3 transition-all duration-300 flex flex-col items-start group",
                  statusStyles,
                  today && "ring-2 ring-inset ring-primary/30 z-10 bg-primary/5",
                  (!entry && (!isCurrentMonth || !inRange)) && "pointer-events-none"
                )}
              >
                <div className="w-full flex justify-between items-start">
                  <span
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      (!isCurrentMonth || !inRange) ? "text-muted-foreground/40" : "text-foreground",
                      today && "text-primary scale-110"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {indicator}
                </div>
                
                {entry && (
                  <div className="mt-2 w-full space-y-1.5 overflow-hidden">
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity">
                      {entry.description}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <div className={cn("h-1.5 w-1.5 rounded-full transition-all duration-300 group-hover:scale-150", dotColor)} />
                      <span className="text-[10px] font-bold text-foreground/70 bg-muted px-1.5 py-0.5 rounded-md border border-border/50">
                        {entry.hoursWorked}h
                      </span>
                    </div>
                  </div>
                )}

                {!entry && isCurrentMonth && (
                   <div className="mt-auto opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
                   </div>
                )}

                {entry?.supervisorFeedback && (
                   <div className="absolute top-2 right-2 flex items-center justify-center">
                      <div className="absolute h-3 w-3 rounded-full bg-amber-500/40 animate-ping" />
                      <div className="relative h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                   </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { color: "bg-green-500", label: "Approved", icon: CheckCircle2, text: "Signed off by supervisor" },
          { color: "bg-blue-500", label: "Pending", icon: Clock, text: "Awaiting review" },
          { color: "bg-amber-500", label: "Feedback", icon: MessageSquare, text: "Review required" },
          { color: "bg-muted-foreground/30", label: "Empty", icon: Circle, text: "No activity recorded" }
        ].map((item) => (
          <div key={item.label} className="group p-4 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("p-2 rounded-lg", item.color, "bg-opacity-10")}>
                <item.icon className={cn("h-4 w-4", item.color.replace("bg-", "text-"))} />
              </div>
              <span className="font-bold text-sm">{item.label}</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
