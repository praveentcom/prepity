/**
 * Check if a URL is external (different host)
 * @param url - The URL to check
 * @param currentHost - The current hostname (optional, defaults to empty string)
 * @returns True if the URL is external, false otherwise
 */
function isExternalUrl(url: string, currentHost: string = ''): boolean {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  try {
    const urlObj = new URL(url);
    const urlHost = urlObj.hostname.toLowerCase();

    if (!currentHost) {
      return true;
    }

    const currentHostLower = currentHost.toLowerCase();
    const normalizeHost = (host: string) => host.replace(/^www\./, '');
    return normalizeHost(urlHost) !== normalizeHost(currentHostLower);
  } catch {
    return false;
  }
}

/**
 * Process inline markdown formatting (bold, italic, code, strikethrough, links, etc.)
 * @param content - The content to process
 * @param currentHost - The current hostname
 * @returns The processed HTML string
 */
export function processInlineMarkdown(
  content: string,
  currentHost: string = ''
): string {
  /**
   * Sequence: Protect escaped characters
   */
  const escapeMap = new Map<string, string>();
  let escapeCounter = 0;

  let processed = content.replace(
    /\\([\\`*_{}[\]()#+\-.!~|])/g,
    (_match: string, char: string) => {
      const placeholder = `{{ESCAPED${escapeCounter}}}`;
      escapeMap.set(placeholder, char);
      escapeCounter++;
      return placeholder;
    }
  );

  /**
   * Process inline code first and protect it
   */
  const codeSpans: string[] = [];
  let codeSpanCounter = 0;

  processed = processed.replace(
    /`([^`]+)`/g,
    (_match: string, codeContent: string) => {
      const placeholder = `{{CODESPAN${codeSpanCounter}}}`;
      codeSpans.push(
        `<code class="bg-border/50 px-1 py-0.5 rounded border border-border text-xs font-mono">${codeContent}</code>`
      );
      codeSpanCounter++;
      return placeholder;
    }
  );

  /**
   * Process bold, italic, strikethrough, links, etc.
   */
  processed = processed
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-medium">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/_(.+?)_/g, '<em class="italic">$1</em>')
    .replace(/~~(.*?)~~/g, '<del class="line-through opacity-75">$1</del>')
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="rounded-md max-w-full h-auto my-1 border border-border inline-block" />'
    )
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      const isExternal = isExternalUrl(url, currentHost);
      const targetAttr = isExternal
        ? ' target="_blank" rel="noopener noreferrer"'
        : '';
      return `<a href="${url}"${targetAttr} class="text-primary hover:underline font-medium inline-flex items-center gap-1">${text}</a>`;
    })
    .replace(
      /\[\[([^\]]+)\]\]/g,
      '<kbd class="px-1 py-0.5 text-xs font-mono bg-border/50 border border-border rounded">$1</kbd>'
    );

  /**
   * Restore code spans
   */
  codeSpans.forEach((codeSpan: string, index: number) => {
    processed = processed.replace(
      new RegExp(`{{CODESPAN${index}}}`, 'g'),
      codeSpan
    );
  });

  /**
   * Restore escaped characters
   */
  escapeMap.forEach((char: string, placeholder: string) => {
    processed = processed.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      char
    );
  });

  return processed;
}
