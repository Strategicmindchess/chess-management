"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, UploadCloud, Play, Trash2, Pencil, Check, X, Loader2,
  AlertTriangle, CheckCircle2, Film, Plus,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import {
  initLessonUpload, completeLessonUpload, failLessonUpload,
  deleteLesson, updateLessonTitle, getLessonVideoUrl,
} from "@/actions/courses/lesson-actions";

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB per part (S3 minimum is 5 MB)
const CONCURRENCY = 4;
const MAX_RETRIES = 3;

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  lessonNumber: number;
  partNumber: number;
  status: "UPLOADING" | "READY" | "FAILED";
  isPreview: boolean;
};

type UploadJob = {
  key: string;
  title: string;
  progress: number;
  state: "uploading" | "done" | "error";
  error?: string;
};

/** PUT a single part with progress; resolves with its ETag. */
function putPart(url: string, blob: Blob, onProgress: (loaded: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) return reject(new Error("Missing ETag — add ETag to S3 CORS ExposeHeaders."));
        resolve(etag.replace(/"/g, ""));
      } else reject(new Error(`Part upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(blob);
  });
}

export default function LessonManager({ course, lessons, backHref }: { course: any; lessons: Lesson[]; backHref: string }) {
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [player, setPlayer] = useState<{ title: string; url: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const nextLessonNumber = lessons.length ? Math.max(...lessons.map((l) => l.lessonNumber)) + 1 : 1;

  const updateJob = (key: string, patch: Partial<UploadJob>) =>
    setJobs((prev) => prev.map((j) => (j.key === key ? { ...j, ...patch } : j)));

  async function startUpload(meta: { title: string; description: string; lessonNumber: number; partNumber: number; isPreview: boolean }, file: File) {
    const key = crypto.randomUUID();
    setJobs((prev) => [...prev, { key, title: meta.title, progress: 0, state: "uploading" }]);

    const partsCount = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    let lessonId: string | undefined;
    let uploadId: string | undefined;

    try {
      const init = await initLessonUpload({
        courseId: course.id,
        ...meta,
        fileName: file.name,
        contentType: file.type || "video/mp4",
        partsCount,
      });
      if (!init.success || !init.presignedUrls || !init.lessonId || !init.uploadId) {
        throw new Error(init.error || "Failed to start upload");
      }
      lessonId = init.lessonId;
      uploadId = init.uploadId;
      router.refresh();

      const loaded = new Array(partsCount).fill(0);
      const report = () =>
        updateJob(key, { progress: Math.min(99, Math.round((loaded.reduce((a, b) => a + b, 0) / file.size) * 100)) });

      const parts: { ETag: string; PartNumber: number }[] = [];
      const queue = [...init.presignedUrls];

      const worker = async () => {
        while (queue.length) {
          const { partNumber, url } = queue.shift()!;
          const start = (partNumber - 1) * CHUNK_SIZE;
          const blob = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
          let attempt = 0;
          while (true) {
            try {
              const etag = await putPart(url, blob, (l) => { loaded[partNumber - 1] = l; report(); });
              parts.push({ ETag: etag, PartNumber: partNumber });
              break;
            } catch (e) {
              if (++attempt >= MAX_RETRIES) throw e;
              loaded[partNumber - 1] = 0;
              await new Promise((r) => setTimeout(r, 1000 * attempt));
            }
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, partsCount) }, worker));

      parts.sort((a, b) => a.PartNumber - b.PartNumber);
      const done = await completeLessonUpload({ lessonId, uploadId, parts });
      if (!done.success) throw new Error(done.error || "Failed to finalize upload");

      updateJob(key, { progress: 100, state: "done" });
      setTimeout(() => setJobs((prev) => prev.filter((j) => j.key !== key)), 4000);
    } catch (err: any) {
      console.error(err);
      updateJob(key, { state: "error", error: err?.message || "Upload failed" });
      if (lessonId) await failLessonUpload(lessonId, uploadId);
    } finally {
      router.refresh();
    }
  }

  async function handlePlay(l: Lesson) {
    const res = await getLessonVideoUrl(l.id);
    if (res.success && res.url) setPlayer({ title: l.title, url: res.url });
    else alert(res.error);
  }

  async function handleDelete(l: Lesson) {
    if (!confirm(`Delete "${l.title}"? The video will be removed permanently.`)) return;
    const res = await deleteLesson(l.id);
    if (!res.success) alert(res.error);
    router.refresh();
  }

  async function saveTitle(id: string) {
    const res = await updateLessonTitle(id, editTitle);
    if (!res.success) return alert(res.error);
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to courses
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 p-5 md:flex-row md:items-center">
        <div className="aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-slate-800 md:w-64">
          {course.thumbnailUrl
            ? <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-slate-500"><Film className="h-10 w-10" /></div>}
        </div>
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            {course.level && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-200">{course.level.replace(/_/g, " ")}</span>}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${course.isPublished ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
              {course.isPublished ? "Published" : "Draft"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">{course.title}</h1>
          <p className="mt-1 line-clamp-2 text-slate-400">{course.description}</p>
          <p className="mt-3 text-sm text-slate-400">{lessons.length} lessons · ₹{(course.price / 100).toFixed(2)}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 md:self-center"
        >
          <Plus className="h-4 w-4" /> Add Lesson
        </button>
      </div>

      {/* Active uploads */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((j) => (
            <div key={j.key} className="rounded-xl border border-white/10 bg-slate-900 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-white">
                  {j.state === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />}
                  {j.state === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {j.state === "error" && <AlertTriangle className="h-4 w-4 text-red-400" />}
                  {j.title}
                </span>
                <span className="flex items-center gap-2 text-slate-400">
                  {j.state === "error" ? <span className="text-red-400">{j.error}</span> : `${j.progress}%`}
                  {j.state === "error" && (
                    <button onClick={() => setJobs((p) => p.filter((x) => x.key !== j.key))} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
                  )}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full transition-all ${j.state === "error" ? "bg-red-500" : j.state === "done" ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
                  style={{ width: `${j.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lessons list */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
        {lessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <UploadCloud className="h-10 w-10 text-slate-600" />
            <p>No lessons yet. Upload your first video.</p>
            <button onClick={() => setShowForm(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Add Lesson</button>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {lessons.map((l) => (
              <li key={l.id} className="flex items-center gap-4 p-4 transition hover:bg-white/[0.03]">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                  <span className="text-sm font-bold leading-none">{l.lessonNumber}</span>
                  <span className="text-[10px] leading-none opacity-70">P{l.partNumber}</span>
                </div>

                <div className="min-w-0 flex-1">
                  {editingId === l.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveTitle(l.id)}
                        className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500"
                      />
                      <button onClick={() => saveTitle(l.id)} className="text-emerald-400 hover:text-emerald-300"><Check className="h-4 w-4" /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <p className="truncate font-medium text-white">
                      Lesson {l.lessonNumber} / Part {l.partNumber} — {l.title}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    {l.status === "READY" && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">Ready</span>}
                    {l.status === "UPLOADING" && <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-300">Uploading</span>}
                    {l.status === "FAILED" && <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-red-300">Failed</span>}
                    {l.isPreview && <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-violet-300">Free preview</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button disabled={l.status !== "READY"} onClick={() => handlePlay(l)} title="Play"
                    className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30">
                    <Play className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setEditingId(l.id); setEditTitle(l.title); }} title="Rename"
                    className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(l)} title="Delete"
                    className="rounded-lg p-2 text-slate-300 transition hover:bg-red-500/20 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddLessonDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        defaultLessonNumber={nextLessonNumber}
        onSubmit={(meta, file) => { setShowForm(false); startUpload(meta, file); }}
      />

      <Dialog open={!!player} onClose={() => setPlayer(null)} title={player?.title ?? ""}>
        {player && <video src={player.url} controls autoPlay className="w-full rounded-lg bg-black" />}
      </Dialog>
    </div>
  );
}

function AddLessonDialog({
  open, onClose, defaultLessonNumber, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  defaultLessonNumber: number;
  onSubmit: (meta: { title: string; description: string; lessonNumber: number; partNumber: number; isPreview: boolean }, file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lessonNumber, setLessonNumber] = useState<number | "">("");
  const [partNumber, setPartNumber] = useState(1);
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState("");

  const reset = () => { setFile(null); setTitle(""); setDescription(""); setLessonNumber(""); setPartNumber(1); setIsPreview(false); setError(""); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError("Please select a video file.");
    if (!file.type.startsWith("video/")) return setError("Only video files are allowed.");
    if (!title.trim()) return setError("Title is required.");
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      lessonNumber: Number(lessonNumber || defaultLessonNumber),
      partNumber,
      isPreview,
    }, file);
    reset();
  };

  const field = "w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} title="Add Lesson">
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-slate-400 transition hover:border-indigo-500/60 hover:text-white">
          <UploadCloud className="h-8 w-8" />
          {file
            ? <span className="text-sm text-white">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span>
            : <span className="text-sm">Click to choose a video file</span>}
        </button>
        <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
        }} />

        <div>
          <label className="mb-1 block text-sm text-slate-300">Title</label>
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Description (optional)</label>
          <textarea rows={2} className={field} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Lesson number</label>
            <input type="number" min={1} placeholder={String(defaultLessonNumber)} className={field}
              value={lessonNumber} onChange={(e) => setLessonNumber(e.target.value ? Number(e.target.value) : "")} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Part number</label>
            <input type="number" min={1} className={field} value={partNumber} onChange={(e) => setPartNumber(Math.max(1, Number(e.target.value)))} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} className="accent-indigo-500" />
          Free preview lesson
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => { reset(); onClose(); }} className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
          <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            <UploadCloud className="h-4 w-4" /> Start Upload
          </button>
        </div>
      </form>
    </Dialog>
  );
}
