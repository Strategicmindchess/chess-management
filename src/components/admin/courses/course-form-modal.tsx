"use client";

import { useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCourse, updateCourse, getThumbnailUploadUrl } from "@/actions/courses/course-actions";
import { UploadCloud } from "lucide-react";

export default function CourseFormModal({ isOpen, onClose, course }: { isOpen: boolean, onClose: () => void, course?: any }) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    title: course?.title || "",
    description: course?.description || "",
    thumbnailUrl: course?.thumbnailUrl || "",
    price: course ? (course.price / 100).toString() : "0", 
    level: course?.level || "",
  });

  const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError("");
    
    try {
      // 1. Get presigned URL from backend
      const res = await getThumbnailUploadUrl(file.type, file.name);
      
      // 2. Upload file to S3
      const uploadRes = await fetch(res.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image to storage");
      }

      // 3. Set the public URL to form data
      setFormData(prev => ({ ...prev, thumbnailUrl: res.publicUrl }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const input: any = {
      ...formData,
      thumbnailUrl: formData.thumbnailUrl.trim() || null,
      price: Math.round(Number(formData.price) * 100), // rupees to paise
      level: formData.level === "" ? null : formData.level,
    };

    try {
      const res = course
        ? await updateCourse({ id: course.id, ...input })
        : await createCourse(input);

      if (res.success) {
        onClose();
      } else {
        setError(res.error || "Something went wrong");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Server error while saving course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      title={course ? "Edit Course" : "Create New Course"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-red-500 text-sm">{error}</div>}
        
        <div className="space-y-2">
          <Label>Course Title</Label>
          <Input name="title" required value={formData.title} onChange={handleChange} />
        </div>
        
        <div className="space-y-2">
          <Label>Description</Label>
          <Input name="description" required value={formData.description} onChange={handleChange} />
        </div>

        <div className="space-y-2">
          <Label>Thumbnail URL (Optional)</Label>
          <div className="flex gap-2">
            <Input name="thumbnailUrl" value={formData.thumbnailUrl} onChange={handleChange} placeholder="https://..." className="flex-1" />
            <div className="relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploadingImage}
              />
              <Button type="button" variant="secondary" disabled={uploadingImage}>
                <UploadCloud className="w-4 h-4 mr-2" />
                {uploadingImage ? "Uploading..." : "Upload Photo"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Upload a thumbnail directly or paste an image URL.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Price (₹)</Label>
            <Input type="number" name="price" required min="0" step="0.01" value={formData.price} onChange={handleChange} />
          </div>
          
          <div className="space-y-2">
            <Label>Level</Label>
            <select 
              name="level" 
              value={formData.level} 
              onChange={handleChange}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Levels / Unspecified</option>
              <option value="BEGINNER">Beginner</option>
              <option value="CORE_1">Core 1</option>
              <option value="CORE_2">Core 2</option>
              <option value="CORE_3">Core 3</option>
              <option value="CORE_4">Core 4</option>
              <option value="BRIDGE">Bridge</option>
              <option value="INTERMEDIATE_1">Intermediate 1</option>
              <option value="INTERMEDIATE_2">Intermediate 2</option>
              <option value="INTERMEDIATE_3">Intermediate 3</option>
              <option value="ADVANCE_1">Advance 1</option>
              <option value="ADVANCE_2">Advance 2</option>
              <option value="ELITE">Elite</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Course"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
