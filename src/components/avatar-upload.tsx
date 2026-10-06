/*
 * components/avatar-upload.tsx — avatar picker with client-side crop+compress.
 * Why: spec 5.3 asks for avatar upload with client-side crop/compress before
 * it ever reaches storage. We centre-crop to a square, downscale to 256px and
 * re-encode as JPEG at 0.82 quality on a canvas — typically <40 kB — then hand
 * back a data URL. In the Supabase build this same blob is what gets PUT to
 * Storage, so the pipeline is unchanged.
 */
"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const MAX_DIM = 256;
const QUALITY = 0.82;

async function cropAndCompress(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = MAX_DIM;
  canvas.height = MAX_DIM;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, MAX_DIM, MAX_DIM);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", QUALITY);
}

export function AvatarUpload({
  name,
  value,
  onChange,
}: {
  name: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("That image is over 12 MB — pick a smaller one");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await cropAndCompress(file);
      onChange(dataUrl);
      toast.success("Avatar updated", { description: "Cropped and compressed in your browser." });
    } catch {
      toast.error("Couldn't process that image");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <span className="relative">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL, not a remote asset
          <img src={value} alt="Your avatar" className="size-20 rounded-full object-cover shadow-1" width={80} height={80} />
        ) : (
          <Avatar name={name || "You"} size="xl" />
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40">
            <Loader2 className="size-5 animate-spin text-white" />
          </span>
        )}
      </span>

      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          id="avatar-input"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} loading={busy}>
            <Camera className="size-4" /> {value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
              <Trash2 className="size-4" /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">Square crop, resized to 256px and compressed before upload.</p>
      </div>
    </div>
  );
}
