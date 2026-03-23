import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProgressSteps } from "@/components/common/progress-steps";
import { FileUpload } from "@/components/common/file-upload";
import { CompanyCard } from "@/components/common/company-card";
import { CompanySearchFilter } from "@/components/application/company-search-filter";
import { Company } from "@/types";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

interface ApplicationFormStepsProps {
  step: number;
  formData: {
    companyId: string;
    cv: File | null;
    motivationLetter: File | null;
    transcript: File | null;
  };
  companies: Company[];
  isSubmitting: boolean;
  onStepChange: (step: number) => void;
  onFormDataChange: (data: Partial<ApplicationFormStepsProps["formData"]>) => void;
  onSubmit: () => void;
}

const steps = [
  { number: 1, label: "Eligibility" },
  { number: 2, label: "Company" },
  { number: 3, label: "Documents" },
  { number: 4, label: "Review" },
];

export function ApplicationFormSteps({
  step,
  formData,
  companies,
  isSubmitting,
  onStepChange,
  onFormDataChange,
  onSubmit,
}: ApplicationFormStepsProps) {
  const [filteredCompanies, setFilteredCompanies] = useState(companies);
  
  useEffect(() => {
    setFilteredCompanies(companies);
  }, [companies]);

  const stepTitles = [
    "Eligibility Summary",
    "Select Company",
    "Upload Documents",
    "Review & Submit",
  ];

  const selectedCompany = filteredCompanies.find((c) => c.id === formData.companyId);

  return (
    <div className="space-y-6">
      <ProgressSteps steps={steps} currentStep={step} />

      <Card>
        <CardHeader>
          <CardTitle>
            Step {step}: {stepTitles[step - 1]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
                <p className="font-medium text-green-700 dark:text-green-300">
                  ✓ You are eligible for summer internship!
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  6 out of 5 required upper-level courses passed
                </p>
              </div>
              <Button onClick={() => onStepChange(2)} className="w-full">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Label>Select Company</Label>
              <CompanySearchFilter
                companies={companies}
                onFilterChange={setFilteredCompanies}
              />
              <div className="grid gap-4 md:grid-cols-2">
                {filteredCompanies.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    No companies found matching your filters
                  </div>
                ) : (
                  filteredCompanies.map((company) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      selected={formData.companyId === company.id}
                      onSelect={() =>
                        onFormDataChange({ companyId: company.id })
                      }
                    />
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onStepChange(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => onStepChange(3)}
                  disabled={!formData.companyId}
                  className="flex-1"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <FileUpload
                label="CV (PDF)"
                accept=".pdf"
                file={formData.cv}
                onChange={(file) => onFormDataChange({ cv: file })}
                required
              />
              <FileUpload
                label="Motivation Letter (PDF)"
                accept=".pdf"
                file={formData.motivationLetter}
                onChange={(file) => onFormDataChange({ motivationLetter: file })}
                required
              />
              <FileUpload
                label="Transcript Copy (PDF)"
                accept=".pdf"
                file={formData.transcript}
                onChange={(file) => onFormDataChange({ transcript: file })}
                required
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onStepChange(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => onStepChange(4)}
                  disabled={
                    !formData.cv ||
                    !formData.motivationLetter ||
                    !formData.transcript
                  }
                  className="flex-1"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Company</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCompany?.name}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Documents</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ CV: {formData.cv?.name}</li>
                  <li>✓ Motivation Letter: {formData.motivationLetter?.name}</li>
                  <li>✓ Transcript: {formData.transcript?.name}</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onStepChange(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
