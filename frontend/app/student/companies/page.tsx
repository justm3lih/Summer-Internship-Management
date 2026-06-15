"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanySearchFilter } from "@/components/application/company-search-filter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Star, Users } from "lucide-react";
import { Company } from "@/types";
import { getApprovedCompanies } from "@/lib/api";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadCompanies = async () => {
      setIsLoading(true);
      const data = await getApprovedCompanies();
      if (!isMounted) return;
      setCompanies(data);
      setFilteredCompanies(data);
      setIsLoading(false);
    };

    loadCompanies();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approved Companies & Opportunities"
        description="Browse available internship opportunities"
      />

      {!selectedCompany ? (
        <>
          <CompanySearchFilter
            companies={companies}
            onFilterChange={setFilteredCompanies}
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Loading companies...
              </div>
            ) : filteredCompanies.length === 0 ? (
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
                        {company.positionsOffered > 0 ? (
                          <span>{company.remainingPositions} / {company.positionsOffered} left</span>
                        ) : (
                          <span>No positions set</span>
                        )}
                      </div>
                    </div>
                    {company.positionsOffered > 0 && company.remainingPositions === 0 && (
                      <Badge variant="destructive" className="w-full justify-center">
                        Quota Full
                      </Badge>
                    )}
                    {company.positionsOffered === 0 && (
                      <Badge variant="outline" className="w-full justify-center border-amber-200 text-amber-700 bg-amber-50">
                        No Intake
                      </Badge>
                    )}
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
                  {selectedCompany.remainingPositions === 0 && (
                    <Badge variant="destructive" className="ml-2">Full</Badge>
                  )}
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
                <span className={selectedCompany.remainingPositions === 0 ? "text-destructive font-bold" : ""}>
                  {selectedCompany.remainingPositions} positions left (Total: {selectedCompany.positionsOffered})
                </span>
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
