"use client";

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompanySearchFilter } from "@/components/application/company-search-filter";
import {
  ApplicationTable,
  ApplicationTableAction,
  ApplicationTableColumn,
} from "@/components/common/application-table";
import { Pagination } from "@/components/common/pagination";
import { useToastContext } from "@/components/providers/toast-provider";
import { usePermissions } from "@/lib/use-permissions";
import {
  Building2,
  MapPin,
  Star,
  Users,
  CheckCircle2,
  XCircle,
  Edit,
  Plus,
  Trash2,
  Loader2,
  X,
  UserPlus,
} from "lucide-react";
import {
  createCompany,
  createCompanyPortalUser,
  deleteCompany,
  getAllCompaniesForCoordinator,
  setCompanyApproval,
  updateCompany,
} from "@/lib/api";
import { Company } from "@/types";

interface CompanyFormState {
  name: string;
  sector: string;
  address: string;
  location: string;
  fieldsOfWork: string;
  description: string;
  phone: string;
  fax: string;
  contactEmail: string;
  website: string;
  positionsOffered: string;
  approved: boolean;
}

const emptyForm: CompanyFormState = {
  name: "",
  sector: "",
  address: "",
  location: "",
  fieldsOfWork: "",
  description: "",
  phone: "",
  fax: "",
  contactEmail: "",
  website: "",
  positionsOffered: "0",
  approved: false,
};

