"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { ClassSessionCard } from "@/components/dashboard/class-session-card";
import { StudentAssignmentCard } from "@/components/dashboard/student-assignment-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStudentMyClasses } from "@/hooks/use-student-my-classes";
import { Loader2 } from "lucide-react";

export function StudentMyClassesClient() {
  const { data, isLoading, error } = useStudentMyClasses();

  if (error) {
    return <div className="text-red-500">Failed to load classroom data.</div>;
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const { todayInstances, upcomingInstances, assignments } = data;

  return (
    <div className="space-y-10 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Classroom
        </h1>
        <p className="text-slate-500 mt-1">
          Your enrolled batches, upcoming schedule, and assignments.
        </p>
      </div>

      <Tabs defaultValue="sessions" className="space-y-8">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="sessions" className="data-[state=active]:bg-slate-100">Sessions</TabsTrigger>
          <TabsTrigger value="assignments" className="data-[state=active]:bg-slate-100">
            Assignments {assignments.filter(a => a.status === 'PENDING').length > 0 && (
              <span className="ml-2 bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">
                {assignments.filter(a => a.status === 'PENDING').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-10 focus:outline-none">
          {/* Today's Classes */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Today's Sessions</h2>
            {todayInstances.length === 0 ? (
              <EmptyState
                title="No classes today"
                description="You don't have any classes scheduled for today, or they have already ended."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {todayInstances.map((instance) => (
                  <ClassSessionCard 
                    key={instance.id} 
                    role="student" 
                    session={instance} 
                    isUpcoming={false} 
                  />
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Classes */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Next 3 Days</h2>
            {upcomingInstances.length === 0 ? (
              <EmptyState
                title="No upcoming classes"
                description="You don't have any classes scheduled for the next 3 days."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80">
                {upcomingInstances.map((instance) => (
                  <ClassSessionCard 
                    key={instance.id} 
                    role="student" 
                    session={instance} 
                    isUpcoming={true} 
                  />
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="assignments" className="focus:outline-none">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Assignments</h2>
            {assignments.length === 0 ? (
              <EmptyState
                title="No assignments yet"
                description="Assignments will appear here 24 hours after your teacher marks a class as held."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {assignments.map((assignment) => (
                  <StudentAssignmentCard key={assignment.id} assignment={assignment} />
                ))}
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
