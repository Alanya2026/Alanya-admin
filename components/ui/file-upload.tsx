"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileImage, Film, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Route d'envoi, selon ce que devient le fichier (backend : routes/upload.js).
 *  - `/upload/official` : média d'une diffusion ou de l'accueil. Rangé sous
 *    `official/`, dans le bucket public `profilemedia` : il n'expire jamais.
 *  - `/upload/avatar`   : photo de profil. Bucket public `alanyaprofile`.
 * `/upload/media` n'est pas proposé : c'est la route des médias de
 * discussion, qui expirent au bout de 30 jours.
 */
export type UploadEndpoint = "/upload/official" | "/upload/avatar";

interface FileUploadProps {
  endpoint: UploadEndpoint;
  accept?: string;
  maxSize?: number;
  onUploadComplete: (url: string, filename: string) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
}

interface UploadState {
  status: "idle" | "dragover" | "uploading" | "done" | "error";
  progress: number;
  preview: string | null;
  fileName: string | null;
  fileType: string | null;
  error: string | null;
  uploadedUrl: string | null;
}

export function FileUpload({
  endpoint,
  accept = "image/*,video/*",
  maxSize = 50 * 1024 * 1024,
  onUploadComplete,
  onUploadError,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    preview: null,
    fileName: null,
    fileType: null,
    error: null,
    uploadedUrl: null,
  });

  const reset = useCallback(() => {
    setState({
      status: "idle",
      progress: 0,
      preview: null,
      fileName: null,
      fileType: null,
      error: null,
      uploadedUrl: null,
    });
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      if (file.size > maxSize) {
        const err = `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: ${(maxSize / 1024 / 1024).toFixed(0)} MB.`;
        setState((s) => ({ ...s, status: "error", error: err }));
        onUploadError?.(err);
        return;
      }

      const preview = file.type.startsWith("image/") || file.type.startsWith("video/")
        ? URL.createObjectURL(file)
        : null;

      setState((s) => ({
        ...s,
        status: "uploading",
        progress: 0,
        preview,
        fileName: file.name,
        fileType: file.type,
        error: null,
      }));

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await api.post(endpoint, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 120_000,
          onUploadProgress: (e) => {
            if (e.total && e.loaded) {
              setState((s) => ({ ...s, progress: Math.round((e.loaded! * 100) / e.total!) }));
            }
          },
        });

        const { url, filename } = res.data;
        setState((s) => ({ ...s, status: "done", progress: 100, uploadedUrl: url }));
        onUploadComplete(url, filename || file.name);
      } catch (err: unknown) {
        const msg = err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Échec de l'upload"
          : "Échec de l'upload";
        setState((s) => ({ ...s, status: "error", error: msg }));
        onUploadError?.(msg);
      }
    },
    [endpoint, maxSize, onUploadComplete, onUploadError]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
    setState((s) => ({ ...s, status: s.status === "dragover" ? "idle" : s.status }));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setState((s) => ({ ...s, status: "dragover" }));
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setState((s) => ({ ...s, status: "idle" }));
  }

  const isImage = state.fileType?.startsWith("image/");
  const isVideo = state.fileType?.startsWith("video/");

  // Done state — show preview with remove button
  if (state.status === "done" && state.preview) {
    return (
      <div className="relative rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
            {isImage && <img src={state.preview} alt="" className="h-full w-full object-cover" />}
            {isVideo && <video src={state.preview} className="h-full w-full object-cover" muted />}
            {!isImage && !isVideo && (
              <div className="h-full w-full flex items-center justify-center">
                <FileImage className="h-6 w-6 text-zinc-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">{state.fileName}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Upload terminé</p>
          </div>
          <button
            onClick={reset}
            className="p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-700 dark:text-red-300">{state.error}</p>
          </div>
          <button
            onClick={reset}
            className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Uploading state — progress bar
  if (state.status === "uploading") {
    return (
      <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-3">
        <div className="flex items-center gap-3 mb-2">
          <Loader2 className="h-4 w-4 text-indigo-500 animate-spin shrink-0" />
          <p className="text-sm text-indigo-700 dark:text-indigo-300 truncate flex-1">{state.fileName}</p>
          <span className="text-xs text-indigo-500 tabular-nums">{state.progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
            style={{ width: `${state.progress}%` }}
          />
        </div>
      </div>
    );
  }

  // Idle / dragover — drop zone
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer ${
        disabled
          ? "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 cursor-not-allowed opacity-50"
          : state.status === "dragover"
            ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 scale-[1.01]"
            : "border-zinc-300 dark:border-zinc-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <div className="flex flex-col items-center justify-center py-6 px-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-2 transition-colors ${
          state.status === "dragover"
            ? "bg-indigo-100 dark:bg-indigo-900/50"
            : "bg-zinc-100 dark:bg-zinc-800"
        }`}>
          {isImage ? (
            <FileImage className="h-5 w-5 text-indigo-500" />
          ) : isVideo ? (
            <Film className="h-5 w-5 text-indigo-500" />
          ) : (
            <Upload className={`h-5 w-5 transition-colors ${
              state.status === "dragover" ? "text-indigo-500" : "text-zinc-400"
            }`} />
          )}
        </div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {state.status === "dragover" ? "Relâchez pour envoyer" : "Glissez un fichier ici"}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
          {state.status === "dragover" ? "" : "ou cliquez pour parcourir"}
        </p>
      </div>
    </div>
  );
}
