"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { compressImage, dataUrlToBase64 } from "@/lib/imageCompress";

interface PhotoCaptureFieldProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  /**
   * Optional: when provided, the compressed photo is also uploaded as a real
   * Attachment (trpc.attachment.create) and this fires with the result.
   * Callers that omit it keep the old local-preview-only behavior.
   */
  onUpload?: (result: { attachmentId: string; dataUrl: string }) => void;
}

/**
 * Photo capture as a first-class field (§9). Every capture is downscaled and
 * re-encoded client-side via Canvas before use (smaller payloads for all
 * callers); callers that pass `onUpload` additionally get it persisted as a
 * real Attachment.
 */
export function PhotoCaptureField({ value, onChange, label = "Add photo evidence", onUpload }: PhotoCaptureFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const createAttachment = trpc.attachment.create.useMutation();
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setIsProcessing(true);
    try {
      const { dataUrl, mimeType } = await compressImage(file);
      onChange(dataUrl);
      if (onUpload) {
        try {
          const attachment = await createAttachment.mutateAsync({
            fileName: file.name,
            mimeType,
            base64Data: dataUrlToBase64(dataUrl),
          });
          onUpload({ attachmentId: attachment.id, dataUrl });
        } catch (err) {
          console.error("Failed to upload receipt photo", err);
        }
      }
    } catch (err) {
      console.error("Failed to process photo", err);
    } finally {
      setIsProcessing(false);
    }
  }

  if (value) {
    return (
      <div className="relative w-fit">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Captured evidence" className="h-24 w-24 rounded-md border object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute -right-2 -top-2 rounded-full bg-foreground p-1 text-background"
          aria-label="Remove photo"
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Button type="button" variant="outline" size="lg" disabled={isProcessing} onClick={() => inputRef.current?.click()}>
        <Camera className="size-4" />
        {isProcessing ? "Processing…" : label}
      </Button>
    </>
  );
}
