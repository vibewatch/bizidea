// HTML-safe citation linkifier for use with `set:html`.
// Converts `[N]` tokens into `<a class="bz-cite" href="#cite-N">[N]</a>`.

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPE[c]!);

export function linkifyCitations(text: string | null | undefined): string {
  if (!text) return '';
  return escapeHtml(String(text)).replace(
    /\[(\d+)\]/g,
    (_m, n) => `<a class="bz-cite" href="#cite-${n}" aria-label="Citation ${n}">[${n}]</a>`,
  );
}
