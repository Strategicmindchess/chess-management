"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import CourseFormModal from "./course-form-modal";
import CourseCard from "./course-card";
import { Plus } from "lucide-react";

export default function CourseList({ initialCourses }: { initialCourses: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);

  const handleEdit = (course: any) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add New Course
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {initialCourses.map(course => (
          <CourseCard key={course.id} course={course} onEdit={() => handleEdit(course)} />
        ))}
        {initialCourses.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
            No courses found. Create your first course to get started.
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
    </div>
  );
}
