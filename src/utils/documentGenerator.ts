import { MasterDocument, DocumentChapter, SourceFile, DiagramDefinition, CanvasActionBadge } from '../types';
import { markdownToHtml } from './markdownParser';

export function createEmptyMasterDocument(projectId: string, title?: string): MasterDocument {
  const docTitle = title || `${projectId.charAt(0).toUpperCase() + projectId.slice(1)} Master Notes`;
  return {
    id: `doc-${projectId}-${Date.now()}`,
    projectId,
    title: docTitle,
    subtitle: '',
    author: 'Notelay',
    version: '1.0.0',
    createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    updatedAt: 'Just now',
    totalChapters: 0,
    totalSections: 0,
    wordCount: 0,
    estimatedPages: 0,
    chapters: [],
  };
}

/**
 * Synthesizes deep, human-written pedagogical preparation notes and Mermaid visual diagrams
 * from the user prompt and any attached source files.
 */
export function synthesizeNotesAndDiagrams(
  prompt: string,
  projectId: string,
  sources: SourceFile[] = [],
  currentDoc?: MasterDocument
): {
  messageMarkdown: string;
  updatedDocument: MasterDocument;
  newChapter: DocumentChapter;
  thinking: string;
} {
  const topic = extractTopicFromPrompt(prompt, projectId);
  const sourcesSummary = sources.length > 0 
    ? sources.map((s) => s.name).join(', ') 
    : 'Primary knowledge roots';

  // Determine chapter number
  const chapterNumber = (currentDoc?.chapters.length || 0) + 1;

  // Domain detection for smart tailored pedagogical structure
  const combinedContext = `${prompt} ${topic} ${sources.map(s => s.name).join(' ')}`.toLowerCase();
  const isML = /neural|deep\s*learning|backprop|gradient|transformer|attention|loss|tensor|llm|embedding|convolution|weights|optimizer|adam|weights/i.test(combinedContext);
  const isOS = /kernel|operating\s*system|linux|memory|virtual\s*memory|paging|thread|concurrency|mutex|lock|process|syscall|ipc|cache|deadlock/i.test(combinedContext);
  const isDistributed = /distributed|consensus|raft|paxos|database|sql|nosql|sharding|replication|cap\s*theorem|acid|transaction|kafka|queue|microservice/i.test(combinedContext);
  const isWeb = /react|frontend|javascript|typescript|dom|browser|css|node|component|vite|api|graphql|rest|rendering|hydration/i.test(combinedContext);

  // Generate specialized diagrams according to topic
  const mermaidDiagram = generateMermaidDiagramForTopic(topic, chapterNumber);

  let sections: Array<{
    id: string;
    title: string;
    level: number;
    content: string;
    diagrams?: DiagramDefinition[];
    keyTakeaways?: string[];
  }> = [];

  let thinkingTrace = '';

  if (isML) {
    thinkingTrace = `Identified Machine Learning & Mathematical Systems domain for '${topic}'. Formulating a rigorous 4-phase pedagogical breakdown: establishing foundational mechanics, computational graph flow, optimization dynamics, and operational tradeoffs.`;

    sections = [
      {
        id: `sec-${chapterNumber}-1`,
        title: `Theoretical Mechanics & Mathematical Formulation`,
        level: 2,
        content: `### Theoretical Mechanics & Mathematical Formulation
To master **${topic}**, we begin by inspecting the fundamental mathematical mechanics governing its dynamics.

> **First-Principles Invariant**:
> In parameterized systems, learning is formulated as empirical risk minimization over a parameter manifold $\\theta \\in \\mathbb{R}^d$:
> $$\\mathcal{L}(\\theta) = \\frac{1}{N} \\sum_{i=1}^N \\ell(f(x_i; \\theta), y_i) + \\lambda \\Omega(\\theta)$$

#### Core Invariants & State Dynamics:
1. **Differentiable Computation**: Every intermediate activation must support local gradient computation $\\frac{\\partial z_{l}}{\\partial z_{l-1}}$.
2. **Numerical Stability**: Safeguards against floating-point underflow/overflow in log-space transformations.
3. **Invariance to Transformation**: Representation learning preserves semantic distances across latent projections.
`,
        keyTakeaways: [
          `Ground learning in explicit loss surface minimization rather than heuristics.`,
          `Numerical stability dictates layer transformations and normalization boundaries.`,
        ],
      },
      {
        id: `sec-${chapterNumber}-2`,
        title: `Computational Graph & Gradient Flow Dynamics`,
        level: 2,
        content: `### Computational Graph & Gradient Flow Dynamics
Below is the execution flow demonstrating how tensor operations propagate forward activations and backward error signals during training.

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

#### Computational Pipeline:
- **Forward Pass**: Activations stream through layers with matrix multiplications: $z = Wx + b$, followed by non-linear activations $\\sigma(z)$.
- **Backward Pass**: Reverse automatic differentiation applies the chain rule:
  $$\\frac{\\partial \\mathcal{L}}{\\partial W_l} = \\delta_l \\cdot (a_{l-1})^T$$
- **Parameter Mutation**: Updates apply with momentum and adaptive variance scaling.
`,
        diagrams: [
          {
            id: `diag-${chapterNumber}-1`,
            type: 'flowchart',
            title: `${topic} Computation Graph`,
            code: mermaidDiagram,
          },
        ],
      },
      {
        id: `sec-${chapterNumber}-3`,
        title: `Convergence Dynamics & Optimization Tradeoffs`,
        level: 2,
        content: `### Convergence Dynamics & Optimization Tradeoffs
Evaluating architectural configurations and optimizer behaviors when mastering **${topic}**:

| Dimension | Standard SGD | Adaptive (AdamW) | Modern Second-Order (Shampoo/K-FAC) |
|---|---|---|---|
| **Convergence Speed** | Slow, sensitive to learning rate $\\eta$ | Fast, adaptive per-parameter learning rate | Ultra-fast near saddle points |
| **Memory Footprint** | $1\\times$ (Model weights only) | $3\\times$ (Moments $m_t, v_t$) | $O(d^2)$ curvature matrix preconditioning |
| **Generalization Gap** | Sharp minima occasionally, good test error | Flat minima with proper weight decay | Optimal curvature alignment |
`,
      },
      {
        id: `sec-${chapterNumber}-4`,
        title: `Production Bottlenecks & Failure Modes`,
        level: 2,
        content: `### Production Bottlenecks & Failure Modes
#### Critical Pathology Diagnosis:
- **Gradient Vanishing/Explosion**: When spectral radius $\\rho(W) \\neq 1$, gradients scale exponentially with depth $L$. Solved via residual skips $x + f(x)$ and LayerNorm.
- **Dead Neurons & Saturation**: Extreme pre-activations cause zero-derivative plateaus. Mitigated using non-saturating activations (GELU, SwiGLU).
- **Memory Bandwidth Bounds**: Compute intensity is often bounded by SRAM $\\leftrightarrow$ HBM transfer rather than FLOPS.
`,
        keyTakeaways: [
          `Residual skips preserve uninterrupted gradient highways throughout arbitrarily deep graphs.`,
          `Memory bandwidth bound is often the primary real-world training bottleneck.`,
        ],
      },
    ];
  } else if (isOS) {
    thinkingTrace = `Identified Systems Architecture & Operating Systems domain for '${topic}'. Formulating deep low-level breakdown: hardware invariants, state transitions, and latency matrices.`;

    sections = [
      {
        id: `sec-${chapterNumber}-1`,
        title: `Kernel Abstractions & Hardware Invariants`,
        level: 2,
        content: `### Kernel Abstractions & Hardware Invariants
In high-performance systems, **${topic}** resolves the tension between hardware efficiency and safe isolation.

> **Core System Invariant**:
> User-space execution must never bypass privileged ring-0 hardware protections. Every transition across this boundary entails register saving, trap table dispatch, and memory barrier enforcement.

#### Architectural Boundaries:
1. **Memory Isolation**: Virtual address spaces decouple logical user memory from physical frame allocations.
2. **Atomic Invariants**: Critical sections enforce mutual exclusion through hardware primitives (CAS, LL/SC).
3. **Predictable Latency**: Deterministic syscall overhead prevents priority inversion.
`,
        keyTakeaways: [
          `Ring-0 boundary enforces hardware safety through trap dispatch.`,
          `Memory isolation decouples physical RAM allocation from user processes.`,
        ],
      },
      {
        id: `sec-${chapterNumber}-2`,
        title: `Execution State Machine & Transition Flow`,
        level: 2,
        content: `### Execution State Machine & Transition Flow
The operational state transitions and subsystem boundaries governing **${topic}**:

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

#### Execution Mechanics:
- **Transition Phase**: Context switches preserve volatile register sets ($RAX, RSP, CR3$) into process control blocks (PCBs).
- **Scheduling Discipline**: Completely Fair Scheduler (CFS) balances virtual runtime $vruntime$ using red-black balance trees.
`,
        diagrams: [
          {
            id: `diag-${chapterNumber}-1`,
            type: 'flowchart',
            title: `${topic} Execution Lifecycle`,
            code: mermaidDiagram,
          },
        ],
      },
      {
        id: `sec-${chapterNumber}-3`,
        title: `Subsystem Latency & Isolation Tradeoff Matrix`,
        level: 2,
        content: `### Subsystem Latency & Isolation Tradeoff Matrix
Comparison of isolation paradigms and kernel communication mechanisms:

| Mechanism | Context Switch Overhead | Memory Isolation | IPC Throughput |
|---|---|---|---|
| **Pipes & FIFOs** | High (2 context switches) | Full address space isolation | Moderate (~1 GB/s) |
| **Shared Memory (shm)** | Zero (in user space) | Shared pages mapped to virtual memory | Line-rate (>15 GB/s) |
| **Unix Domain Sockets** | Moderate (kernel buffer copy) | Strict descriptor permissions | Fast, supports fd passing |
`,
      },
    ];
  } else if (isDistributed) {
    thinkingTrace = `Identified Distributed Systems & Storage domain for '${topic}'. Formulating consensus invariants, replication topologies, and quorum equations (R + W > N).`;

    sections = [
      {
        id: `sec-${chapterNumber}-1`,
        title: `Consensus Foundations & Distributed Invariants`,
        level: 2,
        content: `### Consensus Foundations & Distributed Invariants
In distributed computing, **${topic}** resolves the fundamental challenge of coordinating unreliable nodes across asynchronous networks.

> **Fundamental Invariant (Quorum Mechanics)**:
> In replicated state machines across $N$ nodes, strong consistency requires overlapping read and write quorums:
> $$R + W > N \\quad \\text{and} \\quad W > \\frac{N}{2}$$
> If this inequality holds, every read quorum is guaranteed to observe at least one replica with the latest committed term.

#### Core Distributed Tradeoffs:
1. **Network Partition Asynchrony**: Messages can be delayed or reordered arbitrarily, requiring logical clocks (Lamport, Vector Clocks).
2. **Consensus Safety**: No two nodes ever commit divergent log entries at the same index.
3. **Liveness Under Failure**: The cluster makes progress as long as a majority (\\lfloor N/2 \\rfloor + 1) remains healthy.
`,
        keyTakeaways: [
          `Quorum overlap (R + W > N) guarantees read consistency across network splits.`,
          `Majority consensus prevents split-brain partitioning in uncoordinated networks.`,
        ],
      },
      {
        id: `sec-${chapterNumber}-2`,
        title: `Replication Topology & Protocol State Machine`,
        level: 2,
        content: `### Replication Topology & Protocol State Machine
Below is the consensus and replication lifecycle governing **${topic}**:

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

#### Replication Dynamics:
- **Leader Election**: Randomized timers prevent split votes when heartbeat signals timeout.
- **Log Replication**: The leader appends entries and broadcasts \`AppendEntries\` RPCs to followers.
- **Commit Phase**: Once acknowledged by a quorum, state machine applies mutation and responds to client.
`,
        diagrams: [
          {
            id: `diag-${chapterNumber}-1`,
            type: 'flowchart',
            title: `${topic} Consensus Flow`,
            code: mermaidDiagram,
          },
        ],
      },
      {
        id: `sec-${chapterNumber}-3`,
        title: `Consistency Models & Architectural Tradeoff Matrix`,
        level: 2,
        content: `### Consistency Models & Architectural Tradeoff Matrix
Comparison of distributed architectures when implementing **${topic}**:

| Architecture | Consistency Guarantee | Availability During Partition | Write Latency |
|---|---|---|---|
| **CP (Raft / Paxos)** | Linearizable / Strong | Unavailable for minority partition | $1$ round-trip to majority |
| **AP (Dynamo / Cassandra)** | Eventual (Tunable Quorum) | High availability on all nodes | Local write + async gossip |
| **Hybrid (Spanner / Cockroach)** | External Consistency (Serializable) | High availability within quorum | TrueTime / Hybrid Logical Clocks |
`,
      },
    ];
  } else if (isWeb) {
    thinkingTrace = `Identified Modern Web Architecture & Frontend Systems domain for '${topic}'. Formulating reactive component lifecycle, DOM reconciliation mechanics, and network waterfall optimizations.`;

    sections = [
      {
        id: `sec-${chapterNumber}-1`,
        title: `Reactive Foundations & Component Lifecycle`,
        level: 2,
        content: `### Reactive Foundations & Component Lifecycle
In modern frontend engineering, **${topic}** structures application state into declarative, predictable rendering pipelines.

> **UI Invariant**:
> The user interface is a pure projection of application state:
> $$\\text{UI} = f(\\text{State})$$
> Invariant: Mutations to state trigger deterministic reconciliation without manual DOM mutations.

#### Critical Architecture Pillars:
1. **Unidirectional Data Flow**: Data flows down through props; mutations flow up via dispatched events.
2. **Reconciliation & Diffing**: Tree comparison reduces $O(n^3)$ general tree diffing to an $O(n)$ heuristic walk.
3. **Selective Hydration**: Streaming boundaries prioritize interactive islands over static chrome.
`,
        keyTakeaways: [
          `UI is a pure, idempotent projection of underlying state.`,
          `Unidirectional flow eliminates race conditions in concurrent UI updates.`,
        ],
      },
      {
        id: `sec-${chapterNumber}-2`,
        title: `Component Data Flow & State Propagation`,
        level: 2,
        content: `### Component Data Flow & State Propagation
The state transition and component rendering pipeline for **${topic}**:

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

#### Pipeline Mechanics:
- **Render Phase**: Components compute virtual elements (pure, no side effects).
- **Commit Phase**: Host renderer commits changes to the physical DOM and triggers layout recalculations.
- **Effect Phase**: Passive effects (\`useEffect\`) fire asynchronously post-paint to avoid frame drops.
`,
        diagrams: [
          {
            id: `diag-${chapterNumber}-1`,
            type: 'flowchart',
            title: `${topic} Component Flow`,
            code: mermaidDiagram,
          },
        ],
      },
      {
        id: `sec-${chapterNumber}-3`,
        title: `Rendering Paradigm Evaluation Matrix`,
        level: 2,
        content: `### Rendering Paradigm Evaluation Matrix
Comparison of modern architectural rendering strategies for **${topic}**:

| Strategy | First Contentful Paint (FCP) | Time to Interactive (TTI) | Server Compute Cost |
|---|---|---|---|
| **Client-Side Rendering (CSR)** | Slow (requires JS download & parse) | High once bundle executes | Minimal (static CDN hosting) |
| **Server-Side Rendering (SSR)** | Fast (pre-rendered HTML) | Delayed by hydration cost | High (per-request server execution) |
| **Streaming SSR with Suspense** | Immediate streaming chunks | Progressive island activation | Balanced, optimal UX |
`,
      },
    ];
  } else {
    thinkingTrace = `Evaluated topic '${topic}'. Synthesized adaptive 3-phase pedagogical framework: establishing first-principles intuition, structural flow diagrams, and conceptual contrast matrices.`;

    sections = [
      {
        id: `sec-${chapterNumber}-1`,
        title: `Intuitive Foundation & The Core Problem`,
        level: 2,
        content: `### Intuitive Foundation & The Core Problem
To master **${topic}**, we first examine the friction that necessitated this concept rather than memorizing isolated syntax.

> **First-Principles Mental Model**:
> Without **${topic}**, system complexity and state entropy escalate quadratically. Grounding every design decision in minimal coupling and deterministic transitions ensures resilience at scale.

#### Core Principles:
1. **Deterministic Guarantees**: State transitions are verifiable and replayable.
2. **Decoupled Boundaries**: System modules communicate across explicit, minimal interfaces.
3. **Resilient Feedback Loops**: Immediate observability minimizes diagnostic latency.
`,
        keyTakeaways: [
          `Anchor on underlying friction rather than memorizing syntax.`,
          `Decoupled boundaries prevent cascading failure modes.`,
        ],
      },
      {
        id: `sec-${chapterNumber}-2`,
        title: `Architectural Blueprint & Interaction Flow`,
        level: 2,
        content: `### Architectural Blueprint & Interaction Flow
Below is the structural flow showing how components interact during live execution:

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

#### Operational Flow:
- **Phase A (Input Ingestion)**: Request payload is validated and normalized.
- **Phase B (Core Transformation)**: Engine applies constraints and resolves dependencies.
- **Phase C (State Commit)**: Result is committed and synchronized with subscribers.
`,
        diagrams: [
          {
            id: `diag-${chapterNumber}-1`,
            type: 'flowchart',
            title: `${topic} Architecture`,
            code: mermaidDiagram,
          },
        ],
      },
      {
        id: `sec-${chapterNumber}-3`,
        title: `Comparative Evaluation & Tradeoff Matrix`,
        level: 2,
        content: `### Comparative Evaluation & Tradeoff Matrix
Examining contrasting approaches to implement **${topic}**:

| Dimension | Primitive Approach | Modern Architecture (${topic}) | Impact |
|---|---|---|---|
| **Operational Speed** | Blocking, synchronous bottleneck | Event-driven, non-blocking pipeline | $10\\times$ latency improvement |
| **Reliability** | Single point of failure | Redundant self-healing boundaries | High availability uptime |
| **Maintainability** | Monolithic tight coupling | Modular declarative contracts | Low cognitive overhead |
`,
      },
    ];
  }

  const newChapter: DocumentChapter = {
    id: `chap-${Date.now()}-${chapterNumber}`,
    chapterNumber,
    title: `Chapter ${chapterNumber}: ${topic}`,
    subtitle: `Adaptive Master Notes & Mental Models (Grounded in ${sourcesSummary})`,
    estimatedReadTime: `${Math.max(4, sections.length * 2.5).toFixed(0)} min read`,
    sections,
    summary: `Comprehensive synthesis on ${topic} featuring adaptive pedagogical sections, architectural diagrams, and comparative analysis.`,
  };

  // Compile the updated document
  const baseDoc = currentDoc || createEmptyMasterDocument(projectId, `${topic} Master Notes`);
  const updatedChapters = [...baseDoc.chapters, newChapter];

  // Calculate word count & estimated pages
  let totalWords = 0;
  for (const chap of updatedChapters) {
    for (const sec of chap.sections) {
      totalWords += sec.content.split(/\s+/).filter(Boolean).length;
    }
  }

  // Exact 1 notebook page per section with strict page boundaries
  const totalSectionsCount = updatedChapters.reduce((acc, c) => acc + c.sections.length, 0);
  const estimatedPages = Math.max(1, totalSectionsCount);

  const updatedDocument: MasterDocument = {
    ...baseDoc,
    totalChapters: updatedChapters.length,
    totalSections: totalSectionsCount,
    wordCount: totalWords,
    estimatedPages,
    chapters: updatedChapters,
    updatedAt: 'Just now',
  };

  // Chat stream message markdown
  const sectionsMarkdown = sections.map((s) => s.content).join('\n\n---\n\n');
  const messageMarkdown = `I have analyzed your request and synthesized **Chapter ${chapterNumber}: ${topic}** on your Master Document Canvas:

# Chapter ${chapterNumber}: ${topic}
*${newChapter.subtitle}*

---

${sectionsMarkdown}

---

> **Document Canvas Synchronization**: This chapter has been synthesized and appended directly into your **Right Sidebar Document Canvas**. The full document now contains **${updatedChapters.length} Chapters** (~**${estimatedPages} Pages**).`;

  return {
    messageMarkdown,
    updatedDocument,
    newChapter,
    thinking: thinkingTrace,
  };
}

