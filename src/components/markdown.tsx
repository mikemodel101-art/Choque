/*
 * components/markdown.tsx — "rich-text-lite" renderer + editor toolbar.
 * Why: notes need formatting without the weight (or XSS surface) of a full
 * editor. This is a small, dependency-free Markdown subset — headings, bold,
 * italic, inline code, links, bullet/numbered lists, blockquotes — rendered
 * to React elements, never to raw HTML, so untrusted input cannot inject
 * markup. The toolbar wraps the current textarea selection.
 */
"use client";

import type { ReactNode } from "react";
import { Bold, Code, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

/* ——— Inline parsing: **bold**, *italic*, `code`, [text](url) ——— */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;

    if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) {
      out.push(
        <code key={k} className="rounded bg-foreground/[0.07] px-1.5 py-0.5 font-mono text-[0.85em]">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("[")) {
      const linkMatch = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(tok);
      if (linkMatch) {
        const href = linkMatch[2];
        const safe = /^https?:\/\//i.test(href) ? href : "#"; // no javascript: URLs
        out.push(
          <a key={k} href={safe} target="_blank" rel="noopener noreferrer"
             className="text-accent underline underline-offset-2">
            {linkMatch[1]}
          </a>,
        );
      }
    } else out.push(<em key={k}>{tok.slice(1, -1)}</em>);

    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={`l-${blocks.length}`} className={cn("my-2 space-y-1 pl-5", list.ordered ? "list-decimal" : "list-disc")}>
        {list.items.map((item, i) => <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`)}</li>)}
      </Tag>,
    );
    list = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);

    if (bullet) {
      if (!list || list.ordered) { flush(); list = { ordered: false, items: [] }; }
      list.items.push(bullet[1]);
      return;
    }
    if (numbered) {
      if (!list || !list.ordered) { flush(); list = { ordered: true, items: [] }; }
      list.items.push(numbered[1]);
      return;
    }
    flush();

    if (!line.trim()) return;
    if (heading) {
      const level = heading[1].length;
      const size = level === 1 ? "text-lg" : level === 2 ? "text-base" : "text-sm";
      blocks.push(
        <p key={idx} className={cn("mt-3 font-semibold tracking-tight", size)}>
          {renderInline(heading[2], `h-${idx}`)}
        </p>,
      );
      return;
    }
    if (quote) {
      blocks.push(
        <blockquote key={idx} className="my-2 border-l-2 border-accent/50 pl-3 italic text-muted">
          {renderInline(quote[1], `q-${idx}`)}
        </blockquote>,
      );
      return;
    }
    blocks.push(<p key={idx} className="my-1.5">{renderInline(line, `p-${idx}`)}</p>);
  });
  flush();

  return <div className={cn("text-sm leading-relaxed measure", className)}>{blocks}</div>;
}

/* ——— Toolbar that wraps the current selection in the given textarea ——— */
interface Tool {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  wrap?: [string, string];
  prefix?: string;
}

const TOOLS: Tool[] = [
  { icon: Bold, label: "Bold", wrap: ["**", "**"] },
  { icon: Italic, label: "Italic", wrap: ["*", "*"] },
  { icon: Code, label: "Code", wrap: ["`", "`"] },
  { icon: Link2, label: "Link", wrap: ["[", "](https://)"] },
  { icon: List, label: "Bullet list", prefix: "- " },
  { icon: ListOrdered, label: "Numbered list", prefix: "1. " },
  { icon: Quote, label: "Quote", prefix: "> " },
];

export function MarkdownToolbar({
  textareaRef,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (next: string) => void;
}) {
  function apply(tool: Tool) {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e);
    let next: string;
    let caret: number;

    if (tool.wrap) {
      next = value.slice(0, s) + tool.wrap[0] + (selected || "text") + tool.wrap[1] + value.slice(e);
      caret = s + tool.wrap[0].length + (selected || "text").length + tool.wrap[1].length;
    } else {
      const prefix = tool.prefix ?? "";
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
      caret = e + prefix.length;
    }
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="flex flex-wrap gap-0.5 rounded-t-sm border border-b-0 border-border bg-background/60 p-1">
      {TOOLS.map((tool) => (
        <button
          key={tool.label}
          type="button"
          onClick={() => apply(tool)}
          aria-label={tool.label}
          title={tool.label}
          className="inline-flex size-8 items-center justify-center rounded-sm text-muted transition-colors hover:bg-foreground/[0.07] hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
        >
          <tool.icon className="size-4" />
        </button>
      ))}
      <span className="ml-auto self-center pr-1.5 text-[10px] uppercase tracking-wider text-muted">
        Markdown
      </span>
    </div>
  );
}
