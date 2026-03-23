import { AppLayout } from "@/components/layout/app-layout";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
