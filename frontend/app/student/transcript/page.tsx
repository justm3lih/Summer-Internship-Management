"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle } from "lucide-react";
import { useToastContext } from "@/components/providers/toast-provider";
import { getMe, getProfile, updateProfile } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const thirdYearSoftwareCourses = [
  { code: "CMPE313", name: "Object Oriented Programming" },
  { code: "CMPE343", name: "Database Management Systems and Programming-I" },
  { code: "CMPE351", name: "Operating Systems" },
  { code: "SWEN301", name: "Software Design and Architecture" },
  { code: "CMPE332", name: "Fundamentals of Computer Networks" },
  { code: "SWEN302", name: "Software Quality Assurance and Testing" },
  { code: "SWEN304", name: "Software Process and Management" },
  { code: "SWENXX2", name: "Field Elective" },
] as const;

const gradeOptions = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"] as const;
const passingGrades = new Set(["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D"]);

export default function TranscriptPage() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const [courseGrades, setCourseGrades] = useState<Record<string, string>>(
    Object.fromEntries(thirdYearSoftwareCourses.map((course) => [course.code, ""]))
  );
  const [result, setResult] = useState<{
    passedCourses: number;
    failedCourses: number;
    status: "eligible" | "not_eligible";
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const allGradesSelected = thirdYearSoftwareCourses.every((course) => courseGrades[course.code]);

  useEffect(() => {
    if (result) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  useEffect(() => {
    getMe()
      .then((me) => {
        if (!me?.id) return;
        return getProfile(me.id).then((user) => {
          if (user?.eligibilityStatus === "eligible") {
            router.replace("/student");
          }
        });
      })
      .catch(() => {});
  }, [router]);

  const handleCalculateEligibility = async () => {
    const passedCourses = thirdYearSoftwareCourses.filter((course) =>
      passingGrades.has(courseGrades[course.code])
    ).length;

    const nextResult = {
      passedCourses,
      failedCourses: thirdYearSoftwareCourses.length - passedCourses,
      status: passedCourses >= 5 ? "eligible" : "not_eligible",
    } as const;

    setResult(nextResult);

    setIsSaving(true);
    const me = await getMe();
    if (!me?.id) {
      setIsSaving(false);
      showToast("Could not find the current user.", "error");
      return;
    }

    const saveResult = await updateProfile(me.id, {
      eligibilityStatus: nextResult.status,
      passedThirdYearCourses: nextResult.passedCourses,
      requiredThirdYearCourses: 5,
      transcriptVerifiedAt: new Date().toISOString(),
    });

    setIsSaving(false);
    if (saveResult.success) {
      showToast("Transcript eligibility saved.", "success");
    } else {
      showToast(saveResult.message, "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manual Transcript Entry"
        description="Enter your grades for the fixed third-year Software Engineering courses"
      />

      <Card>
        <CardHeader>
          <CardTitle>Third-Year Course Grades</CardTitle>
          <CardDescription>
            Select a grade for each fixed course, then calculate internship eligibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result && (
            <div ref={resultRef} className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                {result.status === "eligible" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <p className={`font-semibold ${result.status === "eligible" ? "text-foreground" : "text-lg text-red-600"}`}>
                  {result.status === "eligible" ? "Eligible for Internship" : "Not Eligible for Internship"}
                </p>
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <p>Department: Software Engineering</p>
                <p>Passed courses: {result.passedCourses} / {thirdYearSoftwareCourses.length}</p>
                <p>Failed courses: {result.failedCourses} / {thirdYearSoftwareCourses.length}</p>
                <p>Rule: At least 5 passed third-year courses are required.</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {thirdYearSoftwareCourses.map((course) => (
              <div
                key={course.code}
                className="rounded-lg border p-4"
              >
                <div className="space-y-3 md:grid md:grid-cols-[140px_1fr_180px] md:items-center md:gap-4 md:space-y-0">
                  <div>
                    <Label className="text-xs text-muted-foreground">Course Code</Label>
                    <p className="font-medium">{course.code}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Course Name</Label>
                    <p className="font-medium">{course.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Grade</Label>
                    <Select
                      value={courseGrades[course.code]}
                      onValueChange={(value) =>
                        setCourseGrades((prev) => ({ ...prev, [course.code]: value }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeOptions.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={handleCalculateEligibility}
            disabled={!allGradesSelected || isSaving}
          >
            {isSaving ? "Saving..." : "Calculate Eligibility"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
