"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToastContext } from "@/components/providers/toast-provider";
import { Lock } from "lucide-react";
import { changePassword, getMe } from "@/lib/api";

/** Ayarlar sayfası: sadece şifre değiştirme formu; API'de POST /api/users/{id}/change-password kullanılır */
export default function SettingsPage() {
  const { showToast } = useToastContext();
  const [userId, setUserId] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Giriş yapmış kullanıcının id'sini auth/me endpoint'inden al
  useEffect(() => {
    getMe().then((me) => setUserId(me?.id || null));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (!userId) return;
    setPasswordLoading(true);
    const result = await changePassword(userId, passwordForm.current, passwordForm.new);
    setPasswordLoading(false);
    if (result.success) {
      showToast(result.message, "success");
      setPasswordForm({ current: "", new: "", confirm: "" });
    } else {
      setPasswordError(result.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account settings"
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change password
          </CardTitle>
          <CardDescription>Enter your current password and choose a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
                placeholder="Your current password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm((p) => ({ ...p, new: e.target.value }))}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="Confirm your new password"
                required
              />
            </div>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
