"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToastContext } from "@/components/providers/toast-provider";
import { User as UserIcon, Mail, Camera, Users, Trash2, Building2 } from "lucide-react";
import Image from "next/image";
import {
  getMe,
  getProfile,
  updateProfile,
  listCompanyStaff,
  createCompanyStaff,
  deleteCompanyStaff,
  getCompanyOrganization,
  updateCompanyOrganization,
  type CompanyStaffMember,
} from "@/lib/api";
import type { Company } from "@/types";
import { isCompanyPrimaryPortal } from "@/lib/permissions";

type CompanyFormOrg = {
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
};

const defaultOrg: CompanyFormOrg = {
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
};

function companyToOrgForm(c: Company): CompanyFormOrg {
  return {
    name: c.name ?? "",
    sector: c.sector ?? "",
    address: c.address ?? "",
    location: c.location ?? "",
    fieldsOfWork: c.fieldsOfWork ?? "",
    description: c.description ?? "",
    phone: c.phone ?? "",
    fax: c.fax ?? "",
    contactEmail: c.contactEmail ?? "",
    website: c.website ?? "",
    positionsOffered: String(c.positionsOffered ?? 0),
  };
}

const defaultProfile = {
  name: "",
  email: "",
  photo: undefined as string | undefined,
};

/** Company profile page: load profile from API and allow editing name, email, photo */
export default function CompanyProfilePage() {
  const { showToast } = useToastContext();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState(defaultProfile);
  const [initialProfileData, setInitialProfileData] = useState(defaultProfile);
  const [userId, setUserId] = useState<string | null>(null);
  const [portalUser, setPortalUser] = useState<Awaited<ReturnType<typeof getMe>>>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [staffList, setStaffList] = useState<CompanyStaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [newStaff, setNewStaff] = useState({ email: "", name: "", password: "" });
  const [creatingStaff, setCreatingStaff] = useState(false);

  const [orgData, setOrgData] = useState<CompanyFormOrg>(defaultOrg);
  const [initialOrgData, setInitialOrgData] = useState<CompanyFormOrg>(defaultOrg);
  const [orgEditing, setOrgEditing] = useState(false);
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);

  const loadProfile = async (id: string) => {
    const apiUser = await getProfile(id);
    if (!apiUser) return;

    const nextProfile = {
      name: apiUser.name,
      email: apiUser.email,
      photo: apiUser.photo,
    };
    setProfileData(nextProfile);
    setInitialProfileData(nextProfile);
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const me = await getMe();
      if (!me?.id || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      setPortalUser(me);
      setUserId(me.id);
      await loadProfile(me.id);
      if (me.role === "company") {
        setOrgLoading(true);
        const org = await getCompanyOrganization();
        if (!cancelled && org) {
          const nextOrg = companyToOrgForm(org);
          setOrgData(nextOrg);
          setInitialOrgData(nextOrg);
        }
        if (!cancelled) setOrgLoading(false);
      }
      if (!cancelled && isCompanyPrimaryPortal(me)) {
        setStaffLoading(true);
        const rows = await listCompanyStaff();
        if (!cancelled) {
          setStaffList(rows);
          setStaffLoading(false);
        }
      }
      if (!cancelled) setLoading(false);
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadStaff = async () => {
    setStaffLoading(true);
    const rows = await listCompanyStaff();
    setStaffList(rows);
    setStaffLoading(false);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const result = await updateProfile(userId, {
      name: profileData.name,
      email: profileData.email || undefined,
      photo: profileData.photo,
    });
    setSaving(false);
    if (result.success) {
      const nextProfile = {
        name: result.user.name,
        email: result.user.email,
        photo: result.user.photo,
      };
      setProfileData(nextProfile);
      setInitialProfileData(nextProfile);
      showToast("Profile updated.", "success");
      setIsEditing(false);
      setPhotoFile(null);
    } else {
      showToast(result.message, "error");
    }
  };

  const handleCreateStaff = async () => {
    if (!newStaff.email.trim() || !newStaff.name.trim() || newStaff.password.length < 6) {
      showToast("Name, email and password (min 6 chars) are required.", "error");
      return;
    }
    setCreatingStaff(true);
    const result = await createCompanyStaff({
      email: newStaff.email.trim(),
      name: newStaff.name.trim(),
      password: newStaff.password,
    });
    setCreatingStaff(false);
    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    showToast("Staff account created.", "success");
    setNewStaff({ email: "", name: "", password: "" });
    await loadStaff();
  };

  const handleRemoveStaff = async (id: string) => {
    const result = await deleteCompanyStaff(id);
    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    showToast("Staff account removed.", "success");
    await loadStaff();
  };

  const handleCancelOrg = () => {
    setOrgData(initialOrgData);
    setOrgEditing(false);
  };

  const handleSaveOrg = async () => {
    if (!portalUser || !isCompanyPrimaryPortal(portalUser)) return;
    setOrgSaving(true);
    const result = await updateCompanyOrganization({
      name: orgData.name.trim(),
      sector: orgData.sector.trim(),
      address: orgData.address.trim(),
      location: orgData.location.trim(),
      fieldsOfWork: orgData.fieldsOfWork.trim(),
      description: orgData.description.trim(),
      phone: orgData.phone.trim(),
      fax: orgData.fax.trim(),
      contactEmail: orgData.contactEmail.trim(),
      website: orgData.website.trim(),
      positionsOffered: Number(orgData.positionsOffered) || 0,
    });
    setOrgSaving(false);
    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    const next = companyToOrgForm(result.company);
    setOrgData(next);
    setInitialOrgData(next);
    showToast("Organization profile updated.", "success");
    setOrgEditing(false);
  };

  const handleCancel = () => {
    setProfileData(initialProfileData);
    setPhotoFile(null);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" description="View and edit your profile information" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description={
          portalUser?.companyMembershipTier === "staff"
            ? "Staff portal — your primary company contact assigns interns to you."
            : "View and edit your company profile"
        }
      >
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="relative group">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                  {profileData.photo ? (
                    <Image
                      src={profileData.photo}
                      alt={profileData.name}
                      width={128}
                      height={128}
                      className="h-32 w-32 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <UserIcon className="h-16 w-16 text-primary" />
                  )}
                </div>
                {isEditing && (
                  <>
                    <label
                      htmlFor="photo-upload"
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Camera className="h-6 w-6 text-white" />
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPhotoFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfileData({
                              ...profileData,
                              photo: reader.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </>
                )}
              </div>
            </div>
            {isEditing && photoFile && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{photoFile.name}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPhotoFile(null);
                    if (userId)
                      getProfile(userId).then(
                        (u) => u && setProfileData((p) => ({ ...p, photo: u.photo }))
                      );
                  }}
                  className="mt-2"
                >
                  Remove
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Portal display name
                </Label>
                {isEditing ? (
                  <Input
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, name: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">{profileData.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">{profileData.email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {portalUser?.role === "company" && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization profile
                </CardTitle>
                <CardDescription>
                  Official company details used on student logbook Word exports and listings.
                  {portalUser && !isCompanyPrimaryPortal(portalUser) && (
                    <span className="mt-1 block text-amber-700 dark:text-amber-400">
                      Only the primary company login can edit these fields.
                    </span>
                  )}
                </CardDescription>
              </div>
              {portalUser && isCompanyPrimaryPortal(portalUser) && (
                <div className="flex shrink-0 gap-2">
                  {!orgEditing ? (
                    <Button type="button" variant="outline" onClick={() => setOrgEditing(true)}>
                      Edit organization
                    </Button>
                  ) : (
                    <>
                      <Button type="button" variant="outline" onClick={handleCancelOrg}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={() => void handleSaveOrg()} disabled={orgSaving}>
                        {orgSaving ? "Saving..." : "Save organization"}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {orgLoading ? (
              <p className="text-sm text-muted-foreground">Loading organization…</p>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="org-name">Registered company name</Label>
                    {orgEditing && portalUser && isCompanyPrimaryPortal(portalUser) ? (
                      <Input
                        id="org-name"
                        value={orgData.name}
                        onChange={(e) => setOrgData((o) => ({ ...o, name: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm font-medium">{orgData.name || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-sector">Sector</Label>
                    {orgEditing && portalUser && isCompanyPrimaryPortal(portalUser) ? (
                      <Input
                        id="org-sector"
                        value={orgData.sector}
                        onChange={(e) => setOrgData((o) => ({ ...o, sector: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm font-medium">{orgData.sector || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-fields">Fields of work</Label>
                    {orgEditing && portalUser && isCompanyPrimaryPortal(portalUser) ? (
                      <Input
                        id="org-fields"
                        value={orgData.fieldsOfWork}
                        onChange={(e) => setOrgData((o) => ({ ...o, fieldsOfWork: e.target.value }))}
                        placeholder="Shown on logbook export if set"
                      />
                    ) : (
                      <p className="text-sm font-medium">{orgData.fieldsOfWork || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="org-address">Street address</Label>
                    {orgEditing && portalUser && isCompanyPrimaryPortal(portalUser) ? (
                      <Input
                        id="org-address"
                        value={orgData.address}
                        onChange={(e) => setOrgData((o) => ({ ...o, address: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm font-medium">{orgData.address || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="org-location">Location / region</Label>
                    {orgEditing && portalUser && isCompanyPrimaryPortal(portalUser) ? (
                      <Input
                        id="org-location"
                        value={orgData.location}
                        onChange={(e) => setOrgData((o) => ({ ...o, location: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm font-medium">{orgData.location || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-phone">Telephone</Label>
                    {orgEditing && portalUser && isCompanyPrimaryPortal(portalUser) ? (
                      <Input
                        id="org-phone"
                        value={orgData.phone}
                        onChange={(e) => setOrgData((o) => ({ ...o, phone: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm font-medium">{orgData.phone || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-fax">Fax</Label>
                    {orgEditing && portalUser && isCompanyPrimaryPortal(portalUser) ? (
                      <Input
                        id="org-fax"
                        value={orgData.fax}
                        onChange={(e) => setOrgData((o) => ({ ...o, fax: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm font-medium">{orgData.fax || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-cemail">Company e-mail</Label>
                    {orgEditing && portalUser && isCompanyPrimaryPortal(portalUser) ? (
                      <Input
                        id="org-cemail"
                        type="email"
                        value={orgData.contactEmail}
                        onChange={(e) => setOrgData((o) => ({ ...o, contactEmail: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm font-medium">{orgData.contactEmail || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-web">Website</Label>
                    {orgEditing && portalUser && isCompanyPrimaryPortal(portalUser) ? (
                      <Input
                        id="org-web"
                        value={orgData.website}
                        onChange={(e) => setOrgData((o) => ({ ...o, website: e.target.value }))}
                        placeholder="https://"
                      />
                    ) : (
                      <p className="text-sm font-medium">{orgData.website || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-pos">Positions offered</Label>
                    {orgEditing && portalUser && isCompanyPrimaryPortal(portalUser) ? (
                      <Input
                        id="org-pos"
                        type="number"
                        min={0}
                        value={orgData.positionsOffered}
                        onChange={(e) =>
                          setOrgData((o) => ({ ...o, positionsOffered: e.target.value }))
                        }
                      />
                    ) : (
                      <p className="text-sm font-medium">{orgData.positionsOffered}</p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="org-desc">Description</Label>
                    {orgEditing && portalUser && isCompanyPrimaryPortal(portalUser) ? (
                      <Textarea
                        id="org-desc"
                        rows={3}
                        value={orgData.description}
                        onChange={(e) =>
                          setOrgData((o) => ({ ...o, description: e.target.value }))
                        }
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{orgData.description || "—"}</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {portalUser && isCompanyPrimaryPortal(portalUser) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Company staff accounts
            </CardTitle>
            <CardDescription>
              Supervisors log in with their own email and only see interns assigned to them on the Interns page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="staff-name">Display name</Label>
                <Input
                  id="staff-name"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Supervisor name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-email">Email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff((s) => ({ ...s, email: e.target.value }))}
                  placeholder="supervisor@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-password">Initial password</Label>
                <Input
                  id="staff-password"
                  type="password"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff((s) => ({ ...s, password: e.target.value }))}
                  placeholder="Min 6 characters"
                />
              </div>
            </div>
            <Button type="button" onClick={() => void handleCreateStaff()} disabled={creatingStaff}>
              {creatingStaff ? "Creating..." : "Add staff account"}
            </Button>

            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="w-24 p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffLoading && (
                    <tr>
                      <td colSpan={3} className="p-4 text-muted-foreground">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!staffLoading && staffList.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-muted-foreground">
                        No staff accounts yet.
                      </td>
                    </tr>
                  )}
                  {staffList.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="p-3">{row.name}</td>
                      <td className="p-3">{row.email}</td>
                      <td className="p-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleRemoveStaff(row.id)}
                          aria-label={`Remove ${row.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

