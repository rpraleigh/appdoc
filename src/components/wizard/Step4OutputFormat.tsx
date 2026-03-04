'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { WizardState, OutputFormat } from '@/types';

interface Step4OutputFormatProps {
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const FORMAT_OPTIONS: { value: OutputFormat; label: string; description: string }[] = [
  { value: 'md', label: 'Markdown (.md)', description: 'Plain text with markdown syntax — works with GitHub, Notion, Confluence, and most docs tools.' },
  { value: 'html', label: 'HTML (.html)', description: 'Self-contained HTML file with basic styling — open directly in any browser.' },
  { value: 'pdf', label: 'PDF (.pdf)', description: 'Print-ready PDF generated from the rendered HTML in your browser.' },
];

export function Step4OutputFormat({ state, onUpdate, onNext, onBack }: Step4OutputFormatProps) {
  const { outputFormats, embedScreenshots, uploadedScreens, uiInputMode } = state;

  function toggleFormat(format: OutputFormat) {
    if (outputFormats.includes(format)) {
      // Don't allow deselecting the last one
      if (outputFormats.length === 1) return;
      onUpdate({ outputFormats: outputFormats.filter((f) => f !== format) });
    } else {
      onUpdate({ outputFormats: [...outputFormats, format] });
    }
  }

  const hasScreenshots = uiInputMode === 'upload' && uploadedScreens.length > 0;
  const canEmbedScreenshots = hasScreenshots && (outputFormats.includes('html') || outputFormats.includes('pdf'));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Step 4: Output Format</h2>
        <p className="text-sm text-gray-500 mt-1">Choose the formats you want to download after generation.</p>
      </div>

      <Card>
        <h3 className="text-base font-semibold text-gray-800 mb-4">Export Formats</h3>
        <div className="space-y-3">
          {FORMAT_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={outputFormats.includes(opt.value)}
                onChange={() => toggleFormat(opt.value)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 accent-blue-600"
              />
              <div>
                <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700">
                  {opt.label}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
        {outputFormats.length === 0 && (
          <p className="text-xs text-red-500 mt-2">Select at least one format.</p>
        )}
      </Card>

      {/* Screenshot embedding option */}
      {hasScreenshots && (
        <Card>
          <h3 className="text-base font-semibold text-gray-800 mb-3">Screenshot Embedding</h3>
          <label className={`flex items-start gap-3 ${canEmbedScreenshots ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
            <input
              type="checkbox"
              checked={embedScreenshots && canEmbedScreenshots}
              disabled={!canEmbedScreenshots}
              onChange={(e) => onUpdate({ embedScreenshots: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 accent-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-800">
                Embed screenshots in HTML / PDF output
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Appends your {uploadedScreens.length} uploaded screenshot{uploadedScreens.length > 1 ? 's' : ''} as an appendix in HTML and PDF documents.
                {!canEmbedScreenshots && ' (Requires HTML or PDF format selected.)'}
              </p>
            </div>
          </label>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} disabled={outputFormats.length === 0}>
          Next: Generate →
        </Button>
      </div>
    </div>
  );
}
