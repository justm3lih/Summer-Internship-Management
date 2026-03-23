"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/common/page-header";
import { KnowledgeBaseFilters } from "@/components/coordinator/knowledge-base-filters";
import { Pagination } from "@/components/common/pagination";
import { useToastContext } from "@/components/providers/toast-provider";
import { Plus, Edit, Trash2, X, Save } from "lucide-react";
import { demoKnowledgeBaseItems } from "@/lib/demo-data";
import { format } from "date-fns";

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  lastUpdated: Date;
}

export default function KnowledgeBasePage() {
  const { showToast } = useToastContext();
  const [items, setItems] = useState<KnowledgeItem[]>(demoKnowledgeBaseItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "Eligibility",
  });

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

  // Paginate filtered items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredItems.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter]);

  const handleEdit = (item: KnowledgeItem) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category,
    });
  };

  const handleSave = () => {
    if (editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, ...formData, lastUpdated: new Date() }
            : item
        )
      );
      showToast("Entry updated successfully", "success");
      setEditingId(null);
    } else if (isAdding) {
      const newItem: KnowledgeItem = {
        id: Date.now().toString(),
        ...formData,
        lastUpdated: new Date(),
      };
      setItems([newItem, ...items]);
      showToast("Entry added successfully", "success");
      setIsAdding(false);
    }
    setFormData({ title: "", content: "", category: "Eligibility" });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      showToast("Entry deleted", "info");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ title: "", content: "", category: "Eligibility" });
  };

  const categories = ["Eligibility", "Application", "Logbook", "Report", "General"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Manage regulations and FAQs for AI assistant"
      >
        {!isAdding && !editingId && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Entry
          </Button>
        )}
      </PageHeader>

      <KnowledgeBaseFilters
        searchTerm={searchTerm}
        categoryFilter={categoryFilter}
        onSearchChange={setSearchTerm}
        onCategoryFilterChange={setCategoryFilter}
        onClearFilters={handleClearFilters}
      />

      {(isAdding || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{isAdding ? "Add New Entry" : "Edit Entry"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Entry title..."
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Entry content..."
                rows={6}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No entries found matching your filters
            </div>
          ) : (
            paginatedItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription>
                        {item.category} • Updated {format(item.lastUpdated, "MMM dd, yyyy")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        {filteredItems.length > 0 && (
          <Pagination
            currentPage={currentPage}
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
      </div>
    </div>
  );
}

