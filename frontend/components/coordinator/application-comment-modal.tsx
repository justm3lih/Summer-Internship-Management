"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToastContext } from "@/components/providers/toast-provider";
import { Save, X } from "lucide-react";

interface ApplicationCommentModalProps {
  applicationId: string;
  studentName: string;
  currentComment?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (comment: string) => void;
}

export function ApplicationCommentModal({
  applicationId,
  studentName,
  currentComment,
  isOpen,
  onClose,
  onSave,
}: ApplicationCommentModalProps) {
  const { showToast } = useToastContext();
  const [comment, setComment] = useState(currentComment || "");

  const handleSave = () => {
    onSave(comment);
    showToast("Comment saved successfully", "success");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Comment for {studentName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Coordinator Comments</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your comments about this application..."
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              This comment will be visible to the student and company.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> Save Comment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
