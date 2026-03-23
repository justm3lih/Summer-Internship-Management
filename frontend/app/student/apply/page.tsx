"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { ApplicationFormSteps } from "@/components/application/application-form-steps";
import { useToastContext } from "@/components/providers/toast-provider";
import { demoCompanies, demoEligibility } from "@/lib/demo-data";

type Step = 1 | 2 | 3 | 4;

export default function ApplyPage() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState({
    companyId: "",
    cv: null as File | null,
    motivationLetter: null as File | null,
    transcript: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check eligibility
  if (demoEligibility.status !== "eligible") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Apply for Internship"
          description="Complete the application process step by step"
        />
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-6">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Not Eligible Yet
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            You need to meet the eligibility requirements before applying. Please upload your transcript and ensure you have passed the required courses.
          </p>
        </div>
      </div>
    );
  }

  const handleFormDataChange = (data: Partial<typeof formData>) => {
    setFormData({ ...formData, ...data });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    showToast("Submitting application...", "info");
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      showToast("Application submitted successfully!", "success");
      router.push("/student/applications");
    }, 1500);
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
        companies={demoCompanies}
        isSubmitting={isSubmitting}
        onStepChange={handleStepChange}
        onFormDataChange={handleFormDataChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
