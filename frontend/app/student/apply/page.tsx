"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { ApplicationFormSteps } from "@/components/application/application-form-steps";
import { useToastContext } from "@/components/providers/toast-provider";
import {
  createApplication,
  getApprovedCompanies,
  getMe,
  getMyApplications,
  getProfile,
  getMySummerTrainingLetter,
  uploadFile,
} from "@/lib/api";
import { Application, Company, User } from "@/types";

type Step = 1 | 2 | 3 | 4;

export default function ApplyPage() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState({
    companyId: "",
    cv: null as File | null,
    motivationLetter: null as File | null,
    transcript: null as File | null,
    // For "Propose and Apply" flow
    proposedCompany: null as any | null,
    internshipStartDate: "",
    internshipEndDate: "",
    supervisorName: "",
    supervisorEmail: "",
    supervisorTitle: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summerLetterApproved, setSummerLetterApproved] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      setIsLoading(true);

      const me = await getMe();
      if (!me?.id) {
        if (isMounted) {
          showToast("Could not find the current user.", "error");
          router.push("/auth/login");
        }
        return;
      }

      const [userProfile, approvedCompanies, myApplications, summerLetter] = await Promise.all([
        getProfile(me.id),
        getApprovedCompanies(),
        getMyApplications(),
        getMySummerTrainingLetter(),
      ]);

      if (!isMounted) return;

      setProfileUser(userProfile);
      setCompanies(approvedCompanies);
      setApplications(myApplications);
      setSummerLetterApproved(summerLetter?.status === "approved");
      setIsLoading(false);
    };

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [router, showToast]);

  const hasActiveApplication = useMemo(
    () =>
      applications.some((application) =>
        ["pending", "approved", "ongoing"].includes(application.status)
      ),
    [applications]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Apply for Internship"
          description="Complete the application process step by step"
        />
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Loading application form...
        </div>
      </div>
    );
  }

  if (!summerLetterApproved) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Apply for Internship"
          description="Complete the application process step by step"
        />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
            Application letter required
          </h3>
          <p className="text-sm text-amber-900/85 dark:text-amber-100/85 mb-4">
            Your advisor and the internship coordinator must approve your SWEN internship application letter before
            you can apply to a company.
          </p>
          <Link
            href="/student/summer-training-letter"
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            Open Application letter
          </Link>
        </div>
      </div>
    );
  }

  if (hasActiveApplication) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Apply for Internship"
          description="Complete the application process step by step"
        />
        <div className="rounded-lg bg-secondary/80 border border-border p-6">
          <h3 className="text-lg font-semibold text-primary mb-2">
            Active Application Found
          </h3>
          <p className="text-sm text-muted-foreground">
            You already have an active internship application. Please check the applications page before creating a new one.
          </p>
        </div>
      </div>
    );
  }

  const handleFormDataChange = (data: Partial<typeof formData>) => {
    setFormData({ ...formData, ...data });
  };

  const handleSubmit = async () => {
    if (!formData.cv || !formData.motivationLetter || !formData.transcript) {
      showToast("Please upload all required documents.", "error");
      return;
    }

    setIsSubmitting(true);
    showToast("Uploading documents...", "info");

    const [cvUpload, motivationUpload, transcriptUpload] = await Promise.all([
      uploadFile(formData.cv, "cv"),
      uploadFile(formData.motivationLetter, "motivation_letter"),
      uploadFile(formData.transcript, "transcript"),
    ]);

    if (!cvUpload.success) {
      setIsSubmitting(false);
      showToast(`CV upload failed: ${cvUpload.message}`, "error");
      return;
    }
    if (!motivationUpload.success) {
      setIsSubmitting(false);
      showToast(`Motivation letter upload failed: ${motivationUpload.message}`, "error");
      return;
    }
    if (!transcriptUpload.success) {
      setIsSubmitting(false);
      showToast(`Transcript upload failed: ${transcriptUpload.message}`, "error");
      return;
    }

    showToast("Submitting application...", "info");

    const result = await createApplication({
      companyId: formData.companyId || "",
      cvFileId: cvUpload.file.id,
      motivationLetterFileId: motivationUpload.file.id,
      transcriptFileId: transcriptUpload.file.id,
      proposedCompany: formData.proposedCompany,
      internshipStartDate: formData.internshipStartDate || undefined,
      internshipEndDate: formData.internshipEndDate || undefined,
      supervisorName: formData.supervisorName || undefined,
      supervisorEmail: formData.supervisorEmail || undefined,
      supervisorTitle: formData.supervisorTitle || undefined,
    });

    setIsSubmitting(false);

    if (!result.success) {
      showToast(result.message, "error");
      return;
    }

    showToast("Application submitted successfully!", "success");
    router.push("/student/applications");
  };

  const handleStepChange = (newStep: number) => {
    if (newStep >= 1 && newStep <= 4) {
      setStep(newStep as Step);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apply for Internship"
        description="Complete the application process step by step"
      />

      <ApplicationFormSteps
        step={step}
        formData={formData}
        companies={companies}
        eligibilityStatus={profileUser?.eligibilityStatus ?? "not_eligible"}
        applicationLetterApproved={summerLetterApproved}
        eligibilitySummary={{
          passedCourses: profileUser?.passedThirdYearCourses,
          requiredCourses: profileUser?.requiredThirdYearCourses,
        }}
        isSubmitting={isSubmitting}
        onStepChange={handleStepChange}
        onFormDataChange={handleFormDataChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
