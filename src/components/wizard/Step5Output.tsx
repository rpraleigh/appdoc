'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { downloadMarkdown } from '@/lib/utils';
import type { GeneratedDoc } from '@/types';

interface Step5Props {
  docs: GeneratedDoc[];
  appName: string;
  onReset: () => void;
}

export function Step5Output({ docs, appName, onReset }: Step5Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const current = docs[activeTab];

  async function copyToClipboard() {
    if (!current) return;
    await navigator.clipboard.writeText(current.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    if (!current) return;
    const slug = current.audienceName.toLowerCase().replace(/\s+/g, '-');
    downloadMarkdown(`${appName}-${slug}-docs`, current.markdown);
  }

  if (!docs.length) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Step 5: Output</h2>
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
        <Button variant="secondary" size="sm" onClick={download}>
          Download .md
        </Button>
      </div>

      {/* Preview */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white min-h-64">
        {current?.streaming ? (
          <pre className="text-xs text-gray-700 whitespace-pre-wrap">{current.markdown}</pre>
        ) : (
          <MarkdownPreview content={current?.markdown ?? ''} />
        )}
      </div>
    </div>
  );
}