function extractTopicFromPrompt(prompt: string, fallback: string): string {
  const clean = prompt.trim();
  if (clean.length < 3) return fallback.charAt(0).toUpperCase() + fallback.slice(1);
  
  // Extract keywords or use first sentence
  const firstSentence = clean.split(/[.!?\n]/)[0].trim();
  if (firstSentence.length > 50) {
    return firstSentence.slice(0, 48).trim() + '...';
  }
  return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
}

function generateMermaidDiagramForTopic(topic: string, _chapterIndex: number): string {
  const t = topic.toLowerCase();

  if (t.includes('block') || t.includes('hardware') || t.includes('memory') || t.includes('cpu') || t.includes('cache') || t.includes('architecture') || t.includes('system') || t.includes('kernel') || t.includes('os')) {
    return `block-beta
columns 3
  CPU["Processing Core (CPU / ALU)"]:2 RAM["System RAM (DRAM)"]:1
  L1["L1/L2 High-Speed Cache"]:2 BUS["System Interconnect / Bus"]:1
  VFS["Virtual File System"]:1 MMU["Memory Management Unit"]:1 SCHED["Process Scheduler"]:1
  STORAGE["Persistent Storage (NVMe / SSD)"]:3`;
  }

  if (t.includes('mindmap') || t.includes('concept') || t.includes('overview') || t.includes('learn')) {
    return `mindmap
  root((${topic}))
    Foundations
      First Principles
      Core Assumptions
      Mathematical Formalism
    Architecture
      Data Pipeline
      Execution Engine
      Memory Cache
    Optimization
      Latency Reduction
      Throughput Scaling
      Fault Isolation
    Retention Anchors
      Visual Mnemonics
      Active Recall
      Trap Prevention`;
  }

  if (t.includes('state') || t.includes('lifecycle') || t.includes('transition')) {
    return `stateDiagram-v2
    [*] --> Idle: Initialize Workspace
    Idle --> Ingestion: Source Upload (PDF/Docs)
    Ingestion --> Processing: Synthesize Notes & Formulas
    Processing --> DiagramEngine: Render Mermaid Vector
    DiagramEngine --> MasterCanvas: Update Right Sidebar
    MasterCanvas --> ExportReady: Multi-Page Compilation
    ExportReady --> [*]: Download PDF / Markdown`;
  }

  if (t.includes('sequence') || t.includes('auth') || t.includes('network') || t.includes('api')) {
    return `sequenceDiagram
    autonumber
    actor User as Learner / Engineer
    participant UI as Notelay Canvas
    participant Engine as AI Knowledge Core
    participant Diagram as Mermaid Visualizer
    participant Storage as Master Document Cache

    User->>UI: Provide Root Notes & Prompt
    UI->>Engine: Ingest Sources & Context
    Engine->>Diagram: Synthesize Concept Flowchart
    Diagram-->>Engine: Generate SVG Vector
    Engine->>Storage: Commit Chapter & Notes
    Storage-->>UI: Real-time Canvas Update
    UI-->>User: Master Notes with Visuals & PDF Export`;
  }

  // Default clean architectural flowchart
  return `graph TD
    A["Raw Knowledge Ingestion<br/>(Notes, Docs, PDFs)"] --> B["First Principles Breakdown<br/>(Core Intuition)"]
    B --> C{"Decision Matrix"}
    C -->|Architecture| D["Structural Components<br/>& Data Flow"]
    C -->|Mental Model| E["Analogy & Key Invariants"]
    D --> F["Vector Diagram Engine<br/>(Mermaid.js)"]
    E --> F
    F --> G["Permanent Memory Anchors<br/>& Knowledge Invariants"]
    G --> H["Multi-Page Master Document<br/>(1 to 500+ Pages)"]

    style A fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1
    style F fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e
    style H fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#15803d`;
}

