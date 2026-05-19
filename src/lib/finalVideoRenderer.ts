// Final story video renderer — server-side only.
// Uses ffmpeg-static (static binary) via child_process.spawn.
// No Remotion dependency; this is a direct ffmpeg pipeline.
// Only import this from API route handlers (Node.js runtime, never Edge or client).

import { spawn } from "child_process";
import { mkdtemp, stat, unlink, rm } from "fs/promises";
import { createReadStream } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { FinalVideoAssemblyPackage } from "@/lib/finalVideoTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

export const RENDER_WIDTH = 1280;
export const RENDER_HEIGHT = 720;
export const RENDER_FPS = 30;
export const RENDER_MAX_DURATION_SECONDS = 180; // 3 minutes

// Warm cream background matching the app palette
const BG_COLOR = "0xF5E6D3";
const PAD_COLOR = "0x2D1A0A"; // dark tiki-brown for letterbox bars

// ─── Types ────────────────────────────────────────────────────────────────────

export type RendererOptions = {
  width?: number;
  height?: number;
  fps?: number;
};

export type RenderSuccess = {
  ok: true;
  outputPath: string;
  outputStream: () => ReturnType<typeof createReadStream>;
  durationSeconds: number;
  sizeBytes: number;
  warnings: string[];
};

export type RenderError = {
  ok: false;
  error: string;
  code: string;
};

export type RenderResult = RenderSuccess | RenderError;

// ─── ffmpeg path ──────────────────────────────────────────────────────────────

function getFfmpegPath(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const p = require("ffmpeg-static") as string | null;
    return p ?? null;
  } catch {
    return null;
  }
}

// ─── Argument builder ─────────────────────────────────────────────────────────

function buildFfmpegArgs(
  pkg: FinalVideoAssemblyPackage,
  outputPath: string,
  width: number,
  height: number,
  fps: number
): string[] {
  const inputArgs: string[] = [];
  const filterParts: string[] = [];
  const concatLabels: string[] = [];

  for (let i = 0; i < pkg.segments.length; i++) {
    const seg = pkg.segments[i];

    if (seg.visualMode === "animated-clip" && seg.animatedClip) {
      inputArgs.push("-i", seg.animatedClip.url);
    } else if (seg.visualMode === "story-panel" && seg.storyPanel) {
      // Loop the still image for the segment duration
      inputArgs.push(
        "-loop", "1",
        "-t", String(Math.max(1, seg.durationSeconds)),
        "-i", seg.storyPanel.url
      );
    } else {
      // text-only: warm background solid color
      inputArgs.push(
        "-f", "lavfi",
        "-t", String(Math.max(1, seg.durationSeconds)),
        "-i", `color=c=${BG_COLOR}:s=${width}x${height}:r=${fps}`
      );
    }

    // Normalize this input: scale, pad to target size, set SAR, normalize FPS
    const scaleFilter =
      `[${i}:v]` +
      `scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR},` +
      `setsar=1,fps=${fps}` +
      `[v${i}]`;
    filterParts.push(scaleFilter);
    concatLabels.push(`[v${i}]`);
  }

  // Concat all video streams in sequence
  filterParts.push(
    `${concatLabels.join("")}concat=n=${pkg.segments.length}:v=1:a=0[outv]`
  );

  // Add narration audio as the last input (so its index is correct in -map)
  const audioInputIndex = pkg.segments.length;
  if (pkg.narrationAudio?.url) {
    inputArgs.push("-i", pkg.narrationAudio.url);
  }

  // Build complete args: all inputs → filter complex → maps → encoding → output
  return [
    ...inputArgs,
    "-filter_complex", filterParts.join(";"),
    "-map", "[outv]",
    ...(pkg.narrationAudio?.url
      ? ["-map", `${audioInputIndex}:a`, "-c:a", "aac", "-b:a", "128k", "-shortest"]
      : []),
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-y",
    outputPath,
  ];
}

// ─── ffmpeg spawn wrapper ─────────────────────────────────────────────────────

function runFfmpeg(
  ffmpegPath: string,
  args: string[]
): Promise<{ exitCode: number; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    const stderrChunks: Buffer[] = [];

    proc.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    proc.on("close", (code) => {
      resolve({
        exitCode: code ?? 1,
        stderr: Buffer.concat(stderrChunks).toString("utf-8"),
      });
    });

    proc.on("error", (err) => {
      resolve({ exitCode: 1, stderr: err.message });
    });
  });
}

