/**
 * Sanitizes Mermaid diagram code before passing it to mermaid.render()
 * - Strips outer markdown code fences (```mermaid ... ```)
 * - Ensures diagram type header is present (defaults to graph TD)
 * - Quotes subgraph titles containing spaces: subgraph "Title With Spaces"
 * - Quotes subgraph titles with bracket IDs: subgraph id ["Title With Spaces / Chars"]
 * - Quotes edge labels containing parentheses, slashes, ampersands, or other special characters
 * - Quotes node labels containing slashes, ampersands, parentheses, or special characters
 */
export function sanitizeMermaidCode(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let code = raw.trim();

  // Strip markdown code fences if present (```mermaid ... ```)
  code = code.replace(/^```(?:mermaid)?\s*/i, '').replace(/```\s*$/i, '').trim();

  // List of standard Mermaid diagram starters
  const validHeaders = [
    'graph',
    'flowchart',
    'sequencediagram',
    'classdiagram',
    'statediagram',
    'statediagram-v2',
    'erdiagram',
    'journey',
    'gantt',
    'pie',
    'quadrantchart',
    'requirementdiagram',
    'gitgraph',
    'c4context',
    'c4container',
    'c4component',
    'c4dynamic',
    'c4deployment',
    'mindmap',
    'timeline',
    'zenuml',
    'sankey-beta',
    'xychart-beta',
    'block-beta',
    'packet-beta',
    'kanban',
    'architecture-beta',
  ];

  const firstLine = code.split('\n')[0].trim().toLowerCase();
  const hasHeader = validHeaders.some((h) => firstLine.startsWith(h));
  if (!hasHeader) {
    code = 'graph TD\n' + code;
  }

  const lines = code.split('\n');
  const sanitizedLines = lines.map((line) => {
    let l = line;

    // 1. Fix unquoted subgraph titles with spaces:
    //    subgraph Kernel Core Functions -> subgraph "Kernel Core Functions"
    const simpleSubgraph = l.match(/^(\s*subgraph\s+)([^"\[\]\r\n]+)$/i);
    if (simpleSubgraph) {
      const title = simpleSubgraph[2].trim();
      if (title.includes(' ') && !title.startsWith('"')) {
        return `${simpleSubgraph[1]}"${title}"`;
      }
    }

    // 2. Fix bracketed subgraph titles:
    //    subgraph id [Some Title / With Chars] -> subgraph id ["Some Title / With Chars"]
    const bracketSubgraph = l.match(/^(\s*subgraph\s+[a-zA-Z0-9_-]+\s*)\[([^"\[\]\r\n]+)\]/i);
    if (bracketSubgraph) {
      const title = bracketSubgraph[2].trim();
      if (!title.startsWith('"')) {
        return `${bracketSubgraph[1]}["${title}"]`;
      }
    }

    // 3. Fix edge labels: |label with (parentheses) or / or &| -> |"label with (parentheses) or / or &"|
    l = l.replace(/\|([^"|\r\n]+)\|/g, (match, label) => {
      const trimmed = label.trim();
      if (/[()\/&,:;+<>]/.test(trimmed) && !trimmed.startsWith('"') && !trimmed.endsWith('"')) {
        return `|"${trimmed}"|`;
      }
      return match;
    });

    // 4. Fix node labels with square brackets:
    //    A[Disk / I/O Devices] -> A["Disk / I/O Devices"]
    l = l.replace(/\b([a-zA-Z0-9_]+)\s*\[([^"\[\]\r\n]+)\]/g, (match, id, label) => {
      const trimmed = label.trim();
      if (/[()\/&,:;+<>]/.test(trimmed) && !trimmed.startsWith('"') && !trimmed.endsWith('"')) {
        return `${id}["${trimmed}"]`;
      }
      return match;
    });

    // 5. Fix rounded/parenthesis node labels:
    //    B(Special (Note)) -> B("Special (Note)")
    l = l.replace(/\b([a-zA-Z0-9_]+)\s*\(\(([^"()\r\n]+)\)\)/g, (match, id, label) => {
      const trimmed = label.trim();
      if (/[()\/&,:;+<>]/.test(trimmed) && !trimmed.startsWith('"')) {
        return `${id}(("${trimmed}"))`;
      }
      return match;
    });

    return l;
  });

  return sanitizedLines.join('\n');
}

/**
 * Removes any stray DOM error elements injected by Mermaid directly into document.body
 */
export function cleanupStrayMermaidElements(): void {
  try {
    if (typeof document === 'undefined') return;
    const stray = document.querySelectorAll(
      'body > svg[id^="dmermaid"], body > div[id^="dmermaid"], body > svg.error-icon, body > .error-icon, svg[id^="dmermaid"], div[id^="dmermaid"], .error-icon, .error-text'
    );
    stray.forEach((el) => el.remove());
  } catch {}
}

export interface DiagramTypeInfo {
  type: string;
  label: string;
  category: 'block' | 'flowchart' | 'sequence' | 'state' | 'mindmap' | 'architecture' | 'other';
}

export function getDiagramTypeInfo(raw: string): DiagramTypeInfo {
  const clean = (raw || '').replace(/^```(?:mermaid)?\s*/i, '').trim().toLowerCase();
  const firstLine = clean.split('\n')[0].trim();

  if (firstLine.startsWith('block-beta') || firstLine.startsWith('block')) {
    return { type: 'block-beta', label: 'Architecture Block Diagram', category: 'block' };
  }
  if (firstLine.startsWith('architecture-beta') || firstLine.startsWith('c4')) {
    return { type: 'architecture', label: 'System Architecture Blueprint', category: 'architecture' };
  }
  if (firstLine.startsWith('statediagram') || firstLine.startsWith('statediagram-v2')) {
    return { type: 'stateDiagram-v2', label: 'State Transition Machine', category: 'state' };
  }
  if (firstLine.startsWith('sequencediagram')) {
    return { type: 'sequenceDiagram', label: 'Protocol Sequence Flow', category: 'sequence' };
  }
  if (firstLine.startsWith('mindmap')) {
    return { type: 'mindmap', label: 'Conceptual Mindmap Tree', category: 'mindmap' };
  }
  if (firstLine.startsWith('erdiagram')) {
    return { type: 'erDiagram', label: 'Entity-Relationship Model', category: 'other' };
  }
  if (firstLine.startsWith('classdiagram')) {
    return { type: 'classDiagram', label: 'Class & Interface Model', category: 'other' };
  }
  if (firstLine.startsWith('gitgraph')) {
    return { type: 'gitGraph', label: 'Branch & Revision Graph', category: 'other' };
  }
  return { type: 'flowchart', label: 'Process Logic & Flowchart', category: 'flowchart' };
}