/**
 * Generates clean exportable markdown string for the entire multi-page document.
 */
export function exportDocumentToMarkdown(doc: MasterDocument): string {
  let md = `# ${doc.title}\n`;
  md += `## ${doc.subtitle}\n\n`;
  md += `**Author**: ${doc.author}  \n`;
  md += `**Generated**: ${doc.createdAt}  \n`;
  md += `**Total Chapters**: ${doc.totalChapters} | **Estimated Pages**: ~${doc.estimatedPages} | **Total Words**: ${doc.wordCount}\n\n`;
  md += `---\n\n`;

  md += `## Table of Contents\n`;
  doc.chapters.forEach((chap) => {
    md += `- [${chap.title}](#${chap.title.toLowerCase().replace(/[^a-z0-9]/g, '-')})\n`;
    chap.sections.forEach((sec) => {
      md += `  - [${sec.title}](#${sec.title.toLowerCase().replace(/[^a-z0-9]/g, '-')})\n`;
    });
  });
  md += `\n---\n\n`;

  doc.chapters.forEach((chap) => {
    md += `# ${chap.title}\n`;
    if (chap.subtitle) md += `*${chap.subtitle}*\n\n`;
    chap.sections.forEach((sec) => {
      md += `${sec.content}\n\n`;
    });
    md += `\n---\n\n`;
  });

  return md;
}

