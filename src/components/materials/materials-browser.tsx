"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, ArrowLeft, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listS3Folder } from "@/actions/s3-actions";
import type { S3Item } from "@/actions/s3-actions";
import { FileRow } from "./file-row";

export function MaterialsBrowser() {
  const [activeTab, setActiveTab] = useState("class-pgn");
  const [currentPath, setCurrentPath] = useState("SMC_CLASS_PGN/");
  const [items, setItems] = useState<S3Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFolder = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listS3Folder(path);
      setItems(data);
      setCurrentPath(path);
    } catch (err) {
      setError("Failed to load folder contents. Make sure S3 credentials are correct.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "class-pgn") {
      fetchFolder("SMC_CLASS_PGN/");
    }
  }, [activeTab, fetchFolder]);

  const handleNavigate = (path: string) => {
    fetchFolder(path);
  };

  const handleNavigateUp = () => {
    // Current path is something like "SMC_CLASS_PGN/Core 1/"
    // We want to go up one level, e.g., to "SMC_CLASS_PGN/"
    const parts = currentPath.split("/").filter(Boolean);
    if (parts.length <= 1) return; // Can't go higher than root
    
    parts.pop();
    const newPath = parts.join("/") + "/";
    fetchFolder(newPath);
  };

  // Build breadcrumb segments
  const breadcrumbs = currentPath.split("/").filter(Boolean);

  return (
    <Card className="w-full">
      <div className="border-b p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="class-pgn">Class PGN</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="test-links">Test Links</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <CardContent className="p-0">
        {activeTab === "class-pgn" && (
          <div className="flex flex-col h-[500px]">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-2 p-4 border-b bg-slate-50/50">
              {breadcrumbs.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNavigateUp}
                  className="mr-2 h-8 px-2 text-slate-500 hover:text-slate-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              
              <div className="flex items-center text-sm font-medium text-slate-600 overflow-hidden">
                {breadcrumbs.map((part, index) => (
                  <div key={index} className="flex items-center whitespace-nowrap">
                    {index > 0 && <ChevronRight className="h-4 w-4 mx-1 text-slate-400 flex-shrink-0" />}
                    <span className={index === breadcrumbs.length - 1 ? "text-slate-900 font-semibold" : ""}>
                      {part}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-600" />
                  <p>Loading folder contents...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-red-500 p-6 text-center">
                  <p>{error}</p>
                  <Button variant="secondary" className="mt-4" onClick={() => fetchFolder(currentPath)}>
                    Retry
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <p>This folder is empty.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-md border border-slate-200 overflow-hidden m-2">
                  {items.map((item) => (
                    <FileRow 
                      key={item.key} 
                      item={item} 
                      onNavigate={handleNavigate} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {(activeTab === "assignments" || activeTab === "test-links") && (
          <div className="flex flex-col items-center justify-center h-[500px] text-slate-500 p-8 text-center bg-slate-50">
            <Info className="h-10 w-10 mb-4 text-slate-400" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Upload Soon</h3>
            <p className="text-sm max-w-sm">
              We are currently preparing the materials for this section. Please check back later.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
