'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { downloadMarkdown, downloadHtml } from '@/lib/utils';
import type { GeneratedDoc, OutputFormat, UploadedScreen } from '@/types';

interface Step6Props {
  docs: GeneratedDoc[];
  appName: string;
  outputFormats: OutputFormat[];
  embedScreenshots: boolean;
  uploadedScreens: UploadedScreen[];
  onReset: () => void;
}

function buildHtmlDocument(
  title: string,
  bodyHtml: string,
  screens: UploadedScreen[],
  embedScreenshots: boolean
): string {
  const screensSection =
    embedScreenshots && screens.length > 0
      ? `<hr/><h2>Screenshots</h2>` +
        screens
          .map(
            (s) =>
              `<figure><figcaption>${s.name}</figcaption><img src="${s.base64}" alt="${s.name}" style="max-width:100%;border:1px solid #e5e7eb;border-radius:4px;margin:8px 0;"/></figure>`
          )
          .join('\n')
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 860px; margin: 0 auto; padding: 2rem; color: #1f2937; line-height: 1.6; }
    h1,h2,h3,h4 { color: #111827; margin-top: 1.5em; }
    code { background: #f3f4f6; padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.9em; }
    pre { background: #1f2937; color: #f9fafb; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f9fafb; }
    blockquote { border-left: 4px solid #e5e7eb; margin: 0; padding-left: 1rem; color: #6b7280; }
    a { color: #2563eb; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
    figure { margin: 1rem 0; }
    figcaption { font-size: 0.85em; color: #6b7280; margin-bottom: 4px; }
  </style>
</head>
<body>
${bodyHtml}
${screensSection}
</body>
</html>`;
}

export function Step6Output({
  docs,
  appName,
  outputFormats,
  embedScreenshots,
  uploadedScreens,
  onReset,
}: Step6Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const current = docs[activeTab];

  function slug(audienceName: string) {
    return audienceName.toLowerCase().replace(/\s+/g, '-');
  }

  async function copyToClipboard() {
    if (!current) return;
    await navigator.clipboard.writeText(current.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadMd() {
    if (!current) return;
    downloadMarkdown(`${appName}-${slug(current.audienceName)}-docs`, current.markdown);
  }

  function downloadAsHtml() {
    if (!current || !previewRef.current) return;
    const bodyHtml = previewRef.current.innerHTML;
    const title = `${appName} — ${current.audienceName} Documentation`;
    const html = buildHtmlDocument(title, bodyHtml, uploadedScreens, embedScreenshots);
    downloadHtml(`${appName}-${slug(current.audienceName)}-docs`, html);
  }

  async function downloadAsPdf() {
    if (!current || !previewRef.current) return;

    // Build a temporary container with full content (including screenshots if opted in)
    const container = document.createElement('div');
    container.style.cssText = 'font-family:system-ui,-apple-system,sans-serif;max-width:860px;padding:2rem;color:#1f2937;line-height:1.6;';
    container.innerHTML = previewRef.current.innerHTML;

    if (embedScreenshots && uploadedScreens.length > 0) {
      const hr = document.createElement('hr');
      hr.style.cssText = 'border:none;border-top:1px solid #e5e7eb;margin:2rem 0;';
      container.appendChild(hr);
      const heading = document.createElement('h2');
      heading.textContent = 'Screenshots';
      container.appendChild(heading);
      for (const screen of uploadedScreens) {
        const fig = document.createElement('figure');
        const cap = document.createElement('figcaption');
        cap.textContent = screen.name;
        cap.style.cssText = 'font-size:0.85em;color:#6b7280;margin-bottom:4px;';
        const img = document.createElement('img');
        img.src = screen.base64;
        img.alt = screen.name;
        img.style.cssText = 'max-width:100%;border:1px solid #e5e7eb;border-radius:4px;';
        fig.appendChild(cap);
        fig.appendChild(img);
        container.appendChild(fig);
      }
    }

    document.body.appendChild(container);

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const filename = `${appName}-${slug(current.audienceName)}-docs.pdf`;
      await html2pdf()
        .set({
          margin: [12, 15],
          filename,
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(container)
        .save();
    } finally {
      document.body.removeChild(container);
    }
  }

  if (!docs.length) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Step 6: Output</h2>
          <p className="text-sm text-gray-500 mt-1">Your documentation is ready.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Start Over
        </Button>
      </div>

      {/* Tab bar */}
      {docs.length > 1 && (
        <div className="border-b border-gray-200 flex gap-1">
          {docs.map((doc, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === i
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {doc.audienceName}
              {doc.streaming && <span className="ml-1 text-xs text-amber-500">(streaming)</span>}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={copyToClipboard}>
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </Button>
        {outputFormats.includes('md') && (
          <Button variant="secondary" size="sm" onClick={downloadMd}>
            Download .md
          </Button>
        )}
        {outputFormats.includes('html') && (
          <Button variant="secondary" size="sm" onClick={downloadAsHtml}>
            Download .html
          </Button>
        )}
        {outputFormats.includes('pdf') && (
          <Button variant="secondary" size="sm" onClick={downloadAsPdf}>
            Download .pdf
          </Button>
        )}
      </div>

      {/* Preview */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white min-h-64">
        {current?.streaming ? (
          <pre className="text-xs text-gray-700 whitespace-pre-wrap">{current.markdown}</pre>
        ) : (
          <div ref={previewRef}>
            <MarkdownPreview content={current?.markdown ?? ''} />
          </div>
        )}
      </div>
    </div>
  );
}
