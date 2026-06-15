"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Book, Globe, FileText, Plus } from "lucide-react";

interface IEEEGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (formatted: string) => void;
}

export function IEEEReferenceGenerator({ open, onOpenChange, onGenerate }: IEEEGeneratorProps) {
  const [bookData, setBookData] = useState({ author: "", title: "", city: "", publisher: "", year: "" });
  const [webData, setWebData] = useState({ author: "", title: "", siteName: "", url: "", accessDate: "" });
  const [articleData, setArticleData] = useState({ author: "", title: "", journal: "", vol: "", no: "", pp: "", date: "" });

  const generateBook = () => {
    const { author, title, city, publisher, year } = bookData;
    if (!author || !title || !publisher || !year) return;
    const formatted = `${author}, *${title}*, ${city ? city + ": " : ""}${publisher}, ${year}.`;
    onGenerate(formatted);
    onOpenChange(false);
    setBookData({ author: "", title: "", city: "", publisher: "", year: "" });
  };

  const generateWeb = () => {
    const { author, title, siteName, url, accessDate } = webData;
    if (!title || !url) return;
    const formatted = `${author ? author + ". " : ""}"${title}." ${siteName ? siteName + ". " : ""}${url} (accessed ${accessDate || new Date().toLocaleDateString()}).`;
    onGenerate(formatted);
    onOpenChange(false);
    setWebData({ author: "", title: "", siteName: "", url: "", accessDate: "" });
  };

  const generateArticle = () => {
    const { author, title, journal, vol, no, pp, date } = articleData;
    if (!author || !title || !journal || !date) return;
    const formatted = `${author}, "${title}," *${journal}*, vol. ${vol}, no. ${no}, pp. ${pp}, ${date}.`;
    onGenerate(formatted);
    onOpenChange(false);
    setArticleData({ author: "", title: "", journal: "", vol: "", no: "", pp: "", date: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>IEEE Reference Generator</DialogTitle>
          <DialogDescription>
            Enter the details below to generate a properly formatted IEEE reference.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="book" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="book" className="flex gap-2">
              <Book className="h-4 w-4" /> Book
            </TabsTrigger>
            <TabsTrigger value="web" className="flex gap-2">
              <Globe className="h-4 w-4" /> Website
            </TabsTrigger>
            <TabsTrigger value="article" className="flex gap-2">
              <FileText className="h-4 w-4" /> Article
            </TabsTrigger>
          </TabsList>

          <TabsContent value="book" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Author(s)</Label>
                <Input placeholder="A. Author" value={bookData.author} onChange={e => setBookData({...bookData, author: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Year</Label>
                <Input placeholder="2024" value={bookData.year} onChange={e => setBookData({...bookData, year: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Book Title</Label>
              <Input placeholder="Title of the Book" value={bookData.title} onChange={e => setBookData({...bookData, title: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>City (Optional)</Label>
                <Input placeholder="New York" value={bookData.city} onChange={e => setBookData({...bookData, city: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Publisher</Label>
                <Input placeholder="Springer" value={bookData.publisher} onChange={e => setBookData({...bookData, publisher: e.target.value})} />
              </div>
            </div>
            <Button className="w-full" onClick={generateBook} disabled={!bookData.author || !bookData.title || !bookData.publisher || !bookData.year}>
              <Plus className="mr-2 h-4 w-4" /> Generate & Insert Book Reference
            </Button>
          </TabsContent>

          <TabsContent value="web" className="space-y-4 pt-4">
             <div className="space-y-1">
              <Label>Author (Optional)</Label>
              <Input placeholder="A. Author" value={webData.author} onChange={e => setWebData({...webData, author: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Page Title</Label>
              <Input placeholder="How to use IEEE format" value={webData.title} onChange={e => setWebData({...webData, title: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Website Name</Label>
              <Input placeholder="IEEE Standard" value={webData.siteName} onChange={e => setWebData({...webData, siteName: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>URL</Label>
              <Input placeholder="https://..." value={webData.url} onChange={e => setWebData({...webData, url: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Access Date</Label>
              <Input placeholder="Oct. 24, 2024" value={webData.accessDate} onChange={e => setWebData({...webData, accessDate: e.target.value})} />
            </div>
            <Button className="w-full" onClick={generateWeb} disabled={!webData.title || !webData.url}>
              <Plus className="mr-2 h-4 w-4" /> Generate & Insert Web Reference
            </Button>
          </TabsContent>

          <TabsContent value="article" className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label>Author(s)</Label>
              <Input placeholder="A. Author" value={articleData.author} onChange={e => setArticleData({...articleData, author: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Article Title</Label>
              <Input placeholder="Study on AI" value={articleData.title} onChange={e => setArticleData({...articleData, title: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Journal Name</Label>
              <Input placeholder="IEEE Trans. on AI" value={articleData.journal} onChange={e => setArticleData({...articleData, journal: e.target.value})} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>Vol.</Label>
                <Input placeholder="1" value={articleData.vol} onChange={e => setArticleData({...articleData, vol: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>No.</Label>
                <Input placeholder="2" value={articleData.no} onChange={e => setArticleData({...articleData, no: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Pages</Label>
                <Input placeholder="10-20" value={articleData.pp} onChange={e => setArticleData({...articleData, pp: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Month & Year</Label>
              <Input placeholder="Jan. 2024" value={articleData.date} onChange={e => setArticleData({...articleData, date: e.target.value})} />
            </div>
            <Button className="w-full" onClick={generateArticle} disabled={!articleData.author || !articleData.title || !articleData.journal || !articleData.date}>
              <Plus className="mr-2 h-4 w-4" /> Generate & Insert Article Reference
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
