import { AppLayout } from "@/components/layout/app-layout";

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout requiredRole="advisor">{children}</AppLayout>;
}
