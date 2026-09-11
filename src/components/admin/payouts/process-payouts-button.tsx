"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { markPayoutsProcessed } from "@/actions/payout-actions";
import { useRouter } from "next/navigation";

interface Props {
  monthString: string;
}

export function ProcessPayoutsButton({ monthString }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleProcess = async () => {
    if (!confirm(`Are you sure you want to mark payouts for ${monthString} as processed? This will notify all active coaches.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = await markPayoutsProcessed(monthString);
      if (res.success) {
        alert(`Successfully processed payouts and notified ${res.notifiedCount} coaches.`);
        router.refresh();
      } else {
        alert("Failed to process payouts.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while processing payouts.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handleProcess}
      disabled={isProcessing}
      variant="secondary"
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors h-[38px]"
    >
      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
      Mark Processed
    </Button>
  );
}
