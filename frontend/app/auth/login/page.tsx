"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api";

/** Giriş sayfası: e-posta ve şifre ile API'ye login isteği atar, başarılıysa rol sayfasına yönlendirir */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const userData = await login(email, password);

      if (userData) {
        // Giriş başarılı: backend cookie yazdığı için role göre sayfaya yönlendir
        router.push(`/${userData.role}`);
      } else {
        setError("Invalid email or password.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection error";
      setError(`Could not connect to API: ${msg}. Is the backend running at http://localhost:5004?`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">
                {error}
              </div>
            )}
            <div className="rounded-lg bg-muted p-3 text-xs">
              <p className="font-medium mb-1">Test Credentials:</p>
              <p>Student: student@university.edu / student123</p>
              <p>Coordinator: coordinator@university.edu / coordinator123</p>
              <p>Company: company@tech.com / company123</p>
              <p>Admin: admin@university.edu / admin123</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email / Student ID</Label>
              <Input
                id="email"
                type="text"
                placeholder="Enter your email or student ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <a
                href="/auth/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="text-center text-sm">
              Don't have an account?{" "}
              <a href="/auth/register" className="text-primary hover:underline">
                Register
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
