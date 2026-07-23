"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In a real production app, you might send this to Sentry or another logging service
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 flex flex-col items-center">
        <div className="bg-red-50 p-4 rounded-full mb-6">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          We experienced an unexpected issue. Our team has been notified. 
          Please try again or return to the home page.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button 
            onClick={() => reset()} 
            className="w-full"
            variant="primary"
          >
            Try Again
          </Button>
          <Link href="/" className="w-full">
            <Button variant="secondary" className="w-full">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
