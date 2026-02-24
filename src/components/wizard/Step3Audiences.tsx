'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { randomUUID } from '@/lib/utils';
import type { WizardState, Audience } from '@/types';

interface Step3Props {
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
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
        <p className="text-sm text-gray-500 mt-1">Define who will read the documentation.</p>
      </div>

      <div className="space-y-3">
        {audiences.map((audience, idx) => (
          <Card key={audience.id}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Audience {idx + 1}</span>
              {audiences.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAudience(idx)}
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
                  onChange={(e) => updateAudience(idx, { name: e.target.value })}
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  rows={2}
                  placeholder="Brief description of this audience's technical level, goals, etc."
                  value={audience.description}
                  onChange={(e) => updateAudience(idx, { description: e.target.value })}
                />
              </div>
            </div>
          </Card>
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
          Next: Generate →
        </Button>
      </div>
    </div>
  );
}
