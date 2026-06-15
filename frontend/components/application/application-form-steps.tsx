import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProgressSteps } from "@/components/common/progress-steps";
import { FileUpload } from "@/components/common/file-upload";
import { CompanyCard } from "@/components/common/company-card";
import { CompanySearchFilter } from "@/components/application/company-search-filter";
import { Company, EligibilityStatus } from "@/types";
import { ArrowLeft, ArrowRight, Plus, Building, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ApplicationFormStepsProps {
  step: number;
  formData: {
    companyId: string;
    cv: File | null;
    motivationLetter: File | null;
    transcript: File | null;
    proposedCompany?: {
      name?: string;
      sector?: string;
      location?: string;
      website?: string;
    } | null;
    internshipStartDate?: string;
    internshipEndDate?: string;
    supervisorName?: string;
    supervisorEmail?: string;
    supervisorTitle?: string;
  };
  companies: Company[];
  eligibilityStatus?: EligibilityStatus;
  /** Bu sayfaya yalnızca mektup onaylıyken girilir; adım 1 özetini yeşille göstermek için */
  applicationLetterApproved?: boolean;
  eligibilitySummary?: {
    passedCourses?: number;
    requiredCourses?: number;
  };
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
  eligibilityStatus = "not_eligible",
  eligibilitySummary,
  applicationLetterApproved,
  isSubmitting,
  onStepChange,
  onFormDataChange,
  onSubmit,
}: ApplicationFormStepsProps) {
  const [filteredCompanies, setFilteredCompanies] = useState(companies);
  const [isProposeDialogOpen, setIsProposeDialogOpen] = useState(false);
  
  useEffect(() => {
    setFilteredCompanies(companies);
  }, [companies]);

  const stepTitles = [
    "Eligibility Summary",
    "Select Company",
    "Upload Documents",
    "Review & Submit",
  ];
  const passedCourses = eligibilitySummary?.passedCourses ?? 0;
  const requiredCourses = eligibilitySummary?.requiredCourses ?? 5;

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
              {eligibilityStatus === "eligible" ? (
                <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    You meet the portal passing-course threshold.
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {passedCourses} out of {requiredCourses} required passing grades in your saved course table (same rule
                    as the dashboard).
                  </p>
                </div>
              ) : applicationLetterApproved ? (
                <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Advisor and coordinator approved your application letter
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    You may submit a company application. Official transcript is checked from the PDF you upload in the
                    next steps. Portal passing-grade count (informational): {passedCourses} / {requiredCourses}.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4">
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    Application letter not approved yet
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    Complete advisor and coordinator approval on the Application letter page before applying.
                  </p>
                </div>
              )}
              <Button onClick={() => onStepChange(2)} className="w-full">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Company</Label>
                <Button variant="outline" size="sm" className="h-8 text-xs border-dashed border-primary text-primary hover:bg-primary/5" onClick={() => setIsProposeDialogOpen(true)}>
                  <Plus className="mr-1 h-3 w-3" /> Propose New Company
                </Button>
                <Dialog open={isProposeDialogOpen} onOpenChange={setIsProposeDialogOpen}>
                  <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Propose a New Company</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="bg-blue-50 border border-blue-100 rounded-md p-3 flex gap-3 text-xs text-blue-700">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>If you've already found an internship at a company not in our list, enter their details here. Your application will be sent to the coordinator for approval together with the company profile.</p>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Company Name *</Label>
                          <Input placeholder="Official company name" value={formData.proposedCompany?.name || ""} onChange={e => onFormDataChange({ proposedCompany: { ...formData.proposedCompany, name: e.target.value } })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Sector</Label>
                          <Input placeholder="e.g. Software, Finance" value={formData.proposedCompany?.sector || ""} onChange={e => onFormDataChange({ proposedCompany: { ...formData.proposedCompany, sector: e.target.value } })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Input placeholder="City, Region" value={formData.proposedCompany?.location || ""} onChange={e => onFormDataChange({ proposedCompany: { ...formData.proposedCompany, location: e.target.value } })} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Website</Label>
                          <Input placeholder="https://..." value={formData.proposedCompany?.website || ""} onChange={e => onFormDataChange({ proposedCompany: { ...formData.proposedCompany, website: e.target.value } })} />
                        </div>
                      </div>

                      <div className="border-t pt-4 space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2"><Building className="h-4 w-4" /> Internship & Supervisor Details</h4>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Start Date *</Label>
                            <Input type="date" value={formData.internshipStartDate} onChange={e => onFormDataChange({ internshipStartDate: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>End Date *</Label>
                            <Input type="date" value={formData.internshipEndDate} onChange={e => onFormDataChange({ internshipEndDate: e.target.value })} />
                          </div>
                          <div className="space-y-2 md:col-span-2 border-t pt-2 mt-2">
                            <Label>Supervisor Name *</Label>
                            <Input placeholder="Contact person who will approve your logs" value={formData.supervisorName} onChange={e => onFormDataChange({ supervisorName: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Supervisor Email *</Label>
                            <Input type="email" placeholder="official@company.com" value={formData.supervisorEmail} onChange={e => onFormDataChange({ supervisorEmail: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Supervisor Title</Label>
                            <Input placeholder="e.g. Senior Developer, HR" value={formData.supervisorTitle} onChange={e => onFormDataChange({ supervisorTitle: e.target.value })} />
                          </div>
                        </div>
                      </div>

                      <Button className="w-full" onClick={() => {
                        if (!formData.proposedCompany?.name || !formData.internshipStartDate || !formData.supervisorEmail) {
                          alert("Please fill in required fields (*)");
                          return;
                        }
                        onFormDataChange({ companyId: "proposed" });
                        setIsProposeDialogOpen(false);
                      }}>
                        Save & Use This Company
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <CompanySearchFilter
                companies={companies}
                onFilterChange={setFilteredCompanies}
              />
              
              <div className="grid gap-4 md:grid-cols-2">
                {formData.companyId === "proposed" && (
                  <Card className="border-primary bg-primary/5 ring-1 ring-primary">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Building className="h-4 w-4" /> {formData.proposedCompany?.name || "Proposed Company"}
                        </CardTitle>
                        <Badge variant="warning">New / Pending</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
                      <p>{formData.proposedCompany?.location} · {formData.proposedCompany?.sector}</p>
                      <p className="mt-2 font-semibold text-primary">✓ You selected this proposed company</p>
                    </CardContent>
                  </Card>
                )}

                {filteredCompanies.length === 0 && formData.companyId !== "proposed" ? (
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
                        onFormDataChange({ companyId: company.id, proposedCompany: null })
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
                label="Official transcript PDF (for this application)"
                accept=".pdf"
                file={formData.transcript}
                onChange={(file) => onFormDataChange({ transcript: file })}
                required
              />
              <p className="text-xs text-muted-foreground">
                This is the document you submit to the company. It is not the same as entering course grades for portal
                eligibility.
              </p>
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
                  {formData.companyId === "proposed" ? (
                    <span className="flex flex-col">
                      <span className="font-bold text-primary">{formData.proposedCompany?.name} (Proposed)</span>
                      <span className="text-xs">Dates: {formData.internshipStartDate} to {formData.internshipEndDate}</span>
                      <span className="text-xs">Supervisor: {formData.supervisorName} ({formData.supervisorEmail})</span>
                    </span>
                  ) : (
                    selectedCompany?.name
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Documents</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ CV: {formData.cv?.name}</li>
                  <li>✓ Motivation Letter: {formData.motivationLetter?.name}</li>
                  <li>✓ Official transcript PDF: {formData.transcript?.name}</li>
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