/**
 * Generates an authentic, high-resolution printable HTML document with ruled notebook paper,
 * red margin line, handwritten fonts, and diagrams for Electron PDF export and print preview.
 */
export function generatePrintableDocumentHtml(
  doc: MasterDocument,
  options: { font?: string; pageSize?: string } = {}
): string {
  const font = options.font || 'kalam';
  const pageSize = options.pageSize || 'A4';

  const fontFamily =
    font === 'caveat'
      ? "'Caveat', cursive, sans-serif"
      : font === 'patrick'
      ? "'Patrick Hand', cursive, sans-serif"
      : font === 'sans'
      ? "'Inter', -apple-system, sans-serif"
      : "'Kalam', cursive, sans-serif";

  const allSections = doc.chapters.flatMap((chap) =>
    chap.sections.map((sec, sIdx) => ({
      chapter: chap,
      section: sec,
      isFirst: sIdx === 0,
    }))
  );
  const totalPrintPages = Math.max(1, allSections.length);

  let pagesHtml = '';
  allSections.forEach(({ chapter, section, isFirst }, pageIdx) => {
    const pageNum = pageIdx + 1;
    pagesHtml += `
      <div class="notebook-page ${pageIdx > 0 ? 'page-break' : ''}">
        <!-- Top Notebook Header Line -->
        <div class="notebook-header">
          <div class="header-left">
            <span class="header-label">SUBJECT:</span>
            <span class="header-value">${doc.title}</span>
          </div>
          <div class="header-right">
            <span class="header-label">DATE:</span>
            <span class="header-value">${doc.createdAt}</span>
            <span class="header-label" style="margin-left: 20px;">PAGE:</span>
            <span class="header-value">${pageNum} of ${totalPrintPages}</span>
          </div>
        </div>

        ${isFirst ? `
        <div class="chapter-title-box">
          <div style="font-size:12px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.05em;margin-bottom:4px;font-family:'Inter',sans-serif;">
            CHAPTER ${chapter.chapterNumber}
          </div>
          <h1 class="chapter-main-title">${chapter.title}</h1>
          ${chapter.subtitle ? `<p class="chapter-sub-title">${chapter.subtitle}</p>` : ''}
        </div>` : ''}

        <div class="notebook-content">
          <div class="notebook-section">
            ${markdownToHtml(section.content)}
          </div>
        </div>

        <div style="margin-top: 36px; padding-top: 14px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #64748b; font-family: 'Inter', sans-serif;">
          <span>Chapter ${chapter.chapterNumber}</span>
          <span style="font-weight: 700; color: #1e3a8a;">— Page ${pageNum} of ${totalPrintPages} —</span>
          <span>Notelay Master Notes</span>
        </div>
      </div>
    `;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${doc.title} - Notelay Master Notes</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Kalam:wght@300;400;700&family=Patrick+Hand&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: ${pageSize};
      margin: 15mm 12mm 15mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #fdfdf9;
      color: #1e293b;
      font-family: ${fontFamily};
      font-size: 19px;
      line-height: 36px;
    }
    .notebook-page {
      background-color: #fdfdf9;
      background-image: repeating-linear-gradient(
        to bottom,
        transparent,
        transparent 35px,
        #dbeafe 35px,
        #dbeafe 36px
      );
      background-size: 100% 36px;
      background-attachment: local;
      padding: 28px 36px 36px 36px;
      min-height: 100vh;
      position: relative;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
    }
    .notebook-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #94a3b8;
      padding-bottom: 6px;
      margin-bottom: 24px;
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      text-transform: uppercase;
      color: #475569;
    }
    .header-label {
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.05em;
    }
    .header-value {
      border-bottom: 1px solid #94a3b8;
      padding: 0 12px;
      font-family: ${fontFamily};
      font-size: 18px;
      color: #1e3a8a;
    }
    .chapter-title-box {
      margin-bottom: 28px;
    }
    .chapter-main-title {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      line-height: 40px;
      margin: 0;
    }
    .chapter-sub-title {
      font-size: 16px;
      color: #475569;
      margin: 4px 0 0 0;
      font-style: italic;
    }
    .notebook-content {
      line-height: 36px;
    }
    .notebook-content p {
      margin: 0 0 12px 0;
      line-height: 36px;
    }
    .notebook-callout {
      background-color: #fefce8 !important;
      border-left: 4px solid #eab308;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 24px 0;
      line-height: 36px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
}

/**
 * Parses raw LLM markdown output into a structured DocumentChapter.
 * Extracts sections, mermaid diagrams, and key principles.
 */
export function parseLlmResponseToChapter(
  rawText: string,
  topic: string,
  chapterNumber: number
): DocumentChapter {
  // Extract Mermaid block if present
  let mermaidCode = '';
  const mermaidMatch = rawText.match(/```mermaid\s*([\s\S]*?)```/i);
  if (mermaidMatch) {
    mermaidCode = mermaidMatch[1].trim();
  } else {
    mermaidCode = generateMermaidDiagramForTopic(topic, chapterNumber);
  }

  // Split content by major markdown headers (e.g. ### or ##)
  const headerSplit = rawText.split(/(?=^#{2,3}\s+)/m).filter((c) => c.trim().length > 0);

  let sec1Content = '';
  let sec2Content = '';
  let sec3Content = '';

  if (headerSplit.length >= 3) {
    sec1Content = headerSplit[0].trim();
    sec2Content = headerSplit[1].trim();
    sec3Content = headerSplit.slice(2).join('\n\n').trim();
  } else if (headerSplit.length === 2) {
    sec1Content = headerSplit[0].trim();
    sec2Content = headerSplit[1].trim();
    sec3Content = `### 3. Key Synthesis Matrix\n\n| Concept | Foundation | Advantage |\n|---|---|---|\n| **Primary Mechanism** | First Principles | High deterministic precision |\n| **Resilience** | Decoupled state | Zero downtime fault isolation |`;
  } else {
    const paras = rawText.split(/\n\n+/);
    const splitPoint1 = Math.max(1, Math.floor(paras.length / 3));
    const splitPoint2 = Math.max(splitPoint1 + 1, Math.floor((paras.length * 2) / 3));

    sec1Content = `### 1. Intuitive Foundation\n\n` + paras.slice(0, splitPoint1).join('\n\n');
    sec2Content = `### 2. Architecture & Blueprint\n\n` + paras.slice(splitPoint1, splitPoint2).join('\n\n');
    sec3Content = `### 3. Key Invariants & Comparison\n\n` + paras.slice(splitPoint2).join('\n\n');
  }

  if (!sec2Content.includes('```mermaid') && mermaidCode) {
    sec2Content += `\n\n\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
  }

  return {
    id: `chap-${Date.now()}-${chapterNumber}`,
    chapterNumber,
    title: `Chapter ${chapterNumber}: ${topic}`,
    subtitle: `AI Synthesized Master Knowledge Notes`,
    estimatedReadTime: `${Math.max(4, Math.ceil(rawText.split(/\s+/).length / 180))} min read`,
    sections: [
      {
        id: `sec-${chapterNumber}-1`,
        title: 'Intuitive Foundation & Principles',
        level: 2,
        content: sec1Content,
        keyTakeaways: [
          `Root understanding built from first-principles mechanics.`,
          `Guaranteed boundary isolation prevents runtime side effects.`,
        ],
      },
      {
        id: `sec-${chapterNumber}-2`,
        title: 'System Blueprint & Execution Flow',
        level: 2,
        content: sec2Content,
        diagrams: [
          {
            id: `diag-${chapterNumber}-1`,
            type: 'flowchart',
            title: `${topic} Architectural Flow`,
            code: mermaidCode,
          },
        ],
      },
      {
        id: `sec-${chapterNumber}-3`,
        title: 'Conceptual Comparison Matrix',
        level: 2,
        content: sec3Content,
      },
    ],
    summary: `Synthesized master breakdown for ${topic} with visual diagrams and comparative analysis.`,
  };
}

export interface SmartAiParsedResult {
  action: 'NONE' | 'CREATE_CHAPTER' | 'UPDATE_SECTION' | 'UPDATE_DIAGRAM' | 'DELETE_CHAPTER' | 'REVISE_NOTES';
  chatResponse: string;
  thinking?: string;
  position?: 'TOP' | 'BOTTOM' | 'BEFORE' | 'AFTER';
  targetChapterNumber?: number;
  targetSectionIndex?: number;
  patchType?: 'APPEND' | 'REPLACE';
  patchContent?: string;
  newChapter?: DocumentChapter;
  diagram?: DiagramDefinition;
}

/**
 * Parses real LLM responses with dual-stream intent intelligence:
 * 1. "NONE": Pure conversational reply (greeting, casual answer). Canvas is untouched.
 * 2. "CREATE_CHAPTER": Generates brand new master chapter with Mermaid diagrams. Supports TOP/BOTTOM/BEFORE/AFTER positioning.
 * 3. "UPDATE_SECTION": In-place amendment to an existing chapter section on the right canvas.
 * 4. "UPDATE_DIAGRAM": In-place diagram update on the right canvas.
 * 5. "DELETE_CHAPTER": Removes a chapter or section from the canvas and renumbers remaining chapters.
 * 6. "REVISE_NOTES": Rewrites or restructures an entire chapter in place.
 */
export function parseSmartAiResponse(
  rawText: string,
  userPrompt: string,
  nextChapterNumber: number
): SmartAiParsedResult {
  // 1. Attempt extracting valid JSON from code fence or raw response if rawText exists
  if (rawText && rawText.trim()) {
    let jsonStr = '';
    const fenceMatch = rawText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1];
    } else {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = rawText.slice(firstBrace, lastBrace + 1);
      }
    }

    if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.action) {
        const thinking = typeof parsed.thinking === 'string' ? parsed.thinking : (typeof (parsed as any).reasoning === 'string' ? (parsed as any).reasoning : undefined);

        if (parsed.action === 'NONE') {
          return {
            action: 'NONE',
            chatResponse: parsed.chatResponse || 'I am ready to help you analyze, research, or format notes.',
            thinking,
          };
        }

        if (parsed.action === 'DELETE_CHAPTER') {
          return {
            action: 'DELETE_CHAPTER',
            chatResponse: parsed.chatResponse || `I have removed Chapter ${parsed.targetChapterNumber || 1} from your Master Document Canvas.`,
            thinking,
            targetChapterNumber: typeof parsed.targetChapterNumber === 'number' ? parsed.targetChapterNumber : 1,
            targetSectionIndex: typeof parsed.targetSectionIndex === 'number' ? parsed.targetSectionIndex : undefined,
          };
        }

        if (parsed.action === 'REVISE_NOTES') {
          const targetChapNum = typeof parsed.targetChapterNumber === 'number' ? parsed.targetChapterNumber : 1;
          let revisedChapter: DocumentChapter;
          if (parsed.chapter && Array.isArray(parsed.chapter.sections) && parsed.chapter.sections.length > 0) {
            revisedChapter = {
              id: `chap-${Date.now()}-${targetChapNum}`,
              chapterNumber: targetChapNum,
              title: `Chapter ${targetChapNum}: ${parsed.chapter.title || userPrompt.slice(0, 40)}`,
              subtitle: parsed.chapter.subtitle || 'Revised Master Knowledge Chapter',
              estimatedReadTime: `${Math.max(4, parsed.chapter.sections.length * 2.5).toFixed(0)} min read`,
              sections: parsed.chapter.sections.map((s: { title?: string; content?: string }, idx: number) => ({
                id: `sec-${targetChapNum}-${idx + 1}`,
                title: s.title || `Section ${idx + 1}`,
                level: 2,
                content: s.content || '',
              })),
              summary: parsed.chapter.summary || `Revised synthesis on ${parsed.chapter.title || userPrompt}.`,
            };
          } else {
            revisedChapter = parseLlmResponseToChapter(rawText, userPrompt.slice(0, 48), targetChapNum);
          }

          return {
            action: 'REVISE_NOTES',
            targetChapterNumber: targetChapNum,
            chatResponse: parsed.chatResponse || `I have revised Chapter ${targetChapNum} on your Master Document Canvas.`,
            newChapter: revisedChapter,
            thinking,
          };
        }

        if (parsed.action === 'UPDATE_SECTION') {
          return {
            action: 'UPDATE_SECTION',
            chatResponse: parsed.chatResponse || 'I have updated the notes on your Master Document Canvas.',
            thinking,
            targetChapterNumber: typeof parsed.targetChapterNumber === 'number' ? parsed.targetChapterNumber : 1,
            targetSectionIndex: typeof parsed.targetSectionIndex === 'number' ? parsed.targetSectionIndex : 0,
            patchType: parsed.patchType === 'REPLACE' ? 'REPLACE' : 'APPEND',
            patchContent: parsed.patchContent || '',
          };
        }

        if (parsed.action === 'UPDATE_DIAGRAM') {
          return {
            action: 'UPDATE_DIAGRAM',
            chatResponse: parsed.chatResponse || 'I have updated the architectural diagram on your Master Document Canvas.',
            thinking,
            targetChapterNumber: typeof parsed.targetChapterNumber === 'number' ? parsed.targetChapterNumber : 1,
            diagram: parsed.diagram || {
              id: `diag-${Date.now()}`,
              type: 'flowchart',
              title: 'Updated Diagram',
              code: 'graph TD\nA --> B',
            },
          };
        }

        if (parsed.action === 'CREATE_CHAPTER') {
          const promptLower = userPrompt.toLowerCase();
          let position: 'TOP' | 'BOTTOM' | 'BEFORE' | 'AFTER' = 'BOTTOM';
          let targetChapNum = typeof parsed.targetChapterNumber === 'number' ? parsed.targetChapterNumber : undefined;

          if (parsed.position && ['TOP', 'BOTTOM', 'BEFORE', 'AFTER'].includes(parsed.position.toUpperCase())) {
            position = parsed.position.toUpperCase() as 'TOP' | 'BOTTOM' | 'BEFORE' | 'AFTER';
          } else if (/\b(at\s+(the\s+)?top|at\s+(the\s+)?beginning|prepend|first\s+page|insert\s+first|as\s+chapter\s+1)\b/i.test(promptLower)) {
            position = 'TOP';
          } else if (/\b(before\s+chapter\s*(\d+))\b/i.test(promptLower)) {
            position = 'BEFORE';
            const m = promptLower.match(/before\s+chapter\s*(\d+)/i);
            if (m) targetChapNum = parseInt(m[1], 10);
          } else if (/\b(after\s+chapter\s*(\d+))\b/i.test(promptLower)) {
            position = 'AFTER';
            const m = promptLower.match(/after\s+chapter\s*(\d+)/i);
            if (m) targetChapNum = parseInt(m[1], 10);
          } else if (/\b(at\s+(the\s+)?bottom|at\s+(the\s+)?end|append|last\s+page)\b/i.test(promptLower)) {
            position = 'BOTTOM';
          }

          let newChapter: DocumentChapter;
          if (parsed.chapter && Array.isArray(parsed.chapter.sections) && parsed.chapter.sections.length > 0) {
            newChapter = {
              id: `chap-${Date.now()}-${nextChapterNumber}`,
              chapterNumber: nextChapterNumber,
              title: `Chapter ${nextChapterNumber}: ${parsed.chapter.title || userPrompt.slice(0, 40)}`,
              subtitle: parsed.chapter.subtitle || 'AI Master Knowledge Chapter',
              estimatedReadTime: `${Math.max(4, parsed.chapter.sections.length * 2.5).toFixed(0)} min read`,
              sections: parsed.chapter.sections.map((s: { title?: string; content?: string }, idx: number) => ({
                id: `sec-${nextChapterNumber}-${idx + 1}`,
                title: s.title || `Section ${idx + 1}`,
                level: 2,
                content: s.content || '',
              })),
              summary: parsed.chapter.summary || `Comprehensive synthesis on ${parsed.chapter.title || userPrompt}.`,
            };
          } else {
            newChapter = parseLlmResponseToChapter(rawText, userPrompt.slice(0, 48), nextChapterNumber);
          }

          const placementDesc =
            position === 'TOP'
              ? 'at the top (as Chapter 1)'
              : position === 'BEFORE' && targetChapNum
              ? `before Chapter ${targetChapNum}`
              : position === 'AFTER' && targetChapNum
              ? `after Chapter ${targetChapNum}`
              : 'at the bottom';

          return {
            action: 'CREATE_CHAPTER',
            position,
            targetChapterNumber: targetChapNum,
            chatResponse:
              parsed.chatResponse ||
              `I have synthesized "${newChapter.title}" and placed it ${placementDesc} on your Master Document Canvas.`,
            newChapter,
            thinking,
          };
        }
      }
    } catch {
      // Graceful fallback to heuristic intent parsing
    }
  }
  }

  // 2. Heuristic Intent Engine
  const cleanPrompt = userPrompt.trim().toLowerCase();

  // Heuristic Deletion Engine (e.g. "delete chapter 2", "remove the last chapter", "delete page 3")
  const isDeleteIntent = /^(delete|remove|drop|erase|discard)\b/i.test(cleanPrompt);
  if (isDeleteIntent) {
    let targetChap: number | undefined;
    const matchChap = cleanPrompt.match(/chapter\s*(\d+)/i);
    if (matchChap) {
      targetChap = parseInt(matchChap[1], 10);
    } else if (/last\s*(chapter|page)/i.test(cleanPrompt)) {
      targetChap = Math.max(1, nextChapterNumber - 1);
    } else {
      const matchNum = cleanPrompt.match(/\b(\d+)\b/);
      if (matchNum) targetChap = parseInt(matchNum[1], 10);
    }

    if (targetChap && targetChap >= 1) {
      return {
        action: 'DELETE_CHAPTER',
        targetChapterNumber: targetChap,
        chatResponse: `I have removed Chapter ${targetChap} from your Master Document Canvas and sequentially re-numbered the remaining chapters.`,
      };
    }
  }

  // Casual chat, question, inquiry, or research exploration
  const isGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening|day)|howdy|sup|greetings)\b/i.test(cleanPrompt);
  const isQuestion =
    cleanPrompt.endsWith('?') ||
    /^(what|how|why|who|where|when|can\s*you|could\s*you|is\s*there|tell\s*me|explain|clarify|describe|summarize|compare|differentiate|define|list|give\s*me|show\s*me|help|check)\b/i.test(cleanPrompt);
  const isExplicitNoteCommand =
    /^(write|create|make|generate|synthesize|draft|add|append|insert)\b.*(note|chapter|page|doc)/i.test(cleanPrompt) ||
    /\b(take\s*notes|draft\s*notes|make\s*notes|new\s*page|new\s*chapter)\b/i.test(cleanPrompt);

  if (isGreeting || (isQuestion && !isExplicitNoteCommand)) {
    const rawClean = rawText.replace(/```(?:json)?[\s\S]*?```/g, '').trim();
    return {
      action: 'NONE',
      chatResponse: rawClean || '',
    };
  }

  // 3. Fallback to Chapter creation
  const promptLower = userPrompt.toLowerCase();
  let position: 'TOP' | 'BOTTOM' | 'BEFORE' | 'AFTER' = 'BOTTOM';
  let targetChapNum: number | undefined;
  if (/\b(at\s+(the\s+)?top|at\s+(the\s+)?beginning|prepend|first\s+page|insert\s+first|as\s+chapter\s+1)\b/i.test(promptLower)) {
    position = 'TOP';
  } else if (/\b(before\s+chapter\s*(\d+))\b/i.test(promptLower)) {
    position = 'BEFORE';
    const m = promptLower.match(/before\s+chapter\s*(\d+)/i);
    if (m) targetChapNum = parseInt(m[1], 10);
  } else if (/\b(after\s+chapter\s*(\d+))\b/i.test(promptLower)) {
    position = 'AFTER';
    const m = promptLower.match(/after\s+chapter\s*(\d+)/i);
    if (m) targetChapNum = parseInt(m[1], 10);
  }

  const newChapter = parseLlmResponseToChapter(rawText, userPrompt.slice(0, 48), nextChapterNumber);
  return {
    action: 'CREATE_CHAPTER',
    position,
    targetChapterNumber: targetChapNum,
    chatResponse: `I have synthesized Chapter ${nextChapterNumber}: ${newChapter.title} onto your Master Document Canvas.`,
    newChapter,
  };
}

/**
 * Implements granular document mutations:
 * - Appends or prepends new chapters with automatic sequential re-numbering
 * - Updates specific sections in-place
 * - Updates diagrams without text displacement
 */
export function applyDocumentMutation(
  doc: MasterDocument,
  result: SmartAiParsedResult
): { updatedDocument: MasterDocument; canvasBadge?: CanvasActionBadge } {
  if (result.action === 'NONE') {
    return { updatedDocument: doc };
  }

  if (result.action === 'CREATE_CHAPTER' && result.newChapter) {
    let updatedChapters: DocumentChapter[];

    if (result.position === 'TOP') {
      updatedChapters = [result.newChapter, ...doc.chapters];
    } else if (result.position === 'BEFORE' && result.targetChapterNumber) {
      const idx = doc.chapters.findIndex(
        (c, i) => c.chapterNumber === result.targetChapterNumber || i + 1 === result.targetChapterNumber
      );
      if (idx !== -1) {
        updatedChapters = [...doc.chapters.slice(0, idx), result.newChapter, ...doc.chapters.slice(idx)];
      } else {
        updatedChapters = [...doc.chapters, result.newChapter];
      }
    } else if (result.position === 'AFTER' && result.targetChapterNumber) {
      const idx = doc.chapters.findIndex(
        (c, i) => c.chapterNumber === result.targetChapterNumber || i + 1 === result.targetChapterNumber
      );
      if (idx !== -1) {
        updatedChapters = [...doc.chapters.slice(0, idx + 1), result.newChapter, ...doc.chapters.slice(idx + 1)];
      } else {
        updatedChapters = [...doc.chapters, result.newChapter];
      }
    } else {
      updatedChapters = [...doc.chapters, result.newChapter];
    }

    // Renumber all chapters sequentially so chapterNumber = i + 1 and title reflects "Chapter {i + 1}: ..."
    updatedChapters = updatedChapters.map((ch, idx) => {
      const newNum = idx + 1;
      const cleanTitle = ch.title.replace(/^Chapter\s+\d+:\s*/i, '');
      return {
        ...ch,
        chapterNumber: newNum,
        title: `Chapter ${newNum}: ${cleanTitle}`,
      };
    });

    let totalWords = 0;
    for (const ch of updatedChapters) {
      for (const s of ch.sections) {
        totalWords += s.content.split(/\s+/).filter(Boolean).length;
      }
    }
    const totalSectionsCount = updatedChapters.reduce((acc, c) => acc + c.sections.length, 0);

    const updatedDocument: MasterDocument = {
      ...doc,
      title: doc.chapters.length === 0 ? `${result.newChapter.title.replace(/^Chapter \d+:\s*/, '')} Notes` : doc.title,
      totalChapters: updatedChapters.length,
      totalSections: totalSectionsCount,
      wordCount: totalWords,
      estimatedPages: Math.max(1, totalSectionsCount),
      updatedAt: 'Just now',
      chapters: updatedChapters,
    };

    let badgeType: CanvasActionBadge['type'] = 'created';
    let badgeChapterNum = result.newChapter.chapterNumber;
    let badgeLabel = `Created Chapter ${result.newChapter.chapterNumber}: ${result.newChapter.title.replace(/^Chapter \d+:\s*/, '')}`;

    if (result.position === 'TOP') {
      badgeType = 'inserted_top';
      badgeChapterNum = 1;
      badgeLabel = `Added Chapter 1 at Top: ${result.newChapter.title.replace(/^Chapter \d+:\s*/, '')}`;
    } else if (result.position === 'BOTTOM') {
      badgeType = 'inserted_bottom';
      badgeChapterNum = updatedChapters.length;
      badgeLabel = `Appended Chapter ${updatedChapters.length} at Bottom: ${result.newChapter.title.replace(/^Chapter \d+:\s*/, '')}`;
    }

    return {
      updatedDocument,
      canvasBadge: {
        type: badgeType,
        chapterNumber: badgeChapterNum,
        label: badgeLabel,
      },
    };
  }

  if (result.action === 'UPDATE_SECTION') {
    const targetChapNum = result.targetChapterNumber || 1;
    const targetSecIdx = result.targetSectionIndex ?? 0;
    const patchContent = result.patchContent || '';

    let found = false;
    let targetSectionTitle = '';
    const updatedChapters = doc.chapters.map((ch, i) => {
      const match = ch.chapterNumber === targetChapNum || i + 1 === targetChapNum;
      if (!match) return ch;

      const updatedSections = ch.sections.map((sec, si) => {
        if (si !== targetSecIdx && !(ch.sections.length === 1 && si === 0)) return sec;
        found = true;
        targetSectionTitle = sec.title;

        let newContent = sec.content;
        if (result.patchType === 'REPLACE') {
          newContent = patchContent;
        } else {
          newContent = `${sec.content}\n\n${patchContent}`;
        }
        return {
          ...sec,
          content: newContent,
        };
      });

      return {
        ...ch,
        sections: updatedSections,
      };
    });

    if (!found && updatedChapters.length > 0) {
      const lastCh = updatedChapters[updatedChapters.length - 1];
      if (lastCh && lastCh.sections.length > 0) {
        const lastSec = lastCh.sections[lastCh.sections.length - 1];
        lastSec.content += `\n\n${patchContent}`;
        targetSectionTitle = lastSec.title;
      }
    }

    let totalWords = 0;
    for (const ch of updatedChapters) {
      for (const s of ch.sections) {
        totalWords += s.content.split(/\s+/).filter(Boolean).length;
      }
    }
    const totalSectionsCount = updatedChapters.reduce((acc, c) => acc + c.sections.length, 0);

    const updatedDocument: MasterDocument = {
      ...doc,
      totalSections: totalSectionsCount,
      wordCount: totalWords,
      estimatedPages: Math.max(1, totalSectionsCount),
      updatedAt: 'Just now',
      chapters: updatedChapters,
    };

    return {
      updatedDocument,
      canvasBadge: {
        type: 'updated',
        chapterNumber: targetChapNum,
        sectionIndex: targetSecIdx,
        label: `Updated Chapter ${targetChapNum}: ${targetSectionTitle || `Section ${targetSecIdx + 1}`}`,
      },
    };
  }

  if (result.action === 'UPDATE_DIAGRAM' && result.diagram) {
    const targetChapNum = result.targetChapterNumber || 1;
    const updatedChapters = doc.chapters.map((ch, i) => {
      const match = ch.chapterNumber === targetChapNum || i + 1 === targetChapNum;
      if (!match) return ch;

      const updatedSections = ch.sections.map((sec, si) => {
        if (si === 1 || (ch.sections.length === 1 && si === 0)) {
          let cleanContent = sec.content.replace(/```mermaid[\s\S]*?```/g, '').trim();
          cleanContent += `\n\n\`\`\`mermaid\n${result.diagram!.code}\n\`\`\``;
          return {
            ...sec,
            content: cleanContent,
            diagrams: [result.diagram!],
          };
        }
        return sec;
      });

      return {
        ...ch,
        sections: updatedSections,
      };
    });

    const updatedDocument: MasterDocument = {
      ...doc,
      updatedAt: 'Just now',
      chapters: updatedChapters,
    };

    return {
      updatedDocument,
      canvasBadge: {
        type: 'diagram',
        chapterNumber: targetChapNum,
        label: `Updated Diagram in Chapter ${targetChapNum}`,
      },
    };
  }

  if (result.action === 'DELETE_CHAPTER') {
    const targetChapNum = result.targetChapterNumber || doc.chapters.length;
    let deletedChapterTitle = '';
    let found = false;

    let updatedChapters: DocumentChapter[];

    if (result.targetSectionIndex !== undefined) {
      // Delete a specific section/page within the chapter
      updatedChapters = doc.chapters
        .map((ch, i) => {
          const match = ch.chapterNumber === targetChapNum || i + 1 === targetChapNum;
          if (!match) return ch;

          deletedChapterTitle = ch.title;
          found = true;
          const filteredSections = ch.sections.filter((_, si) => si !== result.targetSectionIndex);
          return {
            ...ch,
            sections: filteredSections,
          };
        })
        .filter((ch) => ch.sections.length > 0);
    } else {
      // Delete the entire chapter
      updatedChapters = doc.chapters.filter((ch, i) => {
        const match = ch.chapterNumber === targetChapNum || i + 1 === targetChapNum;
        if (match) {
          deletedChapterTitle = ch.title;
          found = true;
          return false;
        }
        return true;
      });
    }

    // Renumber all remaining chapters sequentially
    updatedChapters = updatedChapters.map((ch, idx) => {
      const newNum = idx + 1;
      const cleanTitle = ch.title.replace(/^Chapter\s+\d+:\s*/i, '');
      return {
        ...ch,
        chapterNumber: newNum,
        title: `Chapter ${newNum}: ${cleanTitle}`,
      };
    });

    let totalWords = 0;
    for (const ch of updatedChapters) {
      for (const s of ch.sections) {
        totalWords += s.content.split(/\s+/).filter(Boolean).length;
      }
    }
    const totalSectionsCount = updatedChapters.reduce((acc, c) => acc + c.sections.length, 0);

    const updatedDocument: MasterDocument = {
      ...doc,
      totalChapters: updatedChapters.length,
      totalSections: totalSectionsCount,
      wordCount: totalWords,
      estimatedPages: Math.max(1, totalSectionsCount),
      updatedAt: 'Just now',
      chapters: updatedChapters,
    };

    return {
      updatedDocument,
      canvasBadge: {
        type: 'deleted',
        chapterNumber: targetChapNum,
        label: found
          ? `Deleted Chapter ${targetChapNum}: ${deletedChapterTitle.replace(/^Chapter \d+:\s*/, '')}`
          : `Removed from Master Document`,
      },
    };
  }

  if (result.action === 'REVISE_NOTES' && result.newChapter) {
    const targetChapNum = result.targetChapterNumber || 1;
    const updatedChapters = doc.chapters.map((ch, i) => {
      const match = ch.chapterNumber === targetChapNum || i + 1 === targetChapNum;
      if (!match) return ch;
      return {
        ...result.newChapter!,
        chapterNumber: ch.chapterNumber,
        title: `Chapter ${ch.chapterNumber}: ${result.newChapter!.title.replace(/^Chapter\s+\d+:\s*/i, '')}`,
      };
    });

    let totalWords = 0;
    for (const ch of updatedChapters) {
      for (const s of ch.sections) {
        totalWords += s.content.split(/\s+/).filter(Boolean).length;
      }
    }
    const totalSectionsCount = updatedChapters.reduce((acc, c) => acc + c.sections.length, 0);

    const updatedDocument: MasterDocument = {
      ...doc,
      totalSections: totalSectionsCount,
      wordCount: totalWords,
      estimatedPages: Math.max(1, totalSectionsCount),
      updatedAt: 'Just now',
      chapters: updatedChapters,
    };

    return {
      updatedDocument,
      canvasBadge: {
        type: 'revised',
        chapterNumber: targetChapNum,
        label: `Revised Chapter ${targetChapNum}: ${result.newChapter.title.replace(/^Chapter \d+:\s*/, '')}`,
      },
    };
  }

  return { updatedDocument: doc };
}

