/** Public-root-relative paths only; works with relative Vite bases and Pages subdirectories. */
export function practiceImageUrl(path: string, base = import.meta.env.BASE_URL): string | undefined {
  if (!/^images\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpg|svg)$/.test(path) || path.includes('..')) return undefined
  return `${base.replace(/\/?$/, '/')}${path}`
}