// ─── Main render function ─────────────────────────────────────────────────────

export async function renderFinalVideo(
  pkg: FinalVideoAssemblyPackage,
  options: RendererOptions = {}
): Promise<RenderResult> {
  const width = options.width ?? RENDER_WIDTH;
  const height = options.height ?? RENDER_HEIGHT;
  const fps = options.fps ?? RENDER_FPS;
  const warnings: string[] = [];

  // Validate environment
  const ffmpegPath = getFfmpegPath();
  if (!ffmpegPath) {
    return {
      ok: false,
      error: "ffmpeg-static is not available. Run: npm install ffmpeg-static",
      code: "ffmpeg_not_found",
    };
  }

  // Validate package
  if (pkg.segments.length === 0) {
    return { ok: false, error: "No segments to render.", code: "no_segments" };
  }

  const allTextOnly = pkg.segments.every((s) => s.visualMode === "text-only");
  if (allTextOnly) {
    return {
      ok: false,
      error: "All scenes are text-only. At least one public-ready visual (clip or panel) is required.",
      code: "no_visuals",
    };
  }

  if (pkg.estimatedDurationSeconds > RENDER_MAX_DURATION_SECONDS) {
    return {
      ok: false,
      error: `Episode is too long (${pkg.estimatedDurationSeconds}s) for rendering in this phase. Maximum is ${RENDER_MAX_DURATION_SECONDS}s. Split or shorten the episode.`,
      code: "duration_exceeded",
    };
  }

  // Collect warnings
  if (!pkg.hasNarrationAudio) {
    warnings.push("No public-ready narration audio — video rendered without audio.");
  }

  const textOnlyCount = pkg.segments.filter((s) => s.visualMode === "text-only").length;
  if (textOnlyCount > 0) {
    warnings.push(
      `${textOnlyCount} scene${textOnlyCount !== 1 ? "s" : ""} rendered as plain background (no visual available).`
    );
  }

  warnings.push(
    "Caption text overlays are not included in this first render implementation."
  );

  // Create temp output directory
  let tempDir: string;
  try {
    tempDir = await mkdtemp(join(tmpdir(), "fbw-final-"));
  } catch (err) {
    return {
      ok: false,
      error: `Failed to create temp directory: ${err instanceof Error ? err.message : "unknown"}`,
      code: "temp_dir_failed",
    };
  }

  const outputPath = join(tempDir, "final-story-video.mp4");

  // Build and run ffmpeg
  const args = buildFfmpegArgs(pkg, outputPath, width, height, fps);
  console.info(
    `[finalVideoRenderer] Rendering ${pkg.segments.length} segments (~${pkg.estimatedDurationSeconds}s) to ${outputPath}`
  );

  const { exitCode, stderr } = await runFfmpeg(ffmpegPath, args);

  if (exitCode !== 0) {
    await cleanupPath(tempDir).catch(() => null);
    const lastError = stderr.split("\n").filter(Boolean).pop() ?? "Unknown ffmpeg error";
    console.error("[finalVideoRenderer] ffmpeg failed:", lastError);
    return {
      ok: false,
      error: `Rendering failed (exit code ${exitCode}). ${lastError}`,
      code: "render_failed",
    };
  }

  // Verify output
  let fileStats: Awaited<ReturnType<typeof stat>>;
  try {
    fileStats = await stat(outputPath);
  } catch {
    await cleanupPath(tempDir).catch(() => null);
    return {
      ok: false,
      error: "Rendering appeared to succeed but output file is missing.",
      code: "output_missing",
    };
  }

  if (fileStats.size < 1024) {
    await cleanupPath(tempDir).catch(() => null);
    return {
      ok: false,
      error: `Output file is unexpectedly small (${fileStats.size} bytes). Rendering may have failed silently.`,
      code: "output_invalid",
    };
  }

  console.info(
    `[finalVideoRenderer] Render complete. Output: ${Math.round(fileStats.size / 1024 / 1024 * 10) / 10}MB`
  );

  return {
    ok: true,
    outputPath,
    outputStream: () => createReadStream(outputPath),
    durationSeconds: pkg.estimatedDurationSeconds,
    sizeBytes: fileStats.size,
    warnings,
  };
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export async function cleanupPath(pathToRemove: string): Promise<void> {
  await rm(pathToRemove, { recursive: true, force: true }).catch(() => null);
}
