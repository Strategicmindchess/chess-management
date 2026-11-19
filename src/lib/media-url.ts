const BUCKET_NAME = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || "convenient-briefcase-lioy-2";

/**
 * Converts any S3/Tigris public or stored URL into a stable local `/api/media/...` URL
 * that bypasses Tigris private-bucket 403 blocks and serves with long-term caching.
 * Safe to import in both Client and Server Components.
 */
export function getMediaUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;
  if (publicUrl.startsWith("/api/media/")) return publicUrl;

  const bucketMarker = `/${BUCKET_NAME}/`;
  let key: string | null = null;

  if (publicUrl.includes(bucketMarker)) {
    key = publicUrl.substring(publicUrl.indexOf(bucketMarker) + bucketMarker.length);
  } else if (publicUrl.includes("/profile-pictures/")) {
    key = publicUrl.substring(publicUrl.indexOf("profile-pictures/"));
  } else if (publicUrl.includes("/thumbnails/")) {
    key = publicUrl.substring(publicUrl.indexOf("thumbnails/"));
  } else if (publicUrl.includes("/videos/")) {
    key = publicUrl.substring(publicUrl.indexOf("videos/"));
  } else if (
    publicUrl.startsWith("profile-pictures/") ||
    publicUrl.startsWith("thumbnails/") ||
    publicUrl.startsWith("videos/")
  ) {
    key = publicUrl;
  } else {
    const base =
      process.env.S3_PUBLIC_BASE_URL ||
      `${(process.env.S3_ENDPOINT_URL || "https://t3.storageapi.dev").replace(/\/$/, "")}/${BUCKET_NAME}`;
    const prefix = `${base.replace(/\/$/, "")}/`;
    if (publicUrl.startsWith(prefix)) {
      key = publicUrl.substring(prefix.length);
    }
  }

  if (key) {
    key = key.split("?")[0].split("#")[0];
    return `/api/media/${encodeURI(key)}`;
  }

  return publicUrl;
}
