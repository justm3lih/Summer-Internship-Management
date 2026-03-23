"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { useToastContext } from "@/components/providers/toast-provider";

interface BulkActionsProps {
  selectedIds: string[];
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onClearSelection: () => void;
}

export function BulkActions({
  selectedIds,
  onBulkApprove,
  onBulkReject,
  onClearSelection,
}: BulkActionsProps) {
  const { showToast } = useToastContext();

  if (selectedIds.length === 0) return null;

  const handleBulkApprove = () => {
    showToast(`Approved ${selectedIds.length} application(s)`, "success");
    onBulkApprove();
  };

  const handleBulkReject = () => {
    if (confirm(`Are you sure you want to reject ${selectedIds.length} application(s)?`)) {
      showToast(`Rejected ${selectedIds.length} application(s)`, "info");
      onBulkReject();
    }
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
      <span className="text-sm font-medium">
        {selectedIds.length} application(s) selected
      </span>
      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkApprove}
          className="text-green-600 hover:text-green-700"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Approve All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkReject}
          className="text-red-600 hover:text-red-700"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject All
        </Button>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear Selection
        </Button>
      </div>
    </div>
  );
}
