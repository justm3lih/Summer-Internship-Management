import { AppLayout } from "@/components/layout/app-layout";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout requiredRole="company">{children}</AppLayout>;
}
