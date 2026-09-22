"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, ArrowLeft, Loader2, Info, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listS3Folder } from "@/actions/s3-actions";
import type { S3Item } from "@/actions/s3-actions";
import { FileRow } from "./file-row";
import { MyStudentsList } from "./my-students-list";

// ── SMC Test Links Data ─────────────────────────────────────────────────────────
const SMC_TEST_LEVELS = [
  {
    level: "Beginner Level",
    tests: [
      { name: "Test 1", url: "https://forms.gle/yGES7RjhzDNRQ3ZA6" },
      { name: "Test 2", url: "https://forms.gle/ZJw9GWWCC4HNSdaq6" },
    ],
  },
  {
    level: "Core Level 1",
    tests: [
      { name: "Test 1", url: "https://forms.gle/u5GxpbHySTh3taR5A" },
      { name: "Test 2", url: "https://forms.gle/BsiSrgL95VizZ1gQ7" },
    ],
  },
  {
    level: "Core Level 2",
    tests: [
      { name: "Test 1", url: "https://forms.gle/Sdr8VeTz7LxGCAV97" },
      { name: "Test 2", url: "https://forms.gle/NxQLPPc52aqNnyQbA" },
    ],
  },
  {
    level: "Core Level 3",
    tests: [
      { name: "Test 1", url: "https://forms.gle/P9LyNKPLo9SZgFFz6" },
      { name: "Test 2", url: "https://forms.gle/BwBEwsLfFpb8eK9b6" },
    ],
  },
  {
    level: "Core Level 4",
    tests: [
      { name: "Test 1", url: "https://forms.gle/zcsKC6ha1QnQyvGS8" },
      { name: "Test 2", url: "https://forms.gle/zUM2xpVSwNdQ7FEJA" },
    ],
  },
  {
    level: "Intermediate Level 1",
    tests: [
      { name: "Test 1", url: "https://forms.gle/6z9VQUzexHtBe5558" },
      { name: "Test 2", url: "https://forms.gle/DzD8K6dBFXNQWi3cA" },
      { name: "Test 3", url: "https://forms.gle/v9rkxEAE4C1ZNwuf8" },
    ],
  },
  {
    level: "Intermediate Level 2",
    tests: [
      { name: "Test 1", url: "https://forms.gle/wHzVP2whQweE2vJe9" },
      { name: "Test 2", url: "https://forms.gle/wrK7jNZEZr6CxqEc6" },
    ],
  },
  {
    level: "Intermediate Level 3",
    tests: [
      { name: "Test 1", url: "https://forms.gle/2iyqumZPC8JajZF28" },
      { name: "Test 2", url: "https://forms.gle/W2rnMvSGvbJ3LctV6" },
      { name: "Test 3", url: "https://forms.gle/msdPNNk6oBtbPE3R9" },
    ],
  },
  {
    level: "Advance Level 1",
    tests: [
      { name: "Test 1", url: "https://forms.gle/VPTz7vuZmHtwxJLs7" },
      { name: "Test 2", url: "https://forms.gle/zPkBmstwbDbyrC9D7" },
      { name: "Test 3", url: "https://forms.gle/8p44soMT2k5FWxPk6" },
    ],
  },
  {
    level: "Advance Level 2",
    tests: [
      { name: "Test 1", url: "https://forms.gle/BTG9WwxLRdDaxJoc7" },
      { name: "Test 2", url: "https://forms.gle/gSZwnq4Zuusza1b98" },
      { name: "Test 3", url: "https://forms.gle/MjDiivz7PD8HDi9VA" },
    ],
  },
  {
    level: "Elite Level",
    tests: [
      { name: "Test 1", url: "https://forms.gle/nPRcXHsjNfNo7F5u8" },
      { name: "Test 2", url: "https://forms.gle/jNfu9S5FVDbDbugX7" },
      { name: "Test 3", url: "https://forms.gle/HdcU2QzVbtfoMSVt9" },
    ],
  },
  {
    level: "Master Level",
    tests: [
      { name: "Test 1", url: "https://forms.gle/a1aTWybNyiYZouv29" },
      { name: "Test 2", url: "https://forms.gle/b1a4Zmr5NxXQnuM78" },
      { name: "Test 3", url: "https://forms.gle/yxcNqkGXa7eHTygw6" },
    ],
  },
];

