import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as tus from "tus-js-client";

export type UploadStatus = "idle" | "requesting" | "uploading" | "processing" | "ready" | "error";

interface UseCloudflareUploadOptions {
  onComplete?: (videoUid: string, videoId: string | null) => void;
  onError?: (error: string) => void;
}

interface UploadState {
  status: UploadStatus;
  progress: number; // 0-100
  videoUid: string | null;
  videoId: string | null;
  error: string | null;
  processingStatus: string | null;
}

export function useCloudflareUpload(options?: UseCloudflareUploadOptions) {
  const [state, setState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    videoUid: null,
    videoId: null,
    error: null,
    processingStatus: null,
  });

  const upload = useCallback(
    async (file: File, title: string, accessLevel = "members") => {
      setState({
        status: "requesting",
        progress: 0,
        videoUid: null,
        videoId: null,
        error: null,
        processingStatus: null,
      });

      try {
        // 1. Request upload URL from our edge function
        const { data, error: fnError } = await supabase.functions.invoke(
          "create-stream-upload",
          {
            body: { title, accessLevel },
          }
        );

        if (fnError || !data?.uploadUrl) {
          const errorMsg = data?.error || fnError?.message || "Erro ao criar upload";
          setState((s) => ({ ...s, status: "error", error: errorMsg }));
          options?.onError?.(errorMsg);
          return;
        }

        const { uploadUrl, videoUid, videoId } = data;

        setState((s) => ({
          ...s,
          status: "uploading",
          videoUid,
          videoId,
        }));

        // 2. Upload file directly to Cloudflare via TUS
        await new Promise<void>((resolve, reject) => {
          const tusUpload = new tus.Upload(file, {
            endpoint: uploadUrl,
            uploadUrl: uploadUrl,
            chunkSize: 50 * 1024 * 1024, // 50MB chunks
            retryDelays: [0, 1000, 3000, 5000],
            metadata: {
              filename: file.name,
              filetype: file.type,
            },
            onError: (err) => {
              reject(err);
            },
            onProgress: (bytesUploaded, bytesTotal) => {
              const pct = Math.round((bytesUploaded / bytesTotal) * 100);
              setState((s) => ({ ...s, progress: pct }));
            },
            onSuccess: () => {
              resolve();
            },
          });

          tusUpload.start();
        });

        // 3. Poll for processing status
        setState((s) => ({ ...s, status: "processing", progress: 100 }));

        let attempts = 0;
        const maxAttempts = 120; // 10 min max polling

        const poll = async () => {
          if (attempts >= maxAttempts) {
            setState((s) => ({
              ...s,
              status: "ready",
              processingStatus: "timeout - verifique depois",
            }));
            options?.onComplete?.(videoUid, videoId);
            return;
          }

          const { data: statusData } = await supabase.functions.invoke(
            "cloudflare-video-status",
            { body: { videoUid } }
          );

          if (statusData?.status === "ready") {
            setState((s) => ({
              ...s,
              status: "ready",
              processingStatus: "ready",
            }));
            options?.onComplete?.(videoUid, videoId);
            return;
          }

          setState((s) => ({
            ...s,
            processingStatus: statusData?.pctComplete
              ? `${statusData.pctComplete}%`
              : statusData?.status || "processando...",
          }));

          attempts++;
          setTimeout(poll, 5000);
        };

        poll();
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Erro no upload";
        setState((s) => ({ ...s, status: "error", error: errorMsg }));
        options?.onError?.(errorMsg);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setState({
      status: "idle",
      progress: 0,
      videoUid: null,
      videoId: null,
      error: null,
      processingStatus: null,
    });
  }, []);

  return { ...state, upload, reset };
}
