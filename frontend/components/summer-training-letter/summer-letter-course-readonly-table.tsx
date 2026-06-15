import type { SummerTrainingLetterCourseRow } from "@/types";
import { formatSummerLetterCourseRowSummary } from "@/lib/summer-letter-unified-course-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function SummerLetterCourseReadonlyTable({ rows }: { rows: SummerTrainingLetterCourseRow[] }) {
  if (!rows?.length) {
    return <p className="text-xs text-muted-foreground">No course table saved for this letter.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Code</TableHead>
            <TableHead>Course</TableHead>
            <TableHead className="min-w-[200px]">{"Status & grade"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={`${row.code}-${i}`}>
              <TableCell className="font-mono text-xs">{row.code}</TableCell>
              <TableCell className="max-w-[240px] text-sm">{row.name}</TableCell>
              <TableCell className="text-sm">{formatSummerLetterCourseRowSummary(row)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