function TestLinksSection() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  return (
    <div className="h-[500px] overflow-auto p-4 space-y-3 bg-[#111723]/30">
      <div className="px-2 pb-2 border-b border-slate-700/50">
        <h3 className="text-base font-semibold text-white">SMC Test Links</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          All levels — click any test to open it in a new tab.
        </p>
      </div>

      {SMC_TEST_LEVELS.map((level, idx) => (
        <div
          key={level.level}
          className="rounded-lg border border-slate-700/50 bg-[#1a1f2e] overflow-hidden"
        >
          <button
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1e2538] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-slate-200">
                {level.level}
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-brand-600/10 text-brand-400 border border-brand-500/20 rounded-full font-medium">
                {level.tests.length} {level.tests.length === 1 ? "test" : "tests"}
              </span>
            </div>
            {expandedIdx === idx ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            )}
          </button>

          {expandedIdx === idx && (
            <div className="border-t border-slate-700/50 divide-y divide-slate-700/30">
              {level.tests.map((test) => (
                <a
                  key={test.url}
                  href={test.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#111723]/60 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-3.5 w-3.5 text-brand-500" />
                    <span className="text-sm text-slate-300 group-hover:text-brand-400 transition-colors">
                      {test.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-600 group-hover:text-slate-400 truncate max-w-[200px]">
                    {test.url.replace("https://", "")}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function MaterialsBrowser() {
  const [activeTab, setActiveTab] = useState("class-pgn");
  const [currentPath, setCurrentPath] = useState("SMC_CLASS_PGN/");
  const [items, setItems] = useState<S3Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, S3Item[]>>({});

  const fetchFolder = useCallback(async (path: string, force = false) => {
    if (!force && cache[path]) {
      setItems(cache[path]);
      setCurrentPath(path);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      let finalData: S3Item[] = [];

      if (activeTab === "class-pgn") {
        const data = await listS3Folder(path);
        finalData = data.filter(item => {
          const lowerName = item.name.toLowerCase();
          return !lowerName.includes("lesson plan") && !lowerName.includes("assignment");
        });
      } else if (activeTab === "assignments") {
        const data = await listS3Folder(path);
        finalData = [...data];
        
        // Also fetch from SMC_CLASS_PGN to catch misplaced assignments if we are at root
        if (path === "SMC_ASSIGNMENT/") {
          try {
            const extraData = await listS3Folder("SMC_CLASS_PGN/");
            const misplaced = extraData.filter(item => item.name.toLowerCase().includes("assignment"));
            const existingKeys = new Set(finalData.map(i => i.key));
            misplaced.forEach(item => {
              if (!existingKeys.has(item.key)) {
                finalData.push(item);
              }
            });
          } catch (e) {
            console.error("Failed fetching misplaced assignments", e);
          }
        }
      }

      setCache(prev => ({ ...prev, [path]: finalData }));
      setItems(finalData);
      setCurrentPath(path);
    } catch (err) {
      setError("Failed to load folder contents. Make sure S3 credentials are correct.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, cache]);

  useEffect(() => {
    if (activeTab === "class-pgn") {
      fetchFolder("SMC_CLASS_PGN/");
    } else if (activeTab === "assignments") {
      fetchFolder("SMC_ASSIGNMENT/");
    }
  }, [activeTab]);

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
      <div className="border-b dark:border-slate-800 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="class-pgn">Class PGN</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="test-links">Test Links</TabsTrigger>
            <TabsTrigger value="my-students">My Students</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <CardContent className="p-0">
        {(activeTab === "class-pgn" || activeTab === "assignments") && (
          <div className="flex flex-col h-[500px]">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-2 p-4 border-b bg-slate-50/50 dark:bg-[#11141c]/50 dark:border-slate-800">
              {breadcrumbs.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNavigateUp}
                  className="mr-2 h-8 px-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              
              <div className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 overflow-hidden">
                {breadcrumbs.map((part, index) => (
                  <div key={index} className="flex items-center whitespace-nowrap">
                    {index > 0 && <ChevronRight className="h-4 w-4 mx-1 text-slate-400 dark:text-slate-500 flex-shrink-0" />}
                    <span className={index === breadcrumbs.length - 1 ? "text-slate-900 dark:text-white font-semibold" : ""}>
                      {part}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-600 dark:text-brand-400" />
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
                <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                  <p>This folder is empty.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-[#2a3040] rounded-md border border-slate-200 dark:border-[#2a3040] overflow-hidden m-2">
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

        {activeTab === "test-links" && (
          <TestLinksSection />
        )}

        {activeTab === "my-students" && (
          <MyStudentsList />
        )}
      </CardContent>
    </Card>
  );
}

