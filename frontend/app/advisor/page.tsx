"use client";

import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdvisorHomePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Advisor" description="Internship application letters awaiting your approval." />
      <Card className="max-w-lg">
        <CardHeader className="space-y-4">
          <CardTitle>Open queue</CardTitle>
          <CardDescription>Review letters your advisees submitted for internship placement.</CardDescription>
          <Button asChild>
            <Link href="/advisor/summer-training-letters">Go to Application letters</Link>
          </Button>
        </CardHeader>
      </Card>
    </div>
  );
}
