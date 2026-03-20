'use client';

import { useMemo, useEffect, useRef } from 'react';
import { md } from '@/lib/markdown';
import { useThrottle } from '@/hooks/useThrottle';

interface Props {
  content: string;
  isStreaming: boolean;
}

export function MessageContent({ content, isStreaming }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 流式过程中 throttle 到 50ms 一次渲染
  const throttledContent = useThrottle(content, isStreaming ? 50 : 0);
  const html = useMemo(() => md.render(throttledContent), [throttledContent]);

  // 代码块复制按钮
  useEffect(() => {
    if (isStreaming) return;
    const pres = containerRef.current?.querySelectorAll('pre');
    pres?.forEach((pre) => {
      if (pre.querySelector('.copy-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = '复制';
      btn.onclick = () => {
        navigator.clipboard.writeText(pre.textContent || '');
        btn.textContent = '已复制';
        setTimeout(() => (btn.textContent = '复制'), 2000);
      };
      pre.style.position = 'relative';
      pre.appendChild(btn);
    });
  }, [html, isStreaming]);

  return (
    <div
      ref={containerRef}
      className="message-content prose prose-sm dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
