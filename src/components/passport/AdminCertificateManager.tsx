"use client";

import { useState, useTransition } from "react";
import {
  issueStudentCertificate,
  deleteStudentCertificate,
} from "@/actions/passport/passport-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Award, Plus, Trash2, CheckCircle2, ShieldAlert } from "lucide-react";

interface CertificateItem {
  id: string;
  certificateNumber: string;
  title: string;
  description?: string | null;
  category: string;
  issueDate: string;
  certificateUrl?: string | null;
}

interface Props {
  studentProfileId: string;
  studentName: string;
  initialCertificates: CertificateItem[];
}

export function AdminCertificateManager({
  studentProfileId,
  studentName,
  initialCertificates,
}: Props) {
  const [certs, setCerts] = useState<CertificateItem[]>(initialCertificates);
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<any>("COURSE_COMPLETION");
  const [certUrl, setCertUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a certificate title.");
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await issueStudentCertificate({
        studentProfileId,
        title,
        description,
        category,
        certificateUrl: certUrl || undefined,
      });

      if (res.success) {
        setSuccess("Certificate issued successfully!");
        const newCert: CertificateItem = {
          id: res.certificateId || Math.random().toString(),
          title,
          description,
          category,
          certificateNumber: `SMC-CERT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
          issueDate: new Date().toISOString().split("T")[0],
          certificateUrl: certUrl || null,
        };
        setCerts((prev) => [newCert, ...prev]);
        setTitle("");
        setDescription("");
        setCertUrl("");
        setShowAddForm(false);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error || "Failed to issue certificate");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to revoke this certificate?")) return;
    startTransition(async () => {
      const res = await deleteStudentCertificate(id);
      if (res.success) {
        setCerts((prev) => prev.filter((c) => c.id !== id));
      } else {
        setError(res.error || "Failed to delete certificate");
      }
    });
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-lg font-bold">
            Student Certificates &amp; Credentials
          </CardTitle>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Issue Certificate
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-xs rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        {/* Add Certificate Form */}
        {showAddForm && (
          <form
            onSubmit={handleIssue}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
              Issue Official SMC Certificate to {studentName}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Certificate Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Beginner Chess Course Completion"
                  className="text-xs mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-xs">Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs mt-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="COURSE_COMPLETION">Course Completion</option>
                  <option value="TOURNAMENT_WIN">Tournament Victory</option>
                  <option value="TACTICAL_MASTERY">Tactical Mastery</option>
                  <option value="MERIT">Merit &amp; Discipline</option>
                  <option value="SPECIAL_ACHIEVEMENT">Special Achievement</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Citation / Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Commending successful completion of Core syllabus sessions, tactical problem sets, and competitive play..."
                className="w-full text-xs mt-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none h-16"
              />
            </div>

            <div>
              <Label className="text-xs">Certificate URL (PDF or Image link, optional)</Label>
              <Input
                value={certUrl}
                onChange={(e) => setCertUrl(e.target.value)}
                placeholder="https://... (or leave blank for digital verified credential)"
                className="text-xs mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {isPending ? "Issuing..." : "Confirm & Issue"}
              </Button>
            </div>
          </form>
        )}

        {/* Existing Certificates List */}
        {certs.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            No certificates issued to this student yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
            {certs.map((c) => (
              <div
                key={c.id}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {c.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold">
                      {c.category.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-3">
                    <span className="font-mono">{c.certificateNumber}</span>
                    <span>Issued: {c.issueDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(c.id)}
                    disabled={isPending}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 w-8 p-0"
                    title="Revoke Certificate"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
