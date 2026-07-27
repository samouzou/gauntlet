/** Strip inline colors/backgrounds from syndicated job HTML so dark theme stays readable. */
export function sanitizeJobHtml(html: string): string {
  if (!html) return '';

  return html
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sstyle='[^']*'/gi, '')
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/<span[^>]*>\s*<\/span>/gi, '');
}
