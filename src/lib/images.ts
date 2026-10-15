export function safeImageUrl(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url.includes("%") ? url : url.replace(/ /g, "%20"));
    parsed.pathname = parsed.pathname
      .split("/")
      .map((seg) => {
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join("/");
    return parsed.toString();
  } catch {
    return url.replace(/ /g, "%20");
  }
}
