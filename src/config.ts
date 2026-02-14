function parseEnvUrlList(rawValue: string | undefined): string[] {
  if (!rawValue?.trim()) return [];

  const trimmed = rawValue.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => String(value).trim())
          .filter((value) => value.length > 0);
      }
    } catch {
      // Fall back to delimiter parsing if JSON parsing fails.
    }
  }

  return trimmed
    .split(/[\n,]+/)
    .map((value) => value.trim().replace(/^["']|["']$/g, ""))
    .filter((value) => value.length > 0);
}

// Optional runtime injection via Vite env vars.
// Supports either:
// - comma/newline separated list
// - JSON array string
const runtimeEnv = (
  import.meta as ImportMeta & { env?: Record<string, string | undefined> }
).env;
const envPhotoPaths = parseEnvUrlList(runtimeEnv?.VITE_PHOTO_URLS);
const envWorldPaths = parseEnvUrlList(runtimeEnv?.VITE_WORLD_URLS);

if (envPhotoPaths.length === 0 || envWorldPaths.length === 0) {
  console.warn(
    "Cloudinary URL lists are missing. Set VITE_PHOTO_URLS and VITE_WORLD_URLS in your env."
  );
}

export const PHOTO_PATHS = envPhotoPaths;
export const WORLD_PATHS = envWorldPaths;

export const PHOTO_ROLL_COUNT = PHOTO_PATHS.length;

// Shared secret used as input when deriving any route/access token.
export const TOKEN_DERIVATION_SECRET = "replace-me-before-production";

// Hard-coded desktop gate code.
export const GATE_ACCESS_CODE = "1234";
