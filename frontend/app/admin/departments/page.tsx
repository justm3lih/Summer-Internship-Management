"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { getAppSettings, updateStudentDepartments } from "@/lib/api";
import { parseDepartmentsSetting } from "@/lib/departments";
import { useToastContext } from "@/components/providers/toast-provider";

const KEY = "student.departments";

export default function AdminDepartmentsPage() {
  const { showToast } = useToastContext();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const s = await getAppSettings();
      if (!active) return;
      const raw = s[KEY] || "";
      const list = parseDepartmentsSetting(raw);
      setText(list.join("\n"));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    const parts = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (parts.length === 0) {
      showToast("Please enter at least one department line (one per line).", "error");
      return;
    }
    setSaving(true);
    const res = await updateStudentDepartments(parts);
    setSaving(false);
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    setText(res.departments.join("\n"));
    showToast("Department list saved. Registration page will use this list.", "success");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Names of the departments that students can choose during registration. One department per line."
      />
      <Card>
        <CardHeader>
          <CardTitle>Departments for Registration</CardTitle>
          <CardDescription>
            Manage the list of available departments. The names you enter here will appear in the dropdown list on the registration form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dept-text">Department names (one per line)</Label>
            <Textarea
              id="dept-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[220px] font-mono text-sm"
              placeholder={"Computer Science\nSoftware Engineering\nData Science and Engineering"}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
