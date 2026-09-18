import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import cytoscape, { Core, NodeSingular } from 'cytoscape';
import { MasterDocument, SourceFile } from '../types';
import {
  Maximize2,
  RotateCcw,
  Search,
  BookOpen,
  Share2,
  FileCode,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { triggerMicroBurst } from './ui/particle-burst';

interface ConceptKnowledgeGraphProps {
  document: MasterDocument;
  sources: SourceFile[];
  onJumpToChapter?: (chapterNumber: number) => void;
}

interface SelectedNodeInfo {
  id: string;
  label: string;
  type: 'root' | 'chapter' | 'concept' | 'source';
  chapterNumber?: number;
  sectionId?: string;
  snippet?: string;
  connectionsCount: number;
}

export const ConceptKnowledgeGraph: React.FC<ConceptKnowledgeGraphProps> = ({
  document,
  sources,
  onJumpToChapter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);

  // Generate Graph Elements from MasterDocument and Sources
  const elements = useMemo(() => {
    const nodes: any[] = [];
    const edges: any[] = [];

    // 1. Central Document Root Node
    nodes.push({
      data: {
        id: 'doc-root',
        label: document.title.length > 28 ? document.title.slice(0, 26) + '...' : document.title,
        fullTitle: document.title,
        type: 'root',
        color: '#2563eb',
        size: 52,
      },
    });

    const chapterColors = ['#4f46e5', '#059669', '#d97706', '#7c3aed', '#0891b2', '#e11d48'];

    // 2. Chapters & Concepts
    document.chapters.forEach((chapter, chIdx) => {
      const chColor = chapterColors[chIdx % chapterColors.length];
      const chNodeId = `ch-${chapter.chapterNumber}`;

      nodes.push({
        data: {
          id: chNodeId,
          label: `Ch ${chapter.chapterNumber}: ${chapter.title.replace(/^Chapter\s+\d+:\s*/i, '').slice(0, 20)}`,
          fullTitle: chapter.title,
          chapterNumber: chapter.chapterNumber,
          type: 'chapter',
          color: chColor,
          size: 38,
          summary: chapter.summary,
        },
      });

      // Edge from Root -> Chapter
      edges.push({
        data: {
          id: `edge-root-${chNodeId}`,
          source: 'doc-root',
          target: chNodeId,
          type: 'hierarchy',
          color: '#94a3b8',
          width: 2.2,
        },
      });

      // Sections as Concept Nodes
      chapter.sections.forEach((section) => {
        const secNodeId = `sec-${section.id}`;
        nodes.push({
          data: {
            id: secNodeId,
            label: section.title.length > 22 ? section.title.slice(0, 20) + '...' : section.title,
            fullTitle: section.title,
            chapterNumber: chapter.chapterNumber,
            sectionId: section.id,
            type: 'concept',
            color: '#0284c7',
            size: 24,
            snippet: section.content.slice(0, 160),
          },
        });

        // Edge Chapter -> Section
        edges.push({
          data: {
            id: `edge-${chNodeId}-${secNodeId}`,
            source: chNodeId,
            target: secNodeId,
            type: 'concept_link',
            color: '#cbd5e1',
            width: 1.5,
          },
        });
      });
    });

    // 3. Knowledge Sources Nodes
    sources.forEach((src) => {
      const srcNodeId = `src-${src.id}`;
      nodes.push({
        data: {
          id: srcNodeId,
          label: src.name.length > 20 ? src.name.slice(0, 18) + '...' : src.name,
          fullTitle: src.name,
          type: 'source',
          color: '#ea580c',
          size: 28,
        },
      });

      // Connect Source to Root
      edges.push({
        data: {
          id: `edge-src-${srcNodeId}`,
          source: srcNodeId,
          target: 'doc-root',
          type: 'source_grounding',
          color: '#fed7aa',
          width: 1.2,
          lineStyle: 'dashed',
        },
      });
    });

    // 4. Semantic Cross-Links between Concepts across different chapters
    const commonKeywords = [
      'process',
      'thread',
      'memory',
      'paging',
      'tlb',
      'deadlock',
      'lock',
      'mutex',
      'cache',
      'virtual',
      'cpu',
      'scheduling',
      'concurrency',
      'interrupt',
      'matrix',
      'gradient',
      'attention',
      'transformer',
    ];

    const allConcepts = nodes.filter((n) => n.data.type === 'concept');
    for (let i = 0; i < allConcepts.length; i++) {
      for (let j = i + 1; j < allConcepts.length; j++) {
        const c1 = allConcepts[i];
        const c2 = allConcepts[j];
        if (c1.data.chapterNumber !== c2.data.chapterNumber) {
          const t1 = (c1.data.fullTitle + ' ' + (c1.data.snippet || '')).toLowerCase();
          const t2 = (c2.data.fullTitle + ' ' + (c2.data.snippet || '')).toLowerCase();
          const shared = commonKeywords.find((kw) => t1.includes(kw) && t2.includes(kw));
          if (shared) {
            edges.push({
              data: {
                id: `cross-${c1.data.id}-${c2.data.id}`,
                source: c1.data.id,
                target: c2.data.id,
                type: 'semantic_cross',
                color: '#60a5fa',
                width: 1.2,
                lineStyle: 'dotted',
                keyword: shared,
              },
            });
          }
        }
      }
    }

    return [...nodes, ...edges];
  }, [document, sources]);

  // Initialize and update Cytoscape instance
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            'font-family': 'Inter, system-ui, sans-serif',
            'font-size': '10px',
            'font-weight': 600,
            color: '#1e293b',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.85,
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
            width: 'data(size)',
            height: 'data(size)',
            'border-width': 2,
            'border-color': '#ffffff',
            'shadow-blur': 10,
            'shadow-color': 'data(color)',
            'shadow-opacity': 0.25,
            'transition-property': 'background-color, line-color, target-arrow-color, width, height',
            'transition-duration': '0.2s',
          } as any,
        },
        {
          selector: 'node[type="root"]',
          style: {
            'font-size': '12px',
            'font-weight': 700,
            'border-width': 3,
            'border-color': '#93c5fd',
          } as any,
        },
        {
          selector: 'node[type="chapter"]',
          style: {
            'font-size': '10.5px',
            'font-weight': 600,
          } as any,
        },
        {
          selector: 'edge',
          style: {
            width: 'data(width)',
            'line-color': 'data(color)',
            'curve-style': 'bezier',
            opacity: 0.7,
            'line-style': 'data(lineStyle)' as any,
          } as any,
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#2563eb',
            'shadow-blur': 18,
            'shadow-color': '#2563eb',
            'shadow-opacity': 0.6,
          } as any,
        },
        {
          selector: '.highlighted',
          style: {
            'border-width': 4,
            'border-color': '#3b82f6',
            'shadow-blur': 16,
            'shadow-color': '#3b82f6',
            'shadow-opacity': 0.5,
          } as any,
        },
        {
          selector: '.dimmed',
          style: {
            opacity: 0.25,
          } as any,
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        randomize: false,
        componentSpacing: 80,
        nodeOverlap: 20,
        nestingFactor: 1.2,
        gravity: 1.5,
        numIter: 400,
        initialTemp: 200,
        coolingFactor: 0.95,
      } as any,
      minZoom: 0.4,
      maxZoom: 2.5,
      wheelSensitivity: 0.3,
    });

    cyRef.current = cy;

    // Node click handler
    cy.on('tap', 'node', (evt) => {
      const node = evt.target as NodeSingular;
      const data = node.data();
      const connectedEdges = node.connectedEdges();

      setSelectedNode({
        id: data.id,
        label: data.fullTitle || data.label,
        type: data.type,
        chapterNumber: data.chapterNumber,
        sectionId: data.sectionId,
        snippet: data.snippet || data.summary,
        connectionsCount: connectedEdges.length,
      });

      // Highlight neighborhood
      cy.elements().removeClass('highlighted dimmed');
      const neighborhood = node.neighborhood().add(node);
      neighborhood.addClass('highlighted');
      cy.elements().not(neighborhood).addClass('dimmed');
    });

    // Background click handler to clear selection
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        cy.elements().removeClass('highlighted dimmed');
      }
    });

    return () => {
      cy.destroy();
    };
  }, [elements]);

  // Search Filter
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (!searchQuery.trim()) {
      cy.elements().removeClass('highlighted dimmed');
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    cy.elements().removeClass('highlighted dimmed');

    const matchedNodes = cy.nodes().filter((node) => {
      const label = (node.data('fullTitle') || node.data('label') || '').toLowerCase();
      const snippet = (node.data('snippet') || '').toLowerCase();
      return label.includes(query) || snippet.includes(query);
    });

    if (matchedNodes.length > 0) {
      matchedNodes.addClass('highlighted');
      cy.elements().not(matchedNodes).addClass('dimmed');
      cy.animate({
        fit: {
          eles: matchedNodes,
          padding: 60,
        },
        duration: 350,
      });
    }
  }, [searchQuery]);

  const handleFit = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.animate({
      fit: { eles: cy.elements(), padding: 40 },
      duration: 300,
    });
  };

  const handleResetLayout = () => {
    cyRef.current?.layout({
      name: 'cose',
      animate: true,
      animationDuration: 400,
      componentSpacing: 80,
      nodeOverlap: 20,
    } as any).run();
  };

  const handleJumpFromNode = useCallback((e?: React.MouseEvent) => {
    if (!selectedNode || !onJumpToChapter) return;
    if (e) triggerMicroBurst(e.clientX, e.clientY, '#2563eb');
    if (selectedNode.chapterNumber) {
      onJumpToChapter(selectedNode.chapterNumber);
      if (selectedNode.sectionId) {
        setTimeout(() => {
          const el = window.document.getElementById(`sec-${selectedNode.sectionId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }
  }, [selectedNode, onJumpToChapter]);

  return (
    <div className="space-y-3 relative select-none">
      {/* Top Header & Controls */}
      <Card className="p-3.5 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 text-[10px] tracking-wider uppercase font-semibold">
            <Share2 size={11} className="text-blue-500" />
            <span>CONCEPT MESH</span>
          </Badge>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {document.chapters.length} Chapters • {elements.filter((e) => e.data.type === 'concept').length} Concepts
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-xs min-w-[200px]">
          <div className="relative w-full">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search graph nodes..."
              className="w-full text-xs pl-7 pr-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleFit}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer shadow-2xs"
            title="Fit to View"
          >
            <Maximize2 size={13} />
          </button>
          <button
            onClick={handleResetLayout}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer shadow-2xs"
            title="Re-run Physics Simulation"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </Card>

      {/* Graph Visualizer Canvas Area */}
      <div className="relative w-full h-[520px] rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-[#fafbfe] dark:bg-slate-950 overflow-hidden shadow-inner">
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Legend Overlay */}
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[10.5px] space-y-1.5 shadow-xs select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Master Document</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Chapters</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Concept Nodes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Grounding Sources</span>
          </div>
        </div>

        {/* Floating Selected Node Detail Card */}
        {selectedNode && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-blue-200/90 dark:border-blue-800/80 shadow-xl space-y-2.5 transition-all select-text">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 capitalize">
                {selectedNode.type === 'chapter' ? (
                  <BookOpen size={12} />
                ) : selectedNode.type === 'source' ? (
                  <FileCode size={12} />
                ) : (
                  <Sparkles size={12} />
                )}
                <span>{selectedNode.type}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedNode.connectionsCount} links
              </span>
            </div>

            <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
              {selectedNode.label}
            </h4>

            {selectedNode.snippet && (
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                {selectedNode.snippet}
              </p>
            )}

            {selectedNode.chapterNumber && onJumpToChapter && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={handleJumpFromNode}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>Jump to Notes Sheet</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
