'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { randomUUID } from '@/lib/utils';
import { DEFAULT_PROMPT_TEMPLATE } from '@/lib/claude';
import type { WizardState, Audience } from '@/types';

interface Step3Props {
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

function AudienceCard({
  audience,
  index,
  showRemove,
  onUpdate,
  onRemove,
}: {
  audience: Audience;
  index: number;
  showRemove: boolean;
  onUpdate: (patch: Partial<Audience>) => void;
  onRemove: () => void;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const hasCustomPrompt = audience.customPrompt !== undefined;

  const previewPrompt = (audience.customPrompt ?? DEFAULT_PROMPT_TEMPLATE).replace(
    /\{audience\}/g,
    audience.name || 'this audience'
  );

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Audience {index + 1}</span>
        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-400 hover:text-red-600 text-sm"
          >
            Remove
          </button>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <Label>Name</Label>
          <Input
            placeholder="e.g. End Users, Developers, Executives"
            value={audience.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Textarea
            rows={2}
            placeholder="Brief description of this audience's technical level, goals, etc."
            value={audience.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
          />
        </div>

        {/* Prompt editor */}
        <div>
          <button
            type="button"
            onClick={() => setShowPrompt((p) => !p)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <span>{showPrompt ? '▾' : '▸'}</span>
            {hasCustomPrompt ? 'Custom prompt (edited)' : 'Edit generation prompt'}
          </button>

          {showPrompt && (
            <div className="mt-2 space-y-2">
              <Textarea
                rows={8}
                className="font-mono text-xs"
                value={audience.customPrompt ?? DEFAULT_PROMPT_TEMPLATE}
                onChange={(e) => onUpdate({ customPrompt: e.target.value })}
                placeholder={DEFAULT_PROMPT_TEMPLATE}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Use <code className="bg-gray-100 px-1 rounded">{'{audience}'}</code> as a placeholder for the audience name.
                </p>
                {hasCustomPrompt && (
                  <button
                    type="button"
                    onClick={() => onUpdate({ customPrompt: undefined })}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Revert to default
                  </button>
                )}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">Preview (with audience name substituted):</p>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">{previewPrompt}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function Step3Audiences({ state, onUpdate, onNext, onBack }: Step3Props) {
  const { audiences, generationMode } = state;

  function addAudience() {
    onUpdate({
      audiences: [
        ...audiences,
        { id: randomUUID(), name: '', description: '' },
      ],
    });
  }

  function updateAudience(idx: number, patch: Partial<Audience>) {
    const next = [...audiences];
    next[idx] = { ...next[idx], ...patch };
    onUpdate({ audiences: next });
  }

  function removeAudience(idx: number) {
    onUpdate({ audiences: audiences.filter((_, i) => i !== idx) });
  }

  const allValid = audiences.length > 0 && audiences.every((a) => a.name.trim());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Step 3: Audiences</h2>
        <p className="text-sm text-gray-500 mt-1">Define who will read the documentation. Optionally customize the generation prompt per audience.</p>
      </div>

      <div className="space-y-3">
        {audiences.map((audience, idx) => (
          <AudienceCard
            key={audience.id}
            audience={audience}
            index={idx}
            showRemove={audiences.length > 1}
            onUpdate={(patch) => updateAudience(idx, patch)}
            onRemove={() => removeAudience(idx)}
          />
        ))}
      </div>

      <Button variant="secondary" onClick={addAudience}>
        + Add Audience
      </Button>

      {audiences.length >= 2 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Generation Mode</h3>
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="genMode"
                value="per-audience"
                checked={generationMode === 'per-audience'}
                onChange={() => onUpdate({ generationMode: 'per-audience' })}
                className="mt-0.5 text-blue-600"
              />
              <div>
                <span className="text-sm font-medium">One doc per audience</span>
                <p className="text-xs text-gray-500">Generates a separate document tailored to each audience.</p>
              </div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="genMode"
                value="combined"
                checked={generationMode === 'combined'}
                onChange={() => onUpdate({ generationMode: 'combined' })}
                className="mt-0.5 text-blue-600"
              />
              <div>
                <span className="text-sm font-medium">Single combined doc</span>
                <p className="text-xs text-gray-500">Generates one document that addresses all audiences.</p>
              </div>
            </label>
          </div>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} disabled={!allValid}>
          Next: Output Format →
        </Button>
      </div>
    </div>
  );
}
