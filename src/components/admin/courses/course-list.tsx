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
  
  const [accessModalCourse, setAccessModalCourse] = useState<any>(null);

  const handleEdit = (course: any) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
  };

  const filteredCourses = initialCourses.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input 
              placeholder="Search courses by title or description..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border-white/10 pl-9 text-slate-200 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <select className="h-10 rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500">
              <option>All Status</option>
            </select>
            <select className="h-10 rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500">
              <option>All Levels</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 p-1">
            <button className="rounded-md bg-indigo-600 p-1.5 text-white"><Grid className="h-4 w-4" /></button>
            <button className="rounded-md p-1.5 text-slate-500 hover:text-white"><List className="h-4 w-4" /></button>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#5B45FF] hover:bg-[#4A35FF] text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Add New Course
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCourses.map(course => (
          <CourseCard 
            key={course.id} 
            course={course} 
            onEdit={() => handleEdit(course)} 
            onManageAccess={() => setAccessModalCourse(course)}
          />
        ))}
        {filteredCourses.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center">
            <p className="text-slate-400">No courses found matching your criteria.</p>
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
