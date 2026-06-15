"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { useToastContext } from "@/components/providers/toast-provider";
import { getAppSettings, updateAppSettings, type AppSettings } from "@/lib/api";

const DEFAULTS: AppSettings = {
  "eligibility.requiredCourses": "5",
  "eligibility.semesterStart": "5",
  "eligibility.semesterEnd": "8",
  "application.deadline": "",
  "term.active": "Spring",
  "term.year": String(new Date().getFullYear()),
};

export default function ConfigPage() {
  const { showToast } = useToastContext();
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      const data = await getAppSettings();
      if (!isMounted) return;
      setSettings((prev) => ({ ...prev, ...data }));
      setLoading(false);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  function setValue(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveEligibility() {
    const requiredCourses = Number(settings["eligibility.requiredCourses"]);
    const start = Number(settings["eligibility.semesterStart"]);
    const end = Number(settings["eligibility.semesterEnd"]);

    if (Number.isNaN(requiredCourses) || requiredCourses < 1 || requiredCourses > 50) {
      showToast("Required courses must be between 1 and 50.", "error");
      return;
    }
    if (Number.isNaN(start) || start < 1 || start > 8) {
      showToast("Semester start must be between 1 and 8.", "error");
      return;
    }
    if (Number.isNaN(end) || end < 1 || end > 8 || end < start) {
      showToast("Semester end must be greater than or equal to start (max 8).", "error");
      return;
    }

    setSaving(true);
    const result = await updateAppSettings({
      "eligibility.requiredCourses": String(requiredCourses),
      "eligibility.semesterStart": String(start),
      "eligibility.semesterEnd": String(end),
    });
    setSaving(false);

    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    setSettings((prev) => ({ ...prev, ...result.settings }));
    showToast("Eligibility settings saved", "success");
  }

  async function handleSaveTerm() {
    setSaving(true);
    const result = await updateAppSettings({
      "application.deadline": settings["application.deadline"] ?? "",
      "term.active": settings["term.active"] ?? "",
      "term.year": settings["term.year"] ?? "",
    });
    setSaving(false);

    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    setSettings((prev) => ({ ...prev, ...result.settings }));
    showToast("Term settings saved", "success");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Configuration</h1>
        <p className="text-muted-foreground">
          Configure system settings and eligibility parameters
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading settings...
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Eligibility Settings</CardTitle>
              <CardDescription>
                Configure the automatic eligibility check used for transcript verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="required-courses">Required courses passed</Label>
                <Input
                  id="required-courses"
                  type="number"
                  min={1}
                  max={50}
                  value={settings["eligibility.requiredCourses"] ?? ""}
                  onChange={(e) => setValue("eligibility.requiredCourses", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum number of passed 5th-8th semester courses required for eligibility
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="semester-start">Semester range start</Label>
                  <Input
                    id="semester-start"
                    type="number"
                    min={1}
                    max={8}
                    value={settings["eligibility.semesterStart"] ?? ""}
                    onChange={(e) => setValue("eligibility.semesterStart", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester-end">Semester range end</Label>
                  <Input
                    id="semester-end"
                    type="number"
                    min={1}
                    max={8}
                    value={settings["eligibility.semesterEnd"] ?? ""}
                    onChange={(e) => setValue("eligibility.semesterEnd", e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleSaveEligibility} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save eligibility settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Term & Deadlines</CardTitle>
              <CardDescription>
                Term information and application deadline displayed across the portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="term-active">Active term</Label>
                  <select
                    id="term-active"
                    value={settings["term.active"] ?? ""}
                    onChange={(e) => setValue("term.active", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Fall">Fall</option>
                    <option value="Winter">Winter</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="term-year">Active year</Label>
                  <Input
                    id="term-year"
                    type="number"
                    min={2020}
                    max={2100}
                    value={settings["term.year"] ?? ""}
                    onChange={(e) => setValue("term.year", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="application-deadline">Application deadline</Label>
                <Input
                  id="application-deadline"
                  type="date"
                  value={settings["application.deadline"] ?? ""}
                  onChange={(e) => setValue("application.deadline", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Leave empty to disable a portal-wide deadline display.
                </p>
              </div>
              <Button onClick={handleSaveTerm} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save term settings
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
