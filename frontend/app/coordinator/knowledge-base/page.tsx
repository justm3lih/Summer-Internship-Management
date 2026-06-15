"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KnowledgeBaseFilters } from "@/components/coordinator/knowledge-base-filters";
import { Pagination } from "@/components/common/pagination";
import { useToastContext } from "@/components/providers/toast-provider";
import { usePermissions } from "@/lib/use-permissions";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Loader2,
  Upload,
  Clock,
  Sparkles,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  createKnowledgeBaseEntry,
  deleteKnowledgeBaseEntry,
  getKnowledgeBaseEntries,
  updateKnowledgeBaseEntry,
  uploadKnowledgeBasePdf,
  type KnowledgeBaseEntry,
} from "@/lib/api";

const CATEGORIES = ["Eligibility", "Application", "Logbook", "Report", "General"];

export default function KnowledgeBasePage() {
  const { showToast } = useToastContext();
  const { can } = usePermissions();
  const canManage = can("knowledge.manage");

  const [items, setItems] = useState<KnowledgeBaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfCategory, setPdfCategory] = useState("General");
  const [isUploadingPdfOpen, setIsUploadingPdfOpen] = useState(false);
  const [activeViewEntry, setActiveViewEntry] = useState<KnowledgeBaseEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "Eligibility",
  });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      const data = await getKnowledgeBaseEntries();
      if (!isMounted) return;
      setItems(data);
      setLoading(false);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, categoryFilter, items]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  const handleEdit = (item: KnowledgeBaseEntry) => {
    setEditingId(item.id);
    setIsAdding(false);
    setFormData({ title: item.title, content: item.content, category: item.category });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ title: "", content: "", category: "Eligibility" });
  };

  const handleSave = async () => {
    if (formData.title.trim().length === 0 || formData.content.trim().length === 0) {
      showToast("Title and content are required.", "error");
      return;
    }

    setSubmitting(true);

    if (editingId) {
      const result = await updateKnowledgeBaseEntry(editingId, formData);
      setSubmitting(false);
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      setItems((prev) => prev.map((item) => (item.id === result.entry.id ? result.entry : item)));
      showToast("Entry updated successfully", "success");
    } else {
      const result = await createKnowledgeBaseEntry(formData);
      setSubmitting(false);
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      setItems((prev) => [result.entry, ...prev]);
      showToast("Entry added successfully", "success");
    }

    handleCancel();
  };

  const handlePdfChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      showToast("Please choose a PDF file.", "error");
      return;
    }

    setUploadingPdf(true);
    const result = await uploadKnowledgeBasePdf(file, pdfCategory);
    setUploadingPdf(false);

    if (!result.success) {
      showToast(result.message, "error");
      return;
    }

    setItems((prev) => [...result.entries, ...prev]);
    showToast(
      `${result.count} entry${result.count === 1 ? "" : " entries"} created from PDF`,
      "success"
    );
  };

  const handleDelete = async (item: KnowledgeBaseEntry) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    const result = await deleteKnowledgeBaseEntry(item.id);
    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    showToast("Entry deleted successfully", "info");
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Eligibility":
        return "from-emerald-400 to-teal-500";
      case "Application":
        return "from-blue-400 to-indigo-500";
      case "Logbook":
        return "from-violet-400 to-purple-500";
      case "Report":
        return "from-rose-400 to-pink-500";
      default:
        return "from-amber-400 to-orange-500";
    }
  };

  const getCategoryBadgeStyle = (cat: string) => {
    switch (cat) {
      case "Eligibility":
        return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/20";
      case "Application":
        return "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/20";
      case "Logbook":
        return "bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-900/20";
      case "Report":
        return "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/20";
      default:
        return "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-lg border border-slate-800">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-semibold text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              Internship Coordinator Portal
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Knowledge Base</h1>
            <p className="text-slate-300 max-w-2xl text-sm md:text-base leading-relaxed">
              Configure general regulations, eligibility rules, and logbook procedures that power
              the AI assistant and guide students.
            </p>
          </div>

          {canManage && (
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-950/40 text-slate-100 hover:bg-slate-800/80 hover:text-white"
                onClick={() => setIsUploadingPdfOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" /> Import PDF
              </Button>
              <Button
                className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 border-0"
                onClick={() => {
                  setIsAdding(true);
                  setEditingId(null);
                  setFormData({ title: "", content: "", category: "Eligibility" });
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Entry
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filters block */}
      <KnowledgeBaseFilters
        searchTerm={searchTerm}
        categoryFilter={categoryFilter}
        onSearchChange={setSearchTerm}
        onCategoryFilterChange={setCategoryFilter}
        onClearFilters={handleClearFilters}
        categories={CATEGORIES}
      />

      {/* Content area */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/40 backdrop-blur-sm border rounded-xl shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <span className="text-sm font-medium">Loading knowledge base entries...</span>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              {filteredItems.length === 0 ? (
                <div className="col-span-full text-center py-16 text-muted-foreground bg-card/40 backdrop-blur-sm border rounded-xl shadow-sm flex flex-col items-center justify-center">
                  <HelpCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-base font-semibold">No entries found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try resetting your filters or search terms.
                  </p>
                </div>
              ) : (
                paginatedItems.map((item) => (
                  <Card
                    key={item.id}
                    className="group overflow-hidden border bg-card/50 backdrop-blur-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 flex flex-col h-[320px]"
                  >
                    {/* Colored top accent bar */}
                    <div
                      className={`h-1.5 w-full bg-gradient-to-r ${getCategoryColor(
                        item.category
                      )}`}
                    />

                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {item.title}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getCategoryBadgeStyle(
                                item.category
                              )}`}
                            >
                              {item.category}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(item.updatedAt, "MMM dd, yyyy")}
                            </span>
                            {item.authorName && (
                              <>
                                <span>·</span>
                                <span className="truncate max-w-[100px]">{item.authorName}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {canManage && (
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Edit Entry"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete Entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between overflow-hidden">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6 leading-relaxed flex-1">
                        {item.content}
                      </p>

                      <div className="pt-4 flex justify-end shrink-0">
                        <Button
                          variant="link"
                          onClick={() => setActiveViewEntry(item)}
                          className="text-xs h-auto p-0 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-semibold flex items-center gap-1"
                        >
                          Read Full Entry <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {filteredItems.length > 0 && (
              <Pagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredItems.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[6, 12, 24, 48]}
              />
            )}
          </>
        )}
      </div>

      {/* View Full Entry Dialog */}
      {activeViewEntry && (
        <Dialog
          open={!!activeViewEntry}
          onOpenChange={(open) => !open && setActiveViewEntry(null)}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getCategoryBadgeStyle(
                    activeViewEntry.category
                  )}`}
                >
                  {activeViewEntry.category}
                </span>
                <span className="text-xs text-muted-foreground">
                  Updated {format(activeViewEntry.updatedAt, "MMM dd, yyyy")}
                </span>
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground pr-6">
                {activeViewEntry.title}
              </DialogTitle>
              {activeViewEntry.authorName && (
                <p className="text-xs text-muted-foreground mt-1">
                  Authored by <span className="font-medium">{activeViewEntry.authorName}</span>
                </p>
              )}
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4 pr-1 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {activeViewEntry.content}
            </div>

            <div className="border-t pt-4 flex justify-between items-center shrink-0">
              {canManage ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-9"
                    onClick={() => {
                      handleEdit(activeViewEntry);
                      setActiveViewEntry(null);
                    }}
                  >
                    <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-9 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      handleDelete(activeViewEntry);
                      setActiveViewEntry(null);
                    }}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              ) : (
                <div />
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9"
                onClick={() => setActiveViewEntry(null)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add/Edit Entry Dialog */}
      {(isAdding || editingId) && canManage && (
        <Dialog open={true} onOpenChange={(open) => !open && handleCancel()}>
          <DialogContent className="max-w-lg p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {isAdding ? "Add New Entry" : "Edit Entry"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isAdding
                  ? "Create a new guideline, regulation or FAQ item for the AI advisor."
                  : "Update this guideline. Changes will immediately reflect in the chatbot system."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Step 1 — Eligibility Requirements"
                  className="h-10 bg-background border-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Content Description</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Detailed guidelines, rules, or answers here..."
                  rows={8}
                  className="bg-background border-input resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={submitting}
                className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* PDF Import Dialog */}
      {isUploadingPdfOpen && canManage && (
        <Dialog
          open={isUploadingPdfOpen}
          onOpenChange={(open) => !open && setIsUploadingPdfOpen(false)}
        >
          <DialogContent className="max-w-md p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Import Knowledge from PDF</DialogTitle>
              <DialogDescription className="text-xs">
                Select a target category and upload a PDF document. The system will automatically
                chunk and register the rules.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Default Category for Imported Entries
                </Label>
                <select
                  value={pdfCategory}
                  onChange={(e) => setPdfCategory(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={uploadingPdf}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">PDF File</Label>
                <div
                  onClick={() => !uploadingPdf && fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors rounded-xl p-8 text-center cursor-pointer bg-slate-50 dark:bg-slate-900/20 flex flex-col items-center justify-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground/80" />
                  <div className="text-sm font-semibold text-foreground">
                    {uploadingPdf ? "Processing Document..." : "Click to select PDF"}
                  </div>
                  <p className="text-xs text-muted-foreground">PDF file up to 15MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    await handlePdfChange(e);
                    setIsUploadingPdfOpen(false);
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUploadingPdfOpen(false)}
                disabled={uploadingPdf}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

