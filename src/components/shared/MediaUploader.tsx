import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MediaUploaderProps {
  onUpload?: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
  /** Compact mode for inline composers (feed, cases). */
  compact?: boolean;
}

/**
 * File picker + voice recorder with working drag & drop.
 * - Object URLs are created once per file and revoked on removal/unmount.
 * - Mic tracks are always released (no lingering browser recording indicator).
 * - Recordings use the browser's actual MIME type, never mislabeled.
 */
export function MediaUploader({ onUpload, maxFiles = 5, accept = "image/*,video/*,audio/*", compact = false }: MediaUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const micStream = useRef<MediaStream | null>(null);
  const objectUrls = useRef<string[]>([]);

  // Revoke every object URL when the component unmounts.
  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      micStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const commitFiles = (incoming: File[]) => {
    const room = Math.max(0, maxFiles - files.length);
    const accepted = incoming.slice(0, room);
    const dropped = incoming.length - accepted.length;
    if (dropped > 0 && compact) {
      // Surface overflow instead of silently discarding files.
      setMicError(`Only ${maxFiles} file${maxFiles === 1 ? "" : "s"} allowed — ${dropped} not added.`);
    }
    if (accepted.length === 0) return;
    const newUrls = accepted.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
    objectUrls.current.push(...newUrls.filter(Boolean));
    setFiles((prev) => [...prev, ...accepted].slice(0, maxFiles));
    setPreviews((prev) => [...prev, ...newUrls].slice(0, maxFiles));
    onUpload?.([...files, ...accepted].slice(0, maxFiles));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      commitFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const removeFile = (idx: number) => {
    const url = previews[idx];
    if (url) {
      URL.revokeObjectURL(url);
      objectUrls.current = objectUrls.current.filter((u) => u !== url);
    }
    const newFiles = files.filter((_, i) => i !== idx);
    setFiles(newFiles);
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
    onUpload?.(newFiles);
  };

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : undefined;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const ext = type.includes("webm") ? "webm" : type.includes("ogg") ? "ogg" : "m4a";
        const audioFile = new File([new Blob(audioChunks.current, { type })], `recording-${Date.now()}.${ext}`, { type });
        setFiles((prev) => {
          const next = [...prev, audioFile].slice(0, maxFiles);
          onUpload?.(next);
          return next;
        });
        setPreviews((prev) => [...prev, ""].slice(0, maxFiles));
        // Always release the mic — the browser indicator must go away.
        micStream.current?.getTracks().forEach((track) => track.stop());
        micStream.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setMicError("Microphone permission denied — check your browser settings.");
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file, i) => (
              <div key={`${file.name}-${i}`} className="relative h-16 w-16 overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container">
                {previews[i] ? (
                  <img src={previews[i]} alt={file.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">
                      {file.type.startsWith("audio/") ? "graphic_eq" : file.type.startsWith("video/") ? "movie" : "description"}
                    </span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${file.name}`}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white transition-colors hover:bg-black"
                >
                  <span className="material-symbols-outlined text-[12px]" aria-hidden="true">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <label
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-outline-variant/60 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5",
              dragOver && "border-primary bg-primary/5",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              commitFiles(Array.from(e.dataTransfer.files));
            }}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">attach_file</span>
            {files.length > 0 ? "Add more" : "Attach photo"}
            <input type="file" multiple accept={accept} onChange={handleFileChange} className="sr-only" />
          </label>
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              isRecording ? "bg-error/10 text-error" : "border border-outline-variant/60 text-primary hover:bg-primary/5",
            )}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{isRecording ? "stop_circle" : "mic"}</span>
            {isRecording ? "Stop" : "Voice"}
          </button>
          {isRecording && <span className="text-xs font-semibold text-error">Recording…</span>}
        </div>
        {micError && <p className="text-xs text-error">{micError}</p>}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload media: drag and drop or choose files"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          commitFiles(Array.from(e.dataTransfer.files));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") document.getElementById("media-choose-files")?.click();
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-8 text-center transition-all focus-visible:outline-2 focus-visible:outline-primary",
          dragOver ? "border-primary bg-primary/5" : "border-outline-variant bg-surface-container-low hover:border-primary/50",
        )}
      >
        <span className="material-symbols-outlined mx-auto mb-3 block text-[36px] text-primary" aria-hidden="true">upload</span>
        <h4 className="mb-1 font-display text-base font-bold text-primary">Upload media</h4>
        <p className="mb-6 text-sm text-on-surface-variant">Drag &amp; drop images, audio, or video — or choose files</p>

        <div className="flex flex-wrap justify-center gap-4">
          <label
            id="media-choose-files"
            className="relative inline-flex cursor-pointer items-center rounded-xl border border-outline bg-surface-container-low px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:bg-surface-container"
          >
            Choose Files
            <input type="file" multiple accept={accept} onChange={handleFileChange} className="sr-only" />
          </label>

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors",
              isRecording
                ? "bg-error text-on-error"
                : "border border-outline bg-surface-container-low text-primary hover:bg-surface-container",
            )}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{isRecording ? "stop_circle" : "mic"}</span>
            {isRecording ? "Stop Recording" : "Record Voice"}
          </button>
        </div>
        {isRecording && <p className="mt-3 text-xs font-semibold text-error">Recording… speak now</p>}
        {micError && <p className="mt-3 text-xs text-error">{micError}</p>}
      </div>

      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="group relative aspect-square overflow-hidden rounded-xl border border-outline-variant/60 bg-surface">
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label={`Remove ${file.name}`}
                className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
              </button>

              {previews[i] ? (
                <img src={previews[i]} alt={file.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-4">
                  <span className="material-symbols-outlined text-[28px] text-primary" aria-hidden="true">
                    {file.type.startsWith("video/") ? "movie" : file.type.startsWith("audio/") ? "graphic_eq" : "description"}
                  </span>
                  <span className="mt-2 w-full truncate text-center text-xs text-on-surface-variant">{file.name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
