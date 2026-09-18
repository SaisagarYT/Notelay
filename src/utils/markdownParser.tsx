import React from 'react';
import { Icon } from '@iconify/react';

/**
 * Tokenizes and parses inline markdown syntax with priority:
 * 1. Bold + Italic: ***text*** or ___text___
 * 2. Bold: **text** or __text__
 * 3. Italic: *text* or _text_
 * 4. Inline Code: `code`
 * 5. Strikethrough: ~~text~~
 * 6. Inline Math: $math$
 */
export function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const regex = /(\*\*\*[\s\S]+?\*\*\*|___[\s\S]+?___|\*\*[\s\S]+?\*\*|__[\s\S]+?__|==[^=]+?==|(?<!\*)\*(?!\*)[\s\S]+?(?<!\*)\*(?!\*)|(?<!_)_(?!_)[\s\S]+?(?<!_)_(?!_)|`[\s\S]+?`|~~[\s\S]+?~~|\$[^$]+?\$)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // 1. Bold + Italic: ***text*** or ___text___
    if (
      (part.startsWith('***') && part.endsWith('***') && part.length >= 6) ||
      (part.startsWith('___') && part.endsWith('___') && part.length >= 6)
    ) {
      const inner = part.slice(3, -3);
      return (
        <strong key={index} className="font-bold italic text-[#0f172a]">
          {inner}
        </strong>
      );
    }

    // 2. Bold: **text** or __text__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className="font-bold text-[#0f172a]">
          {inner}
        </strong>
      );
    }

    // 3. Italic: *text* or _text_
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic text-[#334155]">
          {inner}
        </em>
      );
    }

    // 4. Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#1e293b] font-mono text-[0.88em] border border-[#e2e8f0]"
        >
          {inner}
        </code>
      );
    }

    // 5. Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <del key={index} className="line-through text-[#94a3b8]">
          {inner}
        </del>
      );
    }

    // 6. Math: $math$
    if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <span key={index} className="font-serif italic text-[#1e3a8a] px-0.5">
          {inner}
        </span>
      );
    }

    // 7. Fluorescent Highlighter: ==text== or ==color:text==
    if (part.startsWith('==') && part.endsWith('==') && part.length >= 4) {
      const inner = part.slice(2, -2);
      const colorMatch = inner.match(/^(yellow|green|pink|blue):(.*)$/);
      const color = colorMatch ? colorMatch[1] : 'yellow';
      const textVal = colorMatch ? colorMatch[2] : inner;
      const bgClass =
        color === 'green'
          ? 'bg-emerald-200/80 dark:bg-emerald-900/50 text-emerald-950 dark:text-emerald-100'
          : color === 'pink'
          ? 'bg-pink-200/80 dark:bg-pink-900/50 text-pink-950 dark:text-pink-100'
          : color === 'blue'
          ? 'bg-sky-200/80 dark:bg-sky-900/50 text-sky-950 dark:text-sky-100'
          : 'bg-yellow-200/80 dark:bg-yellow-900/50 text-yellow-950 dark:text-yellow-100';

      return (
        <mark key={index} className={`${bgClass} rounded-sm px-1 py-0.5 font-medium select-text`}>
          {textVal}
        </mark>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

/**
 * Parses markdown tables into clean HTML tables.
 */
export function renderMarkdownTable(tableLines: string[], keyPrefix: string = 'tbl'): React.ReactNode {
  if (tableLines.length < 2) return null;

  const cleanLines = tableLines.filter((l) => l.trim().startsWith('|'));
  if (cleanLines.length === 0) return null;

  const headerLine = cleanLines[0];
  const separatorLine = cleanLines[1];
  const bodyLines = cleanLines.slice(2);

  const parseRow = (line: string) =>
    line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());

  const headers = parseRow(headerLine);
  const isSeparator = separatorLine && /^[|:\-\s]+$/.test(separatorLine);
  const rows = (isSeparator ? bodyLines : cleanLines.slice(1)).map(parseRow);

  return (
    <div key={keyPrefix} className="my-4 overflow-x-auto rounded-xl border border-[#cbd5e1] bg-white shadow-2xs">
      <table className="w-full text-left text-[14px] border-collapse">
        <thead>
          <tr className="bg-[#f8fafc] border-b border-[#cbd5e1]">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 font-semibold text-[#0f172a] border-r border-[#e2e8f0] last:border-r-0">
                {parseInlineMarkdown(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]/50 transition-colors"
            >
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className="px-4 py-2.5 text-[#334155] border-r border-[#f1f5f9] last:border-r-0 leading-relaxed"
                >
                  {parseInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface RenderMarkdownOptions {
  isNotebook?: boolean;
  keyPrefix?: string;
  onRenderMermaid?: (code: string, idx: number) => React.ReactNode;
}

/**
 * Parses markdown text blocks into structured React elements with full support for:
 * - Mermaid diagrams & code blocks
 * - Tables
 * - Headings
 * - Blockquotes / Callout boxes
 * - Ordered & Unordered lists
 * - Paragraphs with inline bold/italic/code parsing
 */
export function renderMarkdownBlocks(
  content: string,
  options: RenderMarkdownOptions = {}
): React.ReactNode {
  const { isNotebook = false, keyPrefix = 'block', onRenderMermaid } = options;

  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={isNotebook ? 'notebook-body space-y-0 min-w-0 max-w-full overflow-hidden break-words' : 'space-y-3 min-w-0 max-w-full overflow-hidden break-words'}>
      {parts.map((part, pIdx) => {
        // Handle code blocks
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineEnd = part.indexOf('\n');
          const lang = part.slice(3, firstLineEnd).trim().toLowerCase() || 'text';
          const code = part.slice(firstLineEnd + 1, -3).trim();

          if (lang === 'mermaid' && onRenderMermaid) {
            return (
              <div key={`${keyPrefix}-code-${pIdx}`} className={isNotebook ? 'my-8' : 'my-4'}>
                {onRenderMermaid(code, pIdx)}
              </div>
            );
          }

          return (
            <div
              key={`${keyPrefix}-code-${pIdx}`}
              className={`rounded-xl border border-[#cbd5e1] overflow-hidden bg-[#1e1e1e] text-[#f1f5f9] font-mono text-[13px] ${
                isNotebook ? 'my-6 shadow-md' : 'my-4 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between px-4 py-1.5 bg-[#2d2d2d] border-b border-[#3e3e3e] text-[12px] text-[#94a3b8]">
                <span>{lang}</span>
              </div>
              <pre className="p-4 overflow-x-auto select-text font-mono text-[13px] leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Process text chunk lines
        const lines = part.split('\n');
        const elements: React.ReactNode[] = [];
        let i = 0;

        while (i < lines.length) {
          const rawLine = lines[i];
          const trimmed = rawLine.trim();

          // Empty line
          if (trimmed === '') {
            if (isNotebook) {
              elements.push(<div key={`${keyPrefix}-empty-${i}`} className="h-[36px]" />);
            }
            i++;
            continue;
          }

          // Table detection: collect all consecutive lines starting with '|'
          if (trimmed.startsWith('|')) {
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
              tableLines.push(lines[i].trim());
              i++;
            }
            elements.push(renderMarkdownTable(tableLines, `${keyPrefix}-tbl-${i}`));
            continue;
          }

          // Blockquote / Callout box: collect consecutive lines starting with '>'
          if (trimmed.startsWith('>')) {
            const quoteLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('>')) {
              quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
              i++;
            }
            const quoteText = quoteLines.join(' ');
            if (isNotebook) {
              elements.push(
                <div
                  key={`${keyPrefix}-callout-${i}`}
                  className="notebook-callout font-medium text-[#1e293b]"
                >
                  <div className="flex items-start gap-2">
                    <Icon icon="solar:pin-bold" className="w-4 h-4 text-amber-600 shrink-0 mt-1" />
                    <div className="flex-1">{parseInlineMarkdown(quoteText)}</div>
                  </div>
                </div>
              );
            } else {
              elements.push(
                <div
                  key={`${keyPrefix}-quote-${i}`}
                  className="p-3.5 my-2.5 rounded-xl text-[13.5px] leading-relaxed border border-[#dadce0] bg-[#f8fafc] text-[#334155] border-l-4 border-l-[#1a73e8]"
                >
                  {parseInlineMarkdown(quoteText)}
                </div>
              );
            }
            continue;
          }

          // Headings
          if (trimmed.startsWith('#### ')) {
            const headingText = trimmed.slice(5);
            elements.push(
              <h4
                key={`${keyPrefix}-h4-${i}`}
                className={
                  isNotebook
                    ? 'font-bold text-[20px] text-[#0f172a] pt-1'
                    : 'font-semibold text-[14px] text-[#1e293b] pt-2'
                }
              >
                {parseInlineMarkdown(headingText)}
              </h4>
            );
            i++;
            continue;
          }

          if (trimmed.startsWith('### ')) {
            const headingText = trimmed.slice(4);
            elements.push(
              <h3
                key={`${keyPrefix}-h3-${i}`}
                className={
                  isNotebook
                    ? 'font-bold text-[22px] text-[#0f172a] border-b border-[#cbd5e1]/40 pb-1'
                    : 'font-semibold text-[15px] text-[#0f172a] pt-3 pb-1 border-b border-slate-100'
                }
              >
                {parseInlineMarkdown(headingText)}
              </h3>
            );
            i++;
            continue;
          }

          if (trimmed.startsWith('## ')) {
            const headingText = trimmed.slice(3);
            elements.push(
              <h2
                key={`${keyPrefix}-h2-${i}`}
                className={
                  isNotebook
                    ? 'font-bold text-[25px] text-[#0f172a] border-b-2 border-[#cbd5e1]/60'
                    : 'font-bold text-[17px] text-[#0f172a] pt-4 pb-1.5 border-b border-slate-200'
                }
              >
                {parseInlineMarkdown(headingText)}
              </h2>
            );
            i++;
            continue;
          }

          if (trimmed.startsWith('# ')) {
            const headingText = trimmed.slice(2);
            elements.push(
              <h1
                key={`${keyPrefix}-h1-${i}`}
                className={
                  isNotebook
                    ? 'font-extrabold text-[28px] text-[#0f172a]'
                    : 'font-bold text-[20px] text-[#0f172a] pb-2 border-b border-slate-200'
                }
              >
                {parseInlineMarkdown(headingText)}
              </h1>
            );
            i++;
            continue;
          }

          // Bullet lists: -, *, •
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
            const bulletText = trimmed.slice(2);
            elements.push(
              <div
                key={`${keyPrefix}-bullet-${i}`}
                className={
                  isNotebook
                    ? 'flex items-start gap-2.5 pl-2 leading-[36px] my-0'
                    : 'flex items-start gap-2 pl-2 text-[13.5px] leading-relaxed'
                }
              >
                <span className="text-[#1a73e8] font-bold select-none">•</span>
                <div className="flex-1">{parseInlineMarkdown(bulletText)}</div>
              </div>
            );
            i++;
            continue;
          }

          // Numbered lists: 1. 2.
          if (/^\d+\.\s/.test(trimmed)) {
            const dotIdx = trimmed.indexOf('.');
            const num = trimmed.slice(0, dotIdx);
            const numText = trimmed.slice(dotIdx + 1).trim();
            elements.push(
              <div
                key={`${keyPrefix}-num-${i}`}
                className={
                  isNotebook
                    ? 'flex items-start gap-2.5 pl-2 leading-[36px] my-0'
                    : 'flex items-start gap-2 pl-2 text-[13.5px] leading-relaxed'
                }
              >
                <span className="font-bold text-[#475569] select-none">{num}.</span>
                <div className="flex-1">{parseInlineMarkdown(numText)}</div>
              </div>
            );
            i++;
            continue;
          }

          // Regular paragraph line
          elements.push(
            <p
              key={`${keyPrefix}-p-${i}`}
              className={
                isNotebook
                  ? 'leading-[36px] my-0 select-text'
                  : 'text-slate-700 text-[13.5px] leading-relaxed select-text'
              }
            >
              {parseInlineMarkdown(trimmed)}
            </p>
          );
          i++;
        }

        return <div key={`${keyPrefix}-chunk-${pIdx}`}>{elements}</div>;
      })}
    </div>
  );
}

/**
 * Converts markdown string to clean HTML string for PDF printing and HTML export.
 */
export function markdownToHtml(content: string): string {
  if (!content) return '';

  const formatInline = (text: string): string => {
    return text
      // ***bold italic***
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
      // **bold**
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // *italic*
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // `code`
      .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;border:1px solid #cbd5e1;">$1</code>')
      // ~~strike~~
      .replace(/~~([^~]+)~~/g, '<del>$1</del>');
  };

  const lines = content.split('\n');
  const htmlParts: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table handling
    if (trimmed.startsWith('|')) {
      inTable = true;
      tableRows.push(trimmed);
      continue;
    } else if (inTable) {
      inTable = false;
      // Render table
      if (tableRows.length >= 2) {
        const parseCells = (row: string) => row.split('|').slice(1, -1).map(c => c.trim());
        const headers = parseCells(tableRows[0]);
        const isSep = /^[|:\-\s]+$/.test(tableRows[1]);
        const bodyRows = (isSep ? tableRows.slice(2) : tableRows.slice(1)).map(parseCells);

        let tableHtml = '<table style="width:100%;border-collapse:collapse;margin:24px 0;border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;overflow:hidden;">';
        tableHtml += '<thead style="background:#f8fafc;border-bottom:2px solid #cbd5e1;"><tr>';
        headers.forEach(h => {
          tableHtml += `<th style="padding:10px 14px;text-align:left;border-right:1px solid #e2e8f0;font-weight:700;">${formatInline(h)}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
        bodyRows.forEach(row => {
          tableHtml += '<tr style="border-bottom:1px solid #f1f5f9;">';
          row.forEach(c => {
            tableHtml += `<td style="padding:10px 14px;border-right:1px solid #f1f5f9;">${formatInline(c)}</td>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table>';
        htmlParts.push(tableHtml);
      }
      tableRows = [];
    }

    if (!trimmed) {
      htmlParts.push('<div style="height:36px;"></div>');
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      htmlParts.push(`<h4 style="font-size:20px;margin:24px 0 12px 0;color:#0f172a;font-weight:700;">${formatInline(trimmed.slice(5))}</h4>`);
    } else if (trimmed.startsWith('### ')) {
      htmlParts.push(`<h3 style="font-size:22px;margin:28px 0 14px 0;color:#0f172a;border-bottom:1px solid #cbd5e1;padding-bottom:6px;font-weight:700;">${formatInline(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith('## ')) {
      htmlParts.push(`<h2 style="font-size:25px;margin:32px 0 16px 0;color:#0f172a;border-bottom:2px solid #94a3b8;padding-bottom:8px;font-weight:800;">${formatInline(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith('# ')) {
      htmlParts.push(`<h1 style="font-size:28px;margin:36px 0 18px 0;color:#0f172a;font-weight:800;">${formatInline(trimmed.slice(2))}</h1>`);
    } else if (trimmed.startsWith('> ')) {
      htmlParts.push(`<div class="notebook-callout" style="background:#fefce8;border-left:4px solid #eab308;padding:16px 20px;margin:24px 0;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);line-height:36px;">${formatInline(trimmed.replace('> ', ''))}</div>`);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      htmlParts.push(`<div style="display:flex;align-items:flex-start;gap:8px;line-height:36px;margin:0;"><span style="color:#2563eb;font-weight:bold;">•</span><div>${formatInline(trimmed.slice(2))}</div></div>`);
    } else if (/^\d+\.\s/.test(trimmed)) {
      const dot = trimmed.indexOf('.');
      const n = trimmed.slice(0, dot);
      const rest = trimmed.slice(dot + 1).trim();
      htmlParts.push(`<div style="display:flex;align-items:flex-start;gap:8px;line-height:36px;margin:0;"><span style="color:#475569;font-weight:bold;">${n}.</span><div>${formatInline(rest)}</div></div>`);
    } else {
      htmlParts.push(`<p style="line-height:36px;margin:0 0 12px 0;">${formatInline(trimmed)}</p>`);
    }
  }

  return htmlParts.join('\n');
}

