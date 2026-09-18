import React, { useState } from 'react';
import { Printer, FileText, Sparkles, BookOpen, Globe } from 'lucide-react';
import { MasterDocument } from '../types';
import { exportDocumentToMarkdown, generatePrintableDocumentHtml } from '../utils/documentGenerator';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { triggerCelebration, triggerMicroBurst } from './ui/particle-burst';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: MasterDocument;
  projectName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  document,
  projectName,
}) => {
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [exportFont, setExportFont] = useState<'kalam' | 'caveat' | 'patrick' | 'sans'>('kalam');
  const [includeTOC, setIncludeTOC] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleExportPDF = async (e?: React.MouseEvent) => {
    setIsExporting(true);
    setExportStatus('Compiling high-resolution ruled notes...');

    try {
      const html = generatePrintableDocumentHtml(document, {
        font: exportFont,
        pageSize,
      });

      if (window.electronAPI?.exportDocumentPDF) {
        setExportStatus('Generating clean multi-page PDF with handwritten notes & diagrams...');
        const result = await window.electronAPI.exportDocumentPDF({
          htmlContent: html,
          pageSize,
          defaultPath: `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-master-notes.pdf`,
        });

        if (result.success) {
          if (e) triggerMicroBurst(e.clientX, e.clientY, '#10b981');
          triggerCelebration();
          setExportStatus(`Saved successfully to ${result.filePath}`);
          setTimeout(() => {
            setIsExporting(false);
            onClose();
          }, 1800);
          return;
        } else if (result.canceled) {
          setIsExporting(false);
          setExportStatus(null);
          return;
        } else if (result.error) {
          throw new Error(result.error);
        }
      }

      // Browser fallback: trigger printable window with formatted notebook
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      }
      setIsExporting(false);
      setExportStatus(null);
    } catch (err: unknown) {
      console.error('PDF export error:', err);
      setExportStatus(err instanceof Error ? err.message : 'Export failed.');
      setIsExporting(false);
    }
  };

  const handlePrintPreview = () => {
    const html = generatePrintableDocumentHtml(document, {
      font: exportFont,
      pageSize,
    });
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }
  };

  const handleDownloadHtml = (e?: React.MouseEvent) => {
    if (e) triggerMicroBurst(e.clientX, e.clientY, '#2563eb');
    const html = generatePrintableDocumentHtml(document, {
      font: exportFont,
      pageSize,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-notes.html`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = (e?: React.MouseEvent) => {
    if (e) triggerMicroBurst(e.clientX, e.clientY, '#2563eb');
    triggerCelebration();
    const md = exportDocumentToMarkdown(document);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-notes.md`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Printer size={16} />
          </div>
          <div>
            <h2 className="text-[14.5px] font-semibold text-slate-900 dark:text-slate-100">
              Export Master Document
            </h2>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-normal">
              Publish print-ready notebook notes with embedded diagrams
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-5 text-[13px]">
        {/* Document Overview Summary Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 shadow-2xs">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-[13.5px]">
                {document.title}
              </h3>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                {document.chapters.length} Chapters • {document.wordCount.toLocaleString()} Words • High-Res Vector Blueprints
              </p>
            </div>
          </div>
        </div>

        {/* Script Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
            1. Select Handwritten Script
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { id: 'kalam', title: 'Kalam', desc: 'Ink Pen' },
                { id: 'caveat', title: 'Caveat', desc: 'Flowing cursive' },
                { id: 'patrick', title: 'Patrick', desc: 'Felt Marker' },
                { id: 'sans', title: 'Sans-Serif', desc: 'Clean Modern' },
              ] as const
            ).map((font) => (
              <div
                key={font.id}
                onClick={() => setExportFont(font.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  exportFont === font.id
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="text-xs font-bold block">{font.title}</span>
                <span className="text-[10px] text-slate-400">{font.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Layout & Paper Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
            2. Page Size & Options
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div
              onClick={() => setPageSize('A4')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                pageSize === 'A4'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-xs font-bold block">A4 Standard</span>
              <span className="text-[10.5px] text-slate-400">210 × 297 mm (Ruled Notebook)</span>
            </div>

            <div
              onClick={() => setPageSize('Letter')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                pageSize === 'Letter'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-xs font-bold block">US Letter</span>
              <span className="text-[10.5px] text-slate-400">8.5 × 11 inches</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={includeTOC}
              onChange={(e) => setIncludeTOC(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Include Table of Contents at the beginning</span>
          </label>
        </div>

        {exportStatus && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
            <Sparkles size={14} className="text-blue-600 shrink-0" />
            <span>{exportStatus}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadMarkdown}
              title="Download raw markdown file"
            >
              <FileText size={13} className="mr-1.5" />
              <span>Markdown (.md)</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadHtml}
              title="Download standalone HTML with embedded styles"
            >
              <Globe size={13} className="mr-1.5" />
              <span>HTML (.html)</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrintPreview}>
              <Printer size={13} className="mr-1.5" />
              <span>System Print</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              <Printer size={13} className="mr-1.5" />
              <span>{isExporting ? 'Exporting...' : 'Export Ruled PDF'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default ExportModal;