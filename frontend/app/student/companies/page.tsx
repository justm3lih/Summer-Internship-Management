"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanySearchFilter } from "@/components/application/company-search-filter";
import { CompanyCard } from "@/components/common/company-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Star, Users } from "lucide-react";
import { demoCompanies } from "@/lib/demo-data";
import { Company } from "@/types";

export default function CompaniesPage() {
  const [filteredCompanies, setFilteredCompanies] = useState(demoCompanies);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approved Companies & Opportunities"
        description="Browse available internship opportunities"
      />

      {!selectedCompany ? (
        <>
          <CompanySearchFilter
            companies={demoCompanies}
            onFilterChange={setFilteredCompanies}
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No companies found matching your filters
              </div>
            ) : (
              filteredCompanies.map((company) => (
                <Card
                  key={company.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedCompany(company)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{company.name}</CardTitle>
                      </div>
                      {company.averageRating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">
                            {company.averageRating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {company.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {company.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{company.sector}</Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{company.positionsOffered} positions</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {selectedCompany.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <MapPin className="h-4 w-4" />
                  {selectedCompany.location}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedCompany(null)}>
                Back to List
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary">{selectedCompany.sector}</Badge>
              {selectedCompany.averageRating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">
                    {selectedCompany.averageRating.toFixed(1)} average rating
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{selectedCompany.positionsOffered} positions available</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">About</h3>
              <p className="text-sm text-muted-foreground">
                {selectedCompany.description}
              </p>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h4 className="font-semibold mb-2">Past Feedback (Anonymous Averages)</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Work Environment</span>
                  <span className="font-medium">4.5/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Learning Opportunities</span>
                  <span className="font-medium">4.7/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supervisor Support</span>
                  <span className="font-medium">4.6/5</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
