import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export interface ApplicationTableColumn {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ApplicationTableProps {
  columns: ApplicationTableColumn[];
  data: any[];
  actions?: Array<{
    icon: LucideIcon;
    onClick: (row: any) => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    className?: string;
    show?: (row: any) => boolean;
  }>;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function ApplicationTable({
  columns,
  data,
  actions,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: ApplicationTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? data.map((row) => row.id) : []);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedIds, id]);
      } else {
        onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
      }
    }
  };

  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {selectable && (
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                ref={(el) => {
                  if (el) {
                    (el as HTMLInputElement).indeterminate = someSelected;
                  }
                }}
              />
            </TableHead>
          )}
          {columns.map((column) => (
            <TableHead key={column.key}>{column.label}</TableHead>
          ))}
          {actions && actions.length > 0 && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
              className="text-center py-8 text-muted-foreground"
            >
              No data available
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, rowIndex) => (
            <TableRow key={row.id || rowIndex}>
              {selectable && (
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(row.id)}
                    onCheckedChange={(checked) =>
                      handleSelectRow(row.id, checked as boolean)
                    }
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </TableCell>
              ))}
              {actions && actions.length > 0 && (
                <TableCell>
                  <div className="flex items-center gap-2">
                    {actions
                      .filter((action) => !action.show || action.show(row))
                      .map((action, index) => {
                        const Icon = action.icon;
                        return (
                          <Button
                            key={index}
                            variant={action.variant || "ghost"}
                            size="icon"
                            onClick={() => action.onClick(row)}
                            className={action.className}
                          >
                            <Icon className="h-4 w-4" />
                          </Button>
                        );
                      })}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