export default function CompaniesPage() {
  const { showToast } = useToastContext();
  const { can } = usePermissions();

  const canAdd = can("companies.add");
  const canEdit = can("companies.edit");
  const canApprove = can("companies.approve");
  const canManagePortal = can("companies.add") || can("companies.edit");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [portalEmail, setPortalEmail] = useState("");
  const [portalName, setPortalName] = useState("");
  const [portalPassword, setPortalPassword] = useState("");

  const [portalDialogCompany, setPortalDialogCompany] = useState<Company | null>(null);
  const [portalForm, setPortalForm] = useState({ email: "", name: "", password: "" });
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalSubmitting, setPortalSubmitting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCompanies = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredCompanies.slice(startIndex, startIndex + pageSize);
  }, [filteredCompanies, safeCurrentPage, pageSize]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      const data = await getAllCompaniesForCoordinator();
      if (!isMounted) return;
      setCompanies(data);
      setFilteredCompanies(data);
      setLoading(false);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setError(null);
    setPortalEmail("");
    setPortalName("");
    setPortalPassword("");
    setDialogOpen(true);
  }

  function openEdit(company: Company) {
    setEditing(company);
    setForm({
      name: company.name,
      sector: company.sector,
      address: company.address ?? "",
      location: company.location,
      fieldsOfWork: company.fieldsOfWork ?? "",
      description: company.description,
      phone: company.phone ?? "",
      fax: company.fax ?? "",
      contactEmail: company.contactEmail ?? "",
      website: company.website ?? "",
      positionsOffered: String(company.positionsOffered ?? 0),
      approved: company.approved,
    });
    setError(null);
    setPortalEmail("");
    setPortalName("");
    setPortalPassword("");
    setDialogOpen(true);
  }

  function openPortalDialog(company: Company) {
    setPortalDialogCompany(company);
    setPortalForm({ email: "", name: company.name, password: "" });
    setPortalError(null);
  }

  function closePortalDialog() {
    if (portalSubmitting) return;
    setPortalDialogCompany(null);
    setPortalError(null);
  }

  async function handlePortalSubmit() {
    if (!portalDialogCompany) return;
    if (
      !portalForm.email.trim() ||
      !portalForm.name.trim() ||
      !portalForm.password
    ) {
      setPortalError("Email, display name, and password are required.");
      return;
    }
    if (portalForm.password.length < 6) {
      setPortalError("Password must be at least 6 characters.");
      return;
    }
    setPortalSubmitting(true);
    setPortalError(null);
    const result = await createCompanyPortalUser(portalDialogCompany.id, {
      email: portalForm.email.trim(),
      name: portalForm.name.trim(),
      password: portalForm.password,
    });
    setPortalSubmitting(false);
    if (!result.success) {
      setPortalError(result.message);
      return;
    }
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === portalDialogCompany.id ? { ...c, hasPortalUser: true } : c
      )
    );
    showToast("Company portal user created. Share the password with the company securely.", "success");
    setPortalDialogCompany(null);
  }

  function closeDialog() {
    if (submitting) return;
    setDialogOpen(false);
    setEditing(null);
    setError(null);
  }

  async function handleSubmit() {
    if (form.name.trim().length === 0) {
      setError("Company name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      sector: form.sector.trim(),
      address: form.address.trim(),
      location: form.location.trim(),
      fieldsOfWork: form.fieldsOfWork.trim(),
      description: form.description.trim(),
      phone: form.phone.trim(),
      fax: form.fax.trim(),
      contactEmail: form.contactEmail.trim(),
      website: form.website.trim(),
      positionsOffered: Number(form.positionsOffered) || 0,
      approved: form.approved,
    };

    const result = editing
      ? await updateCompany(editing.id, payload)
      : await createCompany(payload);

    if (!result.success) {
      setSubmitting(false);
      setError(result.message);
      return;
    }

    let company = result.company;
    const wantsPortal =
      canManagePortal &&
      !editing &&
      (portalEmail.trim() !== "" || portalName.trim() !== "" || portalPassword !== "");

    if (wantsPortal) {
      if (!portalEmail.trim() || !portalName.trim() || !portalPassword) {
        setSubmitting(false);
        setError("To create a portal login, fill in email, display name, and password (or clear all).");
        return;
      }
      if (portalPassword.length < 6) {
        setSubmitting(false);
        setError("Portal password must be at least 6 characters.");
        return;
      }
      const portalRes = await createCompanyPortalUser(company.id, {
        email: portalEmail.trim(),
        name: portalName.trim(),
        password: portalPassword,
      });
      if (!portalRes.success) {
        setError(
          `Company was created, but portal user failed: ${portalRes.message} You can add a portal user from the list.`
        );
        setCompanies((prev) => [company, ...prev]);
        setDialogOpen(false);
        setEditing(null);
        setForm({ ...emptyForm });
        setPortalEmail("");
        setPortalName("");
        setPortalPassword("");
        setSubmitting(false);
        return;
      }
      company = { ...company, hasPortalUser: true };
    }

    if (editing) {
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? company : c)));
      showToast("Company updated", "success");
    } else {
      setCompanies((prev) => [company, ...prev]);
      showToast(
        wantsPortal ? "Company and portal user created" : "Company added",
        "success"
      );
    }

    setDialogOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });
    setPortalEmail("");
    setPortalName("");
    setPortalPassword("");
    setSubmitting(false);
  }

  async function handleApprovalToggle(company: Company, approved: boolean) {
    const result = await setCompanyApproval(company.id, approved);
    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    setCompanies((prev) => prev.map((c) => (c.id === result.company.id ? result.company : c)));
    showToast(approved ? "Company approved" : "Approval revoked", "success");
  }

  async function handleDelete(company: Company) {
    if (!confirm(`Delete ${company.name}? This cannot be undone.`)) return;
    const result = await deleteCompany(company.id);
    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    setCompanies((prev) => prev.filter((c) => c.id !== company.id));
    showToast("Company deleted", "info");
  }

  const columns: ApplicationTableColumn<Company>[] = [
    {
      key: "name",
      label: "Company",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="font-medium">{value as string}</span>
        </div>
      ),
    },
    {
      key: "sector",
      label: "Sector",
      render: (value) =>
        value ? <Badge variant="secondary">{value as string}</Badge> : <span className="text-muted-foreground">-</span>,
    },
    {
      key: "location",
      label: "Location",
      render: (value) =>
        value ? (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span>{value as string}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "positionsOffered",
      label: "Positions",
      render: (value) => (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span>{(value as number) ?? 0}</span>
        </div>
      ),
    },
    {
      key: "averageRating",
      label: "Rating",
      render: (value) =>
        value ? (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-sm">{(value as number).toFixed(1)}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "approved",
      label: "Status",
      render: (value) =>
        (value as boolean) ? (
          <Badge variant="success">Approved</Badge>
        ) : (
          <Badge variant="warning">Pending</Badge>
        ),
    },
    {
      key: "hasPortalUser",
      label: "Portal",
      render: (_value, row) =>
        row.hasPortalUser ? (
          <Badge variant="outline">Account</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  const actions: ApplicationTableAction<Company>[] = [
    ...(canManagePortal
      ? [
          {
            icon: UserPlus,
            onClick: (row: Company) => openPortalDialog(row),
            variant: "ghost" as const,
            className: "text-primary",
            show: (row: Company) => !row.hasPortalUser,
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            icon: Edit,
            onClick: (row: Company) => openEdit(row),
            variant: "ghost" as const,
          },
        ]
      : []),
    ...(canApprove
      ? [
          {
            icon: CheckCircle2,
            onClick: (row: Company) => handleApprovalToggle(row, true),
            variant: "ghost" as const,
            className: "text-green-600",
            show: (row: Company) => !row.approved,
          },
          {
            icon: XCircle,
            onClick: (row: Company) => handleApprovalToggle(row, false),
            variant: "ghost" as const,
            className: "text-red-600",
            show: (row: Company) => row.approved,
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            icon: Trash2,
            onClick: (row: Company) => handleDelete(row),
            variant: "ghost" as const,
            className: "text-red-600",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies Management"
        description="Add company profiles, approve them for students, and optionally create a portal login (email + password) for the company to use the employer dashboard."
      >
        {canAdd && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Button>
        )}
      </PageHeader>

      <CompanySearchFilter companies={companies} onFilterChange={setFilteredCompanies} />

      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
          <CardDescription>
            {loading
              ? "Loading companies..."
              : `${filteredCompanies.length} company(ies) found`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading...
            </div>
          ) : (
            <>
              <ApplicationTable<Company>
                columns={columns}
                data={paginatedCompanies}
                actions={actions}
              />
              {filteredCompanies.length > 0 && (
                <Pagination
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredCompanies.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <DialogTitle>{editing ? "Edit company" : "Add new company"}</DialogTitle>
              <Button variant="ghost" size="icon" onClick={closeDialog}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Name *</Label>
              <Input
                id="company-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-sector">Sector</Label>
                <Input
                  id="company-sector"
                  value={form.sector}
                  onChange={(e) => setForm((prev) => ({ ...prev, sector: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-fields-work">Fields of work</Label>
                <Input
                  id="company-fields-work"
                  value={form.fieldsOfWork}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fieldsOfWork: e.target.value }))
                  }
                  placeholder="Shown on logbook export if set"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="company-address">Street address</Label>
                <Input
                  id="company-address"
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="company-location">Location / region</Label>
                <Input
                  id="company-location"
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-phone">Telephone</Label>
                <Input
                  id="company-phone"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-fax">Fax</Label>
                <Input
                  id="company-fax"
                  value={form.fax}
                  onChange={(e) => setForm((prev) => ({ ...prev, fax: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-email">Company e-mail</Label>
                <Input
                  id="company-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, contactEmail: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-website">Website</Label>
                <Input
                  id="company-website"
                  value={form.website}
                  onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                  placeholder="https://"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-description">Description</Label>
              <Textarea
                id="company-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-positions">Positions offered</Label>
                <Input
                  id="company-positions"
                  type="number"
                  min={0}
                  value={form.positionsOffered}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, positionsOffered: e.target.value }))
                  }
                />
              </div>
              {!editing && canApprove && (
                <div className="space-y-2">
                  <Label>Initial status</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="company-approved"
                      type="checkbox"
                      checked={form.approved}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, approved: e.target.checked }))
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="company-approved" className="cursor-pointer">
                      Create as approved
                    </Label>
                  </div>
                </div>
              )}
            </div>

            {!editing && canManagePortal && (
              <div className="space-y-3 rounded-md border border-dashed p-3">
                <p className="text-sm font-medium">Company portal login (optional)</p>
                <p className="text-xs text-muted-foreground">
                  Employer dashboard access. Fill all three fields, or leave all empty and add a user later with the + button in the table.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="portal-email">Login email</Label>
                    <Input
                      id="portal-email"
                      type="email"
                      autoComplete="off"
                      value={portalEmail}
                      onChange={(e) => setPortalEmail(e.target.value)}
                      placeholder="hr@company.com"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="portal-name">Display name (shown in app)</Label>
                    <Input
                      id="portal-name"
                      value={portalName}
                      onChange={(e) => setPortalName(e.target.value)}
                      placeholder="Contact person or company name"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="portal-password">Initial password (min. 6 characters)</Label>
                    <Input
                      id="portal-password"
                      type="password"
                      autoComplete="new-password"
                      value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Add company"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={portalDialogCompany != null}
        onOpenChange={(open) => !open && closePortalDialog()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Portal user — {portalDialogCompany?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Creates a company-role account so this employer can sign in, review applications, and use logbook features. Each company can have at most one such user.
            </p>
            <div className="space-y-2">
              <Label htmlFor="pdu-email">Email *</Label>
              <Input
                id="pdu-email"
                type="email"
                value={portalForm.email}
                onChange={(e) =>
                  setPortalForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdu-name">Display name *</Label>
              <Input
                id="pdu-name"
                value={portalForm.name}
                onChange={(e) =>
                  setPortalForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdu-pw">Password * (min. 6)</Label>
              <Input
                id="pdu-pw"
                type="password"
                autoComplete="new-password"
                value={portalForm.password}
                onChange={(e) =>
                  setPortalForm((p) => ({ ...p, password: e.target.value }))
                }
              />
            </div>
            {portalError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {portalError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closePortalDialog} disabled={portalSubmitting}>
                Cancel
              </Button>
              <Button onClick={handlePortalSubmit} disabled={portalSubmitting}>
                {portalSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create user
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
