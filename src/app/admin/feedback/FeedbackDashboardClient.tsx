"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { getCoachClassesForFeedback } from "@/actions/admin-feedback-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeaderCell } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Coach = { id: string; name: string; email: string };
type ClassLogData = Awaited<ReturnType<typeof getCoachClassesForFeedback>>["data"][0];

export default function FeedbackDashboardClient({
  initialCoaches,
}: {
  initialCoaches: Coach[];
}) {
  const [selectedCoachId, setSelectedCoachId] = useState<string>("");
  const [classLogs, setClassLogs] = useState<ClassLogData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [selectedLog, setSelectedLog] = useState<ClassLogData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

  useEffect(() => {
    if (!selectedCoachId) {
      setClassLogs([]);
      setCurrentPage(1);
      setTotalPages(1);
      return;
    }

    const fetchClasses = async () => {
      setIsLoading(true);
      try {
        const result = await getCoachClassesForFeedback(selectedCoachId, currentPage, 20);
        setClassLogs(result.data);
        setTotalPages(result.totalPages);
      } catch (error) {
        console.error("Failed to fetch classes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClasses();
  }, [selectedCoachId, currentPage]);

  const openFeedbackModal = async (log: ClassLogData) => {
    setSelectedLog(log);
    setIsModalOpen(true);
    setIsLoadingFeedback(true);
    setFeedbacks([]);

    try {
      const res = await fetch(`/api/class-feedback?classLogId=${log.id}`);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
      }
    } catch (error) {
      console.error("Failed to load feedback details:", error);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "CALCULATED":
        return "success";
      case "WAIVED":
      case "OVERRIDDEN":
        return "warning";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Coach</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedCoachId} 
            onChange={(e) => {
              setSelectedCoachId(e.target.value);
              setCurrentPage(1);
            }}
            className="w-[300px]"
          >
            <option value="">Select a coach...</option>
            {initialCoaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.email})
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {selectedCoachId && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-slate-500">Loading classes...</div>
            ) : classLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No completed classes found for this coach.</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border border-slate-200 dark:border-slate-800">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Batch & Date</TableHeaderCell>
                        <TableHeaderCell>Scheduled vs Join</TableHeaderCell>
                        <TableHeaderCell>Feedback</TableHeaderCell>
                        <TableHeaderCell>Reports (Cam/Phone)</TableHeaderCell>
                        <TableHeaderCell>Penalty</TableHeaderCell>
                        <TableHeaderCell></TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {classLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="font-medium">{log.batchName}</div>
                            <div className="text-sm text-slate-500">
                              {format(new Date(log.date), "dd MMM yyyy")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="text-slate-500">Sched:</span> {log.scheduledStart} - {log.scheduledEnd}
                            </div>
                            <div className="text-sm">
                              <span className="text-slate-500">Joined:</span>{" "}
                              {log.actualFirstJoin ? format(new Date(log.actualFirstJoin), "HH:mm") : "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {log.feedbackSubmitted} / {log.totalEnrolled}
                            </div>
                            <div className="text-xs text-slate-500">
                              {log.feedbackPercentage.toFixed(1)}% Coverage
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">Cam: {log.cameraReports}</div>
                            <div className="text-sm">Phone: {log.phoneReports}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <Badge variant={getStatusBadgeVariant(log.penaltyStatus)}>
                                {log.penaltyStatus}
                              </Badge>
                              {log.penaltyAmount > 0 && (
                                <span className="text-sm text-rose-600 font-medium">₹{log.penaltyAmount}</span>
                              )}
                              {log.penaltyStatus === "PENDING" && log.calculatesOn && (
                                <span className="text-xs text-slate-500">
                                  ETA: {format(new Date(log.calculatesOn), "dd MMM, HH:mm")}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="secondary" onClick={() => openFeedbackModal(log)}>
                              View Feedback
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="text-sm text-slate-500">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Student Feedback Details"
      >
        {selectedLog && (
          <div className="space-y-6 mt-4">
            {/* Summary Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div>
                <div className="text-sm text-slate-500">Feedback</div>
                <div className="font-medium">
                  {selectedLog.feedbackSubmitted} / {selectedLog.totalEnrolled}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Camera Reports</div>
                <div className="font-medium">
                  {selectedLog.cameraReports} / {selectedLog.feedbackSubmitted}{" "}
                  {selectedLog.feedbackSubmitted > 0
                    ? `=${((selectedLog.cameraReports / selectedLog.feedbackSubmitted) * 100).toFixed(1)}%`
                    : ""}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Phone Reports</div>
                <div className="font-medium">
                  {selectedLog.phoneReports} / {selectedLog.feedbackSubmitted}{" "}
                  {selectedLog.feedbackSubmitted > 0
                    ? `=${((selectedLog.phoneReports / selectedLog.feedbackSubmitted) * 100).toFixed(1)}%`
                    : ""}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Consensus Threshold</div>
                <div className="font-medium">80%</div>
              </div>
            </div>

            {/* Engine Penalty Info */}
            <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-900/30 dark:bg-rose-900/10 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-rose-700 dark:text-rose-400">Penalty Applied:</span>
                <span className="dark:text-rose-300">₹{selectedLog.penaltyAmount}</span>
              </div>
              <div>
                <span className="font-semibold block text-sm mb-1 dark:text-slate-300">Engine Note:</span>
                <div className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                  {selectedLog.penaltyNote || "No penalty note available."}
                </div>
              </div>
            </div>

            {/* Student Table */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Student Breakdown</h3>
              {isLoadingFeedback ? (
                <div className="py-4 text-center text-slate-500">Loading details...</div>
              ) : feedbacks.length === 0 ? (
                <div className="py-4 text-center text-slate-500">No students have submitted feedback yet.</div>
              ) : (
                <div className="rounded-md border border-slate-200 dark:border-slate-800">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Student</TableHeaderCell>
                        <TableHeaderCell>Camera &gt;5m</TableHeaderCell>
                        <TableHeaderCell>Phone &gt;4x</TableHeaderCell>
                        <TableHeaderCell>Quality</TableHeaderCell>
                        <TableHeaderCell>Concept</TableHeaderCell>
                        <TableHeaderCell>Submitted At</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {feedbacks.map((f: any) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">
                            {f.student?.user?.name || "Unknown"}
                          </TableCell>
                          <TableCell>{f.cameraOffOver5Min ? "Yes" : "No"}</TableCell>
                          <TableCell>{f.phoneUsedOver4Times ? "Yes" : "No"}</TableCell>
                          <TableCell>{f.classQualityScore || "-"}/10</TableCell>
                          <TableCell>{f.conceptUnderstood ? "Yes" : "No"}</TableCell>
                          <TableCell>
                            {format(new Date(f.submittedAt), "HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
