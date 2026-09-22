import { Metadata } from "next";
import { getCoachesList } from "@/actions/admin-feedback-actions";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import FeedbackDashboardClient from "./FeedbackDashboardClient";

export const metadata: Metadata = {
  title: "Student Feedback - SMC CRM",
  description: "View student feedback across classes",
};

export default async function AdminFeedbackPage() {
  await requireRole([Role.ADMIN]);

  const coaches = await getCoachesList();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Student Feedback</h2>
      </div>
      <FeedbackDashboardClient initialCoaches={coaches} />
    </div>
  );
}
