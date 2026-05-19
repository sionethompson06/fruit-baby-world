export type MediaType = "panel" | "audio" | "video";
export type ApproveSaveStep = "upload" | "attach";

export function buildApproveSaveButtonLabel(mediaType: MediaType): string {
  if (mediaType === "panel") return "Approve & Save Panel to Episode";
  if (mediaType === "audio") return "Approve & Save Audio to Episode";
  return "Approve & Save Video Clip to Episode";
}

export function getApproveSaveHelperText(): string {
  return "This will save the approved draft to media storage and attach it to this episode. It will not make it public yet.";
}

export function getManualControlsLabel(): string {
  return "Manual Controls";
}

export function normalizeApproveSaveError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong.";
}

export function getApproveSaveStepLabel(step: ApproveSaveStep): string {
  return step === "upload" ? "Media upload failed" : "Attach to episode failed";
}
