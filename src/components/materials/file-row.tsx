"use client";

import { useState } from "react";
import { Folder, File, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { S3Item } from "@/actions/s3-actions";
import { getS3DownloadUrls, listS3Folder } from "@/actions/s3-actions";

interface FileRowProps {
  item: S3Item;
  onNavigate?: (path: string) => void;
}

export function FileRow({ item, onNavigate }: FileRowProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isDownloading) return;
    setIsDownloading(true);
    
    try {
      if (item.type === 'file') {
        // Single file download
        const urls = await getS3DownloadUrls([item.key]);
        if (urls && urls.length > 0) {
          triggerDownload(urls[0], item.name);
        }
      } else {
        // Folder download - download all files within it
        const contents = await listS3Folder(item.key);
        const filesOnly = contents.filter(c => c.type === 'file');
        
        if (filesOnly.length === 0) {
          alert("No files to download in this folder.");
          return;
        }

        const urls = await getS3DownloadUrls(filesOnly.map(f => f.key));
        
        // Trigger downloads one by one
        for (let i = 0; i < urls.length; i++) {
          triggerDownload(urls[i], filesOnly[i].name);
          // Small delay to prevent browser from blocking too many simultaneous downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isFolder = item.type === 'folder';

  return (
    <div 
      className={`flex items-center justify-between p-3 border-b border-slate-100 dark:border-[#2a3040] last:border-0 transition-colors ${isFolder ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-[#242938]' : 'hover:bg-slate-50 dark:hover:bg-[#242938]'}`}
      onClick={() => isFolder && onNavigate && onNavigate(item.key)}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-md ${isFolder ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
          {isFolder ? <Folder className="h-5 w-5" /> : <File className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</p>
          {!isFolder && item.size && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{(item.size / 1024).toFixed(1)} KB</p>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30"
        onClick={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            {isFolder ? "Download All" : "Download"}
          </>
        )}
      </Button>
    </div>
  );
}

