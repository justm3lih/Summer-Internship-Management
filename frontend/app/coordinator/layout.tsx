import { AppLayout } from "@/components/layout/app-layout";

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout requiredRole="coordinator">{children}</AppLayout>;
}
