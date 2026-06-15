import { Card, CardContent } from "@/components/ui/card";
import { Building2, CheckCircle2, Users } from "lucide-react";
import { Company } from "@/types";
import { Badge } from "@/components/ui/badge";

interface CompanyCardProps {
  company: Company;
  selected: boolean;
  onSelect: () => void;
}

export function CompanyCard({ company, selected, onSelect }: CompanyCardProps) {
  const isFull = company.positionsOffered > 0 && (company.remainingPositions ?? 0) === 0;
  const noIntake = company.positionsOffered === 0;
  const isDisabled = isFull || noIntake;

  return (
    <Card
      className={`relative transition-colors ${
        isDisabled
          ? "opacity-60 grayscale cursor-not-allowed border-muted bg-muted/20"
          : "cursor-pointer"
      } ${
        selected && !isDisabled
          ? "border-primary bg-primary/5"
          : !isDisabled ? "hover:border-primary/50" : ""
      }`}
      onClick={isDisabled ? undefined : onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Building2 className={`h-5 w-5 ${isDisabled ? "text-muted-foreground" : "text-primary"}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{company.name}</h3>
              {isFull && <Badge variant="destructive" className="h-4 text-[10px] uppercase px-1">Full</Badge>}
              {noIntake && <Badge variant="outline" className="h-4 text-[10px] uppercase px-1 border-amber-200 text-amber-700 bg-amber-50">No Intake</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {company.sector} • {company.location}
            </p>
            <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className={isDisabled ? "text-destructive font-bold" : ""}>
                {noIntake ? "No positions set" : `${company.remainingPositions} / ${company.positionsOffered} left`}
              </span>
            </div>
          </div>
          {selected && !isDisabled && <CheckCircle2 className="h-5 w-5 text-primary" />}
        </div>
      </CardContent>
    </Card>
  );
}
