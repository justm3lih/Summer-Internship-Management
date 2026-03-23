"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Configuration</h1>
        <p className="text-muted-foreground">
          Configure system settings and eligibility parameters
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eligibility Settings</CardTitle>
          <CardDescription>
            Configure automatic eligibility check parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Required Courses (5th-8th Semester)</Label>
            <Input type="number" defaultValue={5} min={1} max={20} />
            <p className="text-xs text-muted-foreground">
              Minimum number of passed courses required for eligibility
            </p>
          </div>
          <div className="space-y-2">
            <Label>Semester Range Start</Label>
            <Input type="number" defaultValue={5} min={1} max={8} />
          </div>
          <div className="space-y-2">
            <Label>Semester Range End</Label>
            <Input type="number" defaultValue={8} min={1} max={8} />
          </div>
          <Button>
            <Save className="mr-2 h-4 w-4" /> Save Configuration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Templates</CardTitle>
          <CardDescription>
            Manage email and notification templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium mb-2">Eligibility Notification</h3>
              <p className="text-sm text-muted-foreground">
                Sent when a student becomes eligible
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                Edit Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
