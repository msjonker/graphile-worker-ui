import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../lib/cn';

// Lightweight JSON syntax highlighter — no heavy dependency. Returns HTML with
// token spans; input is escaped first so payloads can't inject markup.
function highlight(json) {
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'text-amber-400'; // number
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'text-sky-400' : 'text-emerald-400'; // key : string
      } else if (/true|false/.test(match)) {
        cls = 'text-violet-400';
      } else if (/null/.test(match)) {
        cls = 'text-rose-400';
      }
      return `<span class="${cls}">${match}</span>`;
    },
  );
}

export function JsonView({ value, className, maxHeight = 'max-h-[28rem]' }) {
  const [copied, setCopied] = useState(false);
  let text;
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className={cn('relative group rounded-lg border bg-surface', className)}>
      <button
        onClick={copy}
        className="absolute right-2 top-2 z-10 btn btn-outline btn-sm opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className={cn('overflow-auto p-4 text-xs leading-relaxed font-mono', maxHeight)}>
        <code dangerouslySetInnerHTML={{ __html: highlight(text) }} />
      </pre>
    </div>
  );
}
