"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StartBatchButton({ meetLink, batchName }: { meetLink: string; batchName: string }) {
  const handleClick = () => {
    console.log(`[Start Batch] Batch: ${batchName}, MeetLink: ${meetLink}`);
    
    if (meetLink) {
      window.open(meetLink, "_blank");
    } else {
      console.warn("No meet link provided for this batch.");
    }
  };

  return (
    <Button 
      onClick={handleClick} 
      className="w-full bg-brand-600 hover:bg-brand-700" 
      size="sm"
    >
      Start Batch
    </Button>
  );
}
