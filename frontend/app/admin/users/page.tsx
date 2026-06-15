"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAdminUser,
  createStaffRoleDefinition,
  deleteAdminUser,
  deleteStaffRoleDefinition,
  getAdminUsers,
  getAllCompaniesForCoordinator,
  getPermissionCatalog,
  getStaffRoleDefinitions,
  updateAdminUser,
} from "@/lib/api";
import { getPermissionDescription, getPermissionLabel } from "@/lib/permissions";
import type { Company, ManagedUser, PermissionCatalog, StaffRoleDefinition, UserRole } from "@/types";

type DialogMode = "create" | "edit" | null;

const BUILTIN_ADMIN_ROLES: { value: UserRole; label: string }[] = [
  { value: "coordinator", label: "Coordinator" },
  { value: "advisor", label: "Advisor (academic)" },
  { value: "company", label: "Company" },
  { value: "admin", label: "Admin" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalog>({ coordinator: [], company: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("coordinator");
  const [formCompanyId, setFormCompanyId] = useState<string>("");
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [staffRoles, setStaffRoles] = useState<StaffRoleDefinition[]>([]);
  const [newStaffKey, setNewStaffKey] = useState("");
  const [newStaffLabel, setNewStaffLabel] = useState("");
  const [staffRoleBusy, setStaffRoleBusy] = useState(false);
  const [staffRolesError, setStaffRolesError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const [list, permissions, companyList, staffList] = await Promise.all([
        getAdminUsers(),
        getPermissionCatalog(),
        getAllCompaniesForCoordinator(),
        getStaffRoleDefinitions(),
      ]);
      if (!active) return;
      setUsers(list);
      if (permissions) setCatalog(permissions);
      setCompanies(companyList);
      setStaffRoles(staffList);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const linkedCompanyIds = useMemo(() => {
    return new Set(
      users
        .filter((user) => user.role === "company" && user.companyId)
        .map((user) => user.companyId as string)
    );
  }, [users]);

  const availableCompanies = useMemo(() => {
    if (dialogMode === "edit" && editingUser?.companyId) {
      return companies.filter(
        (company) => company.id === editingUser.companyId || !linkedCompanyIds.has(company.id)
      );
    }
    return companies.filter((company) => !linkedCompanyIds.has(company.id));
  }, [companies, linkedCompanyIds, dialogMode, editingUser]);

  const availablePermissions = useMemo(() => {
    if (formRole === "company") return catalog.company;
    if (formRole === "admin") return [];
    return catalog.coordinator;
  }, [formRole, catalog]);

  const permissionLabelRole: UserRole = formRole === "company" ? "company" : "coordinator";

  async function refreshStaffRoles() {
    const list = await getStaffRoleDefinitions();
    setStaffRoles(list);
  }

  async function handleAddStaffRole() {
    setStaffRolesError(null);
    const key = newStaffKey.trim().toLowerCase();
    const label = newStaffLabel.trim();
    if (!key || !label) {
      setStaffRolesError("Role key and display label are required.");
      return;
    }
    setStaffRoleBusy(true);
    const result = await createStaffRoleDefinition({ key, label });
    setStaffRoleBusy(false);
    if (!result.success) {
      setStaffRolesError(result.message);
      return;
    }
    setNewStaffKey("");
    setNewStaffLabel("");
    await refreshStaffRoles();
  }

  async function handleDeleteStaffRole(row: StaffRoleDefinition) {
    if (!window.confirm(`Remove role type "${row.label}" (${row.key})? Users keep their role key until you change them.`))
      return;
    setStaffRoleBusy(true);
    const result = await deleteStaffRoleDefinition(row.id);
    setStaffRoleBusy(false);
    if (!result.success) {
      window.alert(result.message);
      return;
    }
    await refreshStaffRoles();
  }

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesQuery =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);
      return matchesRole && matchesQuery;
    });
  }, [users, roleFilter, search]);

  function resetForm() {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("coordinator");
    setFormCompanyId("");
    setFormPermissions([]);
    setFormError(null);
    setEditingUser(null);
  }

  function openCreateDialog() {
    resetForm();
    setDialogMode("create");
  }

  function openEditDialog(user: ManagedUser) {
    resetForm();
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormCompanyId(user.companyId ?? "");
    const effectivePerms =
      user.role === "company" &&
      user.permissions.length === 0 &&
      catalog.company.length > 0
        ? [...catalog.company]
        : user.permissions;
    setFormPermissions(effectivePerms);
    setDialogMode("edit");
  }

  function togglePermission(permission: string) {
    setFormPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  }

  function selectAllPermissions() {
    setFormPermissions([...availablePermissions]);
  }

  function clearPermissions() {
    setFormPermissions([]);
  }

  async function handleSubmit() {
    setFormError(null);

    if (!formName.trim() || !formEmail.trim()) {
      setFormError("Name and email are required.");
      return;
    }

    if (dialogMode === "create" && formPassword.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    if (dialogMode === "create" && formRole === "company" && !formCompanyId) {
      setFormError("Please select a company for this user.");
      return;
    }

    setSubmitting(true);

    if (dialogMode === "create") {
      const result = await createAdminUser({
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword,
        role: formRole,
        companyId: formRole === "company" ? formCompanyId : undefined,
        permissions: formRole === "admin" ? [] : formPermissions,
      });

      if (!result.success) {
        setFormError(result.message);
        setSubmitting(false);
        return;
      }

      setUsers((prev) => [...prev, result.user]);
      setSubmitting(false);
      setDialogMode(null);
      resetForm();
      return;
    }

    if (dialogMode === "edit" && editingUser) {
      const payload: {
        name?: string;
        email?: string;
        password?: string;
        permissions?: string[];
      } = {};

      if (formName.trim() !== editingUser.name) payload.name = formName.trim();
      if (formEmail.trim() !== editingUser.email) payload.email = formEmail.trim();
      if (formPassword.length > 0) {
        if (formPassword.length < 6) {
          setFormError("Password must be at least 6 characters.");
          setSubmitting(false);
          return;
        }
        payload.password = formPassword;
      }

      if (editingUser.role !== "admin") {
        payload.permissions = formPermissions;
      }

      const result = await updateAdminUser(editingUser.id, payload);
      if (!result.success) {
        setFormError(result.message);
        setSubmitting(false);
        return;
      }

      setUsers((prev) => prev.map((user) => (user.id === result.user.id ? result.user : user)));
      setSubmitting(false);
      setDialogMode(null);
      resetForm();
    }
  }

  async function handleDelete(user: ManagedUser) {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;

    const result = await deleteAdminUser(user.id);
    if (!result.success) {
      window.alert(result.message);
      return;
    }

    setUsers((prev) => prev.filter((item) => item.id !== user.id));
  }

  function badgeVariantForRole(role: string): "default" | "secondary" | "outline" | "destructive" {
    const map: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      student: "default",
      coordinator: "secondary",
      company: "outline",
      admin: "destructive",
    };
    return map[role] ?? "secondary";
  }

  function displayRoleLabel(role: string): string {
    const custom = staffRoles.find((r) => r.key === role);
    if (custom) return `${custom.label} (${role})`;
    return role;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User & Permission Management</h1>
          <p className="text-muted-foreground">
            Create users and assign granular permissions by role.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custom staff roles</CardTitle>
          <CardDescription>
            Define extra roles (e.g. Student advisor). They sign in to the coordinator portal; permissions use the same
            checklist as coordinators.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="staff-role-key">Role key</Label>
              <Input
                id="staff-role-key"
                value={newStaffKey}
                onChange={(e) => setNewStaffKey(e.target.value)}
                placeholder="advisor"
                disabled={staffRoleBusy}
                className="w-44"
              />
            </div>
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label htmlFor="staff-role-label">Display label</Label>
              <Input
                id="staff-role-label"
                value={newStaffLabel}
                onChange={(e) => setNewStaffLabel(e.target.value)}
                placeholder="Student advisor"
                disabled={staffRoleBusy}
              />
            </div>
            <Button type="button" onClick={handleAddStaffRole} disabled={staffRoleBusy}>
              {staffRoleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add role type
            </Button>
          </div>
          {staffRolesError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {staffRolesError}
            </div>
          )}
          {staffRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom roles yet. Add one to see it in &quot;Add user&quot;.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffRoles.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-muted-foreground">{row.key}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={staffRoleBusy}
                        onClick={() => handleDeleteStaffRole(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                {loading ? "Loading..." : `${filteredUsers.length} users`}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as UserRole | "all")}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="coordinator">Coordinator</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  {staffRoles.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.label} ({r.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No users found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariantForRole(user.role)}>{displayRoleLabel(user.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === "admin" ? (
                        <span className="text-sm text-muted-foreground">Full access</span>
                      ) : user.role === "student" ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : user.permissions.length === 0 ? (
                        <span className="text-sm text-muted-foreground">No permissions</span>
                      ) : (
                        <span className="text-sm">
                          {user.permissions.length}{" "}
                          {user.permissions.length === 1 ? "permission" : "permissions"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {user.role !== "student" && (
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(user)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle>
                  {dialogMode === "create" ? "Add User" : "Edit User"}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {dialogMode === "create"
                    ? "Create a new user and assign permissions."
                    : "Update user information or change assigned permissions."}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDialogMode(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-name">Full name</Label>
                <Input
                  id="user-name"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={formEmail}
                  onChange={(event) => setFormEmail(event.target.value)}
                  placeholder="user@university.edu"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-role">Role</Label>
                {dialogMode === "edit" ? (
                  <Input id="user-role" value={displayRoleLabel(formRole)} disabled />
                ) : (
                  <Select
                    value={formRole}
                    onValueChange={(value) => {
                      const nextRole = value as UserRole;
                      setFormRole(nextRole);
                      if (nextRole === "company") {
                        setFormPermissions([...catalog.company]);
                      } else {
                        setFormPermissions([]);
                      }
                      if (nextRole !== "company") setFormCompanyId("");
                    }}
                  >
                    <SelectTrigger id="user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILTIN_ADMIN_ROLES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                      {staffRoles.map((r) => (
                        <SelectItem key={r.key} value={r.key}>
                          {r.label} ({r.key})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">
                  {dialogMode === "create" ? "Password" : "New password (optional)"}
                </Label>
                <Input
                  id="user-password"
                  type="password"
                  value={formPassword}
                  onChange={(event) => setFormPassword(event.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            {dialogMode === "create" && formRole === "company" && (
              <div className="space-y-2">
                <Label htmlFor="user-company">Company</Label>
                <Select value={formCompanyId} onValueChange={setFormCompanyId}>
                  <SelectTrigger id="user-company">
                    <SelectValue placeholder="Select a company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompanies.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No unlinked companies available. Create a company first.
                      </div>
                    ) : (
                      availableCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                          {!company.approved ? " (pending)" : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Each company can be linked to at most one user (primary portal login). Full company portal permissions are
                  selected by default; adjust below only if you need a restricted account.
                </p>
              </div>
            )}

            {dialogMode === "edit" && editingUser?.role === "company" && editingUser.companyId && (
              <div className="space-y-2">
                <Label>Linked company</Label>
                <Input
                  value={
                    companies.find((company) => company.id === editingUser.companyId)?.name ??
                    editingUser.companyId
                  }
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Company link cannot be changed after creation.
                </p>
              </div>
            )}

            {formRole === "admin" ? (
              <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
                Admin users automatically have access to every feature in the system.
              </div>
            ) : availablePermissions.length === 0 ? (
              <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
                Permission catalog is loading or empty for this role.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Permissions</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectAllPermissions}>
                      Select all
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={clearPermissions}>
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {availablePermissions.map((permission) => {
                    const checked = formPermissions.includes(permission);
                    return (
                      <label
                        key={permission}
                        className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => togglePermission(permission)}
                        />
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium">
                            {getPermissionLabel(permissionLabelRole, permission)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getPermissionDescription(permissionLabelRole, permission)}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {formError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogMode(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialogMode === "create" ? "Create user" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