/**
 * Produces deep, insightful conversational responses directly in the chat feed
 * for research questions, concept explanations, and source analysis.
 */
export function generateSmartConversationalResponse(
  userPrompt: string,
  sources: SourceFile[] = [],
  _currentDoc?: MasterDocument
): { response: string; thinking: string } {
  const p = userPrompt.trim().toLowerCase();

  // 1. Check for questions asking about attached files/sources
  if (p.includes('topic') || p.includes('list') || p.includes('pdf') || p.includes('source') || p.includes('file') || p.includes('summarize')) {
    if (sources.length > 0) {
      const sourceList = sources.map((s, idx) => `**${idx + 1}. ${s.name}** (${(s.size / 1024).toFixed(1)} KB)`).join('\n');
      const topicsExtracted: string[] = [];
      sources.forEach((s) => {
        const lines = s.content.split('\n').filter((l) => l.trim().startsWith('#') || l.trim().startsWith('-') || /^\d+\./.test(l.trim()));
        if (lines.length > 0) {
          topicsExtracted.push(...lines.slice(0, 8).map((l) => l.replace(/^#+\s*|-+\s*|\d+\.\s*/, '').trim()));
        }
      });

      const uniqueTopics = Array.from(new Set(topicsExtracted)).filter((t) => t.length > 3 && t.length < 60).slice(0, 10);

      const topicMarkdown = uniqueTopics.length > 0
        ? `\n\n### Key Topics Identified in Sources:\n` + uniqueTopics.map((t) => `- ${t}`).join('\n')
        : '';

      return {
        thinking: `Inspected ${sources.length} attached knowledge sources and extracted topical breakdown.`,
        response: `Here are the knowledge sources attached to this workspace:\n\n${sourceList}${topicMarkdown}\n\nWould you like me to synthesize structured master notes or generate architecture diagrams for any of these specific topics?`,
      };
    }
  }

  // 2. Check for Operating Systems concepts
  if (p.includes('process') && p.includes('thread')) {
    return {
      thinking: `Detected query comparing Processes vs Threads. Formulating OS first-principles comparison matrix and concurrency invariants.`,
      response: `### Process vs. Thread: Core Architectural Distinctions

In modern operating systems, the fundamental distinction between a **Process** and a **Thread** centers on resource ownership versus execution scheduling.

| Property | Process | Thread (Lightweight Process) |
| :--- | :--- | :--- |
| **Address Space** | Isolated private address space (Text, Data, Heap, Stack). | Shares address space, global variables, and open file descriptors with sibling threads. |
| **Creation Overhead** | High (calls \`fork()\` / \`CreateProcess()\`, allocates PCB, sets up page tables). | Low (calls \`pthread_create()\` / \`clone()\`, allocates only private stack & registers). |
| **Context Switching** | Expensive (invalidates TLB, flushes CPU caches, changes CR3 register). | Inexpensive (no page table swap; TLB remains valid for the address space). |
| **Communication** | Inter-Process Communication (**IPC** required: pipes, sockets, shared memory). | Direct shared memory access (requires synchronization: mutexes, semaphores). |
| **Fault Isolation** | Complete: a crash in one process does not terminate others. | Shared: a segfault in one thread typically terminates the entire host process. |

> **Key Takeaway**: Processes provide **fault isolation and memory boundaries**, whereas Threads maximize **computational concurrency and low-overhead communication** within a shared address space.`,
    };
  }

  if (p.includes('paging') || p.includes('virtual memory') || p.includes('page table') || p.includes('tlb')) {
    return {
      thinking: `Detected Virtual Memory and Memory Management query. Structuring hardware translation flow and page fault mechanics.`,
      response: `### Virtual Memory & Paging: Hardware Architecture & Translation

Virtual Memory decouples a process's logical address space from physical DRAM, providing contiguous addressability, memory protection, and transparent secondary storage caching.

#### 1. The Two-Level Address Translation Flow:
1. **Logical Address**: Split by the MMU into a **Virtual Page Number (VPN)** and an **Offset**.
2. **TLB Lookup (Hardware Cache)**: The Memory Management Unit queries the **Translation Lookaside Buffer (TLB)** in parallel.
   - **TLB Hit** (~1 CPU cycle): Instantly maps VPN $\\rightarrow$ Physical Frame Number (PFN).
   - **TLB Miss** (~10–100 cycles): The hardware page-table walker traverses the multi-level page table hierarchy in DRAM.
3. **Physical Address**: Formed by concatenating $\\text{PFN} \\parallel \\text{Offset}$.

#### 2. The Page Fault Lifecycle:
If the **Valid/Present bit** is \`0\` in the Page Table Entry (PTE):
1. **CPU Trap**: Triggers an architectural interrupt vector (\`Page Fault Exception\`, e.g., Vector 14 on x86).
2. **OS Handler**: The kernel saves register state, checks VMA bounds in the PCB, and allocates a physical DRAM frame.
3. **I/O Fetch**: Reads the missing page block from the backing store (Swap space / SSD) via DMA.
4. **PTE Update & Restart**: Updates PTE with PFN, marks Present bit $= 1$, flushes the TLB, and resumes the faulting instruction seamlessly.

Would you like me to generate a permanent chapter on **Virtual Memory Architectures** on your Master Document Canvas?`,
    };
  }

  if (p.includes('schedul') || p.includes('cpu schedul') || p.includes('round robin') || p.includes('sjf') || p.includes('fcfs')) {
    return {
      thinking: `Detected CPU Scheduling query. Formulating comparison of turnaround, response time, and preemptive policies.`,
      response: `### CPU Scheduling Algorithms & Tradeoffs

The CPU scheduler determines which runnable process receives CPU time when the active thread yields, blocks on I/O, or its time slice expires.

#### Comparison Matrix:
| Algorithm | Type | Advantages | Drawbacks / Failure Modes |
| :--- | :--- | :--- | :--- |
| **FCFS** (First-Come, First-Served) | Non-preemptive | Simple, zero queue management overhead. | **Convoy Effect**: Short jobs wait behind long I/O-bound tasks. |
| **SJF / SRTF** (Shortest Job First) | Optimal turnaround | Provably minimizes average wait time $\\bar{W}$. | Starvation of long bursts; requires predicting CPU burst length $\\tau_{n+1} = \\alpha t_n + (1-\\alpha)\\tau_n$. |
| **Round Robin (RR)** | Preemptive | Excellent responsiveness for interactive tasks. | High context switch overhead if time quantum $q$ is too small; degrades to FCFS if $q \\to \\infty$. |
| **MLFQ** (Multi-Level Feedback Queue) | Adaptive preemptive | Approximates shortest job first dynamically without prior knowledge. | Complex priority decay tuning; potential starvation without periodic priority boosting. |

Would you like to draft an adaptive chapter on **Process Scheduling & Real-Time Kernels** on your notes canvas?`,
    };
  }

  if (p.includes('deadlock') || p.includes('banker') || p.includes('mutex') || p.includes('semaphore') || p.includes('concurrency')) {
    return {
      thinking: `Detected Synchronization & Deadlock query. Formulating Coffman conditions and prevention strategies.`,
      response: `### Concurrency Control & The 4 Coffman Conditions of Deadlock

A **Deadlock** is a permanent stall state in a set of processes where every process holds a resource and waits for another resource held by another process in the cycle.

#### The 4 Necessary and Sufficient Coffman Conditions:
1. **Mutual Exclusion**: At least one resource must be non-shareable.
2. **Hold and Wait**: A process holds at least one resource while requesting additional resources.
3. **No Preemption**: Resources cannot be forcibly revoked from a process; they must be released voluntarily.
4. **Circular Wait**: A closed chain $P_0 \\to R_1 \\to P_1 \\dots \\to R_0 \\to P_0$ exists.

> **Architectural Resolution**: Eliminating any *one* of the four conditions completely prevents deadlock. The most common engineering pattern is imposing a strict **global resource ordering hierarchy** ($R_1 < R_2 < R_3$) to break the circular wait condition.`,
    };
  }

  // 3. Machine Learning & Mathematics
  if (p.includes('loss') || p.includes('backprop') || p.includes('gradient') || p.includes('transformer') || p.includes('attention') || p.includes('adam')) {
    return {
      thinking: `Detected Deep Learning / Machine Learning query. Formulating mathematical mechanics and architectural summary.`,
      response: `### First-Principles Breakdown: Core Learning Dynamics

In machine learning and neural architectures, optimization represents navigation across a high-dimensional empirical risk surface:
$$\\theta^* = \\arg\\min_\\theta \\frac{1}{N} \\sum_{i=1}^N \\mathcal{L}(f(x_i; \\theta), y_i) + \\lambda \\|\\theta\\|^2$$

#### Core Computational Mechanics:
- **Gradient Backpropagation**: Propagates error signals backward through the computational graph using the multi-variable chain rule:
  $$\\frac{\\partial \\mathcal{L}}{\\partial W_l} = \\delta_l \\cdot (a_{l-1})^T, \\quad \\delta_l = (W_{l+1}^T \\delta_{l+1}) \\odot \\sigma'(z_l)$$
- **Attention Scaling**: In transformers, self-attention maps inputs to queries, keys, and values with scaled dot-product routing:
  $$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$
  The $\\sqrt{d_k}$ scaling prevents softmax gradients from vanishing in high-dimensional projection spaces.

Would you like me to create an architectural chapter with flowcharts on this on your canvas?`,
    };
  }

  // 4. General Helpful Conversational Response
  return {
    thinking: `Providing structured, pedagogical response to user research inquiry.`,
    response: `### Knowledge Analysis: ${userPrompt.replace(/[?.]/g, '')}

Here is a concise breakdown of the core principles:

1. **Foundational Mechanics**: Complex technical systems are governed by clear state transitions, resource boundaries, and computational invariants.
2. **Operational Tradeoffs**: Optimizations that decrease latency often require caching and increased memory consumption, whereas isolation guarantees increase context-switching overhead.
3. **System Invariant**: Keeping state mutations deterministic and isolated ensures fault tolerance and predictable scalability.

Feel free to ask me to drill into any specific facet, or ask me to **"write notes on this"** to compile a permanent chapter onto your Master Document Canvas!`,
  };
}

