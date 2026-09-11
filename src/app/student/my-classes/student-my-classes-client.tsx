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
    <div className="space-y-10 max-w-7xl relative pb-10">

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          My Classroom
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Your enrolled batches, upcoming schedule, and assignments.
        </p>
      </div>

      <Tabs defaultValue="sessions" className="space-y-8">
        <TabsList className="bg-white dark:bg-[#11141c]/90 dark:backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-1">
          <TabsTrigger value="sessions" className="data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white dark:text-slate-400 rounded-lg">Sessions</TabsTrigger>
          <TabsTrigger value="assignments" className="data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white dark:text-slate-400 rounded-lg">
            Assignments {assignments.filter(a => a.status === 'PENDING').length > 0 && (
              <span className="ml-2 bg-brand-500 text-brand-950 text-xs px-2 py-0.5 rounded-full font-bold">
                {assignments.filter(a => a.status === 'PENDING').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-10 focus:outline-none">
          {/* Today's Classes */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Today's Sessions</h2>
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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Upcoming Next 3 Days</h2>
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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Your Assignments</h2>
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

