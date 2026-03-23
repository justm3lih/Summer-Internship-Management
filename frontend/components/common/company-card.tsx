import { Card, CardContent } from "@/components/ui/card";
import { Building2, CheckCircle2 } from "lucide-react";

interface Company {
  id: string;
  name: string;
  sector: string;
  location: string;
}

interface CompanyCardProps {
  company: Company;
  selected: boolean;
  onSelect: () => void;
}

export function CompanyCard({ company, selected, onSelect }: CompanyCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "hover:border-primary/50"
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <h3 className="font-semibold">{company.name}</h3>
            <p className="text-sm text-muted-foreground">
              {company.sector} • {company.location}
            </p>
          </div>
          {selected && <CheckCircle2 className="h-5 w-5 text-primary" />}
        </div>
      </CardContent>
    </Card>
  );
}
