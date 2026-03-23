import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface FileUploadProps {
  label: string;
  accept?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
}

export function FileUpload({
  label,
  accept = ".pdf",
  file,
  onChange,
  required = false,
}: FileUploadProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept={accept}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
        {file && <Badge variant="secondary">{file.name}</Badge>}
      </div>
    </div>
  );
}
