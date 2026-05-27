"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type MemberVideoDialogProps = {
  onOpenChange: (open: boolean) => void;
  title: string;
  videoId: string | null;
};

function buildVideoEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&fs=1&controls=1&disablekb=1&iv_load_policy=3&hl=id`;
}

export function MemberVideoDialog({ onOpenChange, title, videoId }: MemberVideoDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={videoId !== null}>
      <DialogContent
        className="w-[90%] max-w-[20rem] overflow-visible border border-white/8 bg-[#171b24] p-[6px] shadow-[0_20px_40px_rgba(0,0,0,0.5)] sm:w-[70vw] sm:max-w-[1200px] sm:max-h-[85vh] sm:p-2"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Video Tutorial</DialogDescription>
        </DialogHeader>
        <Button
          className="absolute -right-3 -top-3 z-10 size-9 rounded-full border-0 bg-red-500 text-white shadow-[0_4px_10px_rgba(239,68,68,0.4)] hover:scale-110 hover:bg-red-600 focus-visible:border-white/10 focus-visible:ring-red-500/30 sm:-right-4 sm:-top-4 sm:size-10"
          onClick={() => onOpenChange(false)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X />
          <span className="sr-only">Tutup Video</span>
        </Button>
        {videoId ? (
          <div className="relative h-0 overflow-hidden rounded-[4px] border border-white/8 bg-black pb-[177.77%] sm:max-h-[calc(85vh-16px)] sm:pb-[62.5%]">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 size-full border-0"
              loading="lazy"
              src={buildVideoEmbedUrl(videoId)}
              title={title}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
