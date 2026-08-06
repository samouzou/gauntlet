function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

/** Turn plain-text employer descriptions into simple HTML paragraphs. */
export function plainTextToJobHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\n{2,}/)
    .map((block) => {
      const lines = escapeHtml(block).replace(/\n/g, '<br />');
      return `<p>${lines}</p>`;
    })
    .join('');
}

/** Normalize syndicated job HTML for safe, readable rendering on Outpost. */
export function sanitizeJobHtml(html: string): string {
  if (!html) return '';

  let output = html;

  // Drop dangerous / noisy tags
  output = output
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/<img[^>]*(?:track|blank\.gif|pixel|1x1)[^>]*>/gi, '')
    .replace(/<img[^>]*>/gi, '');

  // Remotive often uses div.h1 / div.h2 instead of semantic headings
  output = output
    .replace(/<div class="h1"[^>]*>([\s\S]*?)<\/div>/gi, '<h2>$1</h2>')
    .replace(/<div class="h2"[^>]*>([\s\S]*?)<\/div>/gi, '<h3>$1</h3>')
    .replace(/<div class="h3"[^>]*>([\s\S]*?)<\/div>/gi, '<h4>$1</h4>')
    .replace(/<div class="h4"[^>]*>([\s\S]*?)<\/div>/gi, '<h5>$1</h5>');

  // Strip inline presentation that breaks dark mode
  output = output
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sstyle='[^']*'/gi, '')
    .replace(/\sclass="[^"]*"/gi, '')
    .replace(/\sclass='[^']*'/gi, '');

  // Remove legacy font wrappers
  output = output
    .replace(/<\/?font[^>]*>/gi, '')
    .replace(/<span>\s*<\/span>/gi, '');

  // Flatten li > p nesting (common in syndicated feeds)
  output = output.replace(/<li>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/gi, '<li>$1</li>');

  // Collapse excessive blank paragraphs
  output = output
    .replace(/<p>\s*(?:&nbsp;|\u00a0)?\s*<\/p>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return output;
}

export function toJobDescriptionHtml(
  description: string,
  source: 'employer' | 'remotive' = 'remotive'
): string {
  const trimmed = description.trim();
  if (!trimmed) return '';

  if (source === 'employer' && !looksLikeHtml(trimmed)) {
    return plainTextToJobHtml(trimmed);
  }

  if (looksLikeHtml(trimmed)) {
    return sanitizeJobHtml(trimmed);
  }

  return plainTextToJobHtml(trimmed);
}
