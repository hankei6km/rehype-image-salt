export function trimBaseURL(base: string | undefined, url: string): string {
  if (base && url.startsWith(base)) {
    const t = url.substring(base.length)
    if (!t.startsWith('/')) {
      return `/${t}`
    }
    return t
  }
  return url
}
