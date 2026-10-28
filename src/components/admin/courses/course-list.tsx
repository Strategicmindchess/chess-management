"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CourseFormModal from "./course-form-modal";
import CourseCard from "./course-card";
import AdminCourseAccessModal from "./admin-course-access-modal";
import { Plus, Search, Grid, List } from "lucide-react";

export default function CourseList({ initialCourses }: { initialCourses: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const [accessModalCourse, setAccessModalCourse] = useState<any>(null);

  const handleEdit = (course: any) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
  };

  const filteredCourses = initialCourses.filter(c => {
    const matchesQuery =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PUBLISHED" && c.isPublished) ||
      (statusFilter === "DRAFT" && !c.isPublished);

    const matchesLevel =
      levelFilter === "ALL" ||
      c.level === levelFilter;

    return matchesQuery && matchesStatus && matchesLevel;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input 
              placeholder="Search courses by title or description..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 pl-9 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 shadow-xs"
            />
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 shadow-xs cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 shadow-xs cursor-pointer"
            >
              <option value="ALL">All Levels</option>
              <option value="BEGINNER">Beginner</option>
              <option value="CORE_1">Core 1</option>
              <option value="CORE_2">Core 2</option>
              <option value="CORE_3">Core 3</option>
              <option value="CORE_4">Core 4</option>
              <option value="BRIDGE">Bridge</option>
              <option value="INTERMEDIATE_1">Intermediate 1</option>
              <option value="INTERMEDIATE_2">Intermediate 2</option>
              <option value="ADVANCE">Advance</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-1 shadow-xs">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white"}`}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-1.5 transition ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white"}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#5B45FF] hover:bg-[#4A35FF] text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Add New Course
          </Button>
        </div>
      </div>

      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
        {filteredCourses.map(course => (
          <CourseCard 
            key={course.id} 
            course={course} 
            onEdit={() => handleEdit(course)} 
            onManageAccess={() => setAccessModalCourse(course)}
          />
        ))}
        {filteredCourses.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 py-20 text-center bg-slate-50/50 dark:bg-transparent">
            <p className="text-slate-500 dark:text-slate-400">No courses found matching your criteria.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <CourseFormModal 
          isOpen={isModalOpen} 
          onClose={handleClose} 
          course={editingCourse} 
        />
      )}

      {accessModalCourse && (
        <AdminCourseAccessModal
          isOpen={!!accessModalCourse}
          onClose={() => setAccessModalCourse(null)}
          course={accessModalCourse}
        />
      )}
    </div>
  );
}
