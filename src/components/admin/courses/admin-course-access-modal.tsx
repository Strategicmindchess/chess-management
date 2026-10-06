"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, UserPlus, Trash2, CheckCircle2 } from "lucide-react";
import { fetchStudentsForAccess, grantCourseAccess, revokeCourseAccess } from "@/actions/courses/course-access-actions";

type Student = { id: string; name: string; email: string; phone: string | null };

export default function AdminCourseAccessModal({
  isOpen,
  onClose,
  course,
}: {
  isOpen: boolean;
  onClose: () => void;
  course: any;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [localGranted, setLocalGranted] = useState<Set<string>>(new Set());
  const [localRevoked, setLocalRevoked] = useState<Set<string>>(new Set());

  const observer = useRef<IntersectionObserver | null>(null);

  const fetchStudents = async (searchQuery: string, cursor?: string) => {
    try {
      const res = await fetchStudentsForAccess(searchQuery, cursor);
      if (cursor) {
        setResults((prev) => [...prev, ...res.students]);
      } else {
        setResults(res.students);
      }
      setNextCursor(res.nextCursor);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      await fetchStudents(query);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !nextCursor) return;
    setLoadingMore(true);
    await fetchStudents(query, nextCursor);
    setLoadingMore(false);
  }, [loadingMore, nextCursor, query]);

  const lastElementRef = useCallback((node: HTMLLIElement) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && nextCursor) {
        loadMore();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, nextCursor, loadMore]);

  const handleGrant = async (studentId: string) => {
    setProcessingId(studentId);
    const res = await grantCourseAccess(course.id, studentId);
    if (res.success) {
      setLocalGranted(prev => new Set(prev).add(studentId));
      setLocalRevoked(prev => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    } else {
      alert(res.error);
    }
    setProcessingId(null);
  };

  const handleRevoke = async (studentId: string) => {
    if (!confirm("Remove access for this student?")) return;
    setProcessingId(studentId);
    const res = await revokeCourseAccess(course.id, studentId);
    if (res.success) {
      setLocalRevoked(prev => new Set(prev).add(studentId));
      setLocalGranted(prev => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    } else {
      alert(res.error);
    }
    setProcessingId(null);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title={`Manage Access: ${course?.title}`}>
      <div className="space-y-4 pt-2">
        <p className="text-sm text-slate-400">
          Search for students to manually grant or revoke access to this course.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            autoFocus
            placeholder="Search by name, email, or phone..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="min-h-[300px] max-h-[400px] border rounded-lg bg-slate-900/50 p-2 overflow-y-auto scroll-smooth">
          {loading ? (
            <div className="flex h-[200px] items-center justify-center text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-500 py-10">
              No students found
            </div>
          ) : (
            <ul className="space-y-2">
              {results.map((student, index) => {
                const originallyHasAccess = course?.accesses?.some((a: any) => a.studentId === student.id);
                const hasAccess = localGranted.has(student.id) || (originallyHasAccess && !localRevoked.has(student.id));
                const isLastElement = index === results.length - 1;

                return (
                  <li 
                    key={student.id} 
                    ref={isLastElement ? lastElementRef : null}
                    className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-slate-950"
                  >
                    <div>
                      <div className="font-medium text-sm text-white">{student.name}</div>
                      <div className="text-xs text-slate-500 flex gap-2">
                        <span>{student.email}</span>
                        {student.phone && <span>· {student.phone}</span>}
                      </div>
                    </div>
                    
                    <div>
                      {hasAccess ? (
                        <Button 
                          size="sm"
                          className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleRevoke(student.id)}
                          disabled={processingId === student.id}
                        >
                          {processingId === student.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Granted
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          variant="secondary"
                          className="h-8 gap-1.5"
                          onClick={() => handleGrant(student.id)}
                          disabled={processingId === student.id}
                        >
                          {processingId === student.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )}
                          Grant
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
              
              {loadingMore && (
                <div className="flex justify-center py-4 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}
