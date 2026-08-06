"use client";

import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoCaptureFieldProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
}

/**
 * Photo capture as a first-class field (§9), not an attachment afterthought.
 * Stub for this phase: previews locally, does not upload — the backend has
 * no file storage yet (see plan's explicit non-goal for this session).
 */
export function PhotoCaptureField({ value, onChange, label = "Add photo evidence" }: PhotoCaptureFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
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
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button type="button" variant="outline" size="lg" onClick={() => inputRef.current?.click()}>
        <Camera className="size-4" />
        {label}
      </Button>
    </>
  );
}
