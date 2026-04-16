import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const md = new MarkdownIt({
  html: false,       // 禁止原始 HTML（安全）
  linkify: true,     // 自动识别 URL
  breaks: true,      // 换行符转 <br>
  highlight: (str, lang) => {
    // 拦截 mermaid 并将其包装为 mermaid class 的 div，以便客户端统一渲染
    if (lang === 'mermaid') {
      return `<div class="mermaid">${escapeHtml(str)}</div>`;
    }

    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch {
        // fallthrough
      }
    }
    return `<pre class="hljs"><code>${escapeHtml(str)}</code></pre>`;
  },
});
