"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Company } from "@/types";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompanySearchFilterProps {
  companies: Company[];
  onFilterChange: (filtered: Company[]) => void;
}

export function CompanySearchFilter({ companies, onFilterChange }: CompanySearchFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  const sectors = Array.from(new Set(companies.map((c) => c.sector)));
  const locations = Array.from(new Set(companies.map((c) => c.location)));

  useEffect(() => {
    let filtered = companies;

    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSector !== "all") {
      filtered = filtered.filter((c) => c.sector === selectedSector);
    }

    if (selectedLocation !== "all") {
      filtered = filtered.filter((c) => c.location === selectedLocation);
    }

    onFilterChange(filtered);
  }, [searchTerm, selectedSector, selectedLocation, companies, onFilterChange]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSector("all");
    setSelectedLocation("all");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {(searchTerm || selectedSector !== "all" || selectedLocation !== "all") && (
          <Button variant="outline" size="icon" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Sector</Label>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Sectors</option>
            {sectors.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
