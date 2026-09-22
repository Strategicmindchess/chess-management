"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordClassJoinTime } from "@/actions/join-class-actions";

export function StartBatchButton({ meetLink, batchName, classInstanceId }: { meetLink: string; batchName: string, classInstanceId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    console.log(`[Start Batch] Batch: ${batchName}, MeetLink: ${meetLink}`);
    
    setIsLoading(true);
    try {
      await recordClassJoinTime(classInstanceId);
    } catch (err) {
      console.error("Failed to record join time", err);
    } finally {
      setIsLoading(false);
      if (meetLink) {
        window.open(meetLink, "_blank");
      } else {
        console.warn("No meet link provided for this batch.");
      }
    }
  };

  return (
    <Button 
      onClick={handleClick} 
      disabled={isLoading}
      className="w-full bg-brand-600 hover:bg-brand-700" 
      size="sm"
    >
      {isLoading ? "Starting..." : "Start Batch"}
    </Button>
  );
}

