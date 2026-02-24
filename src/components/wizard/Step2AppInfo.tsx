'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import type { WizardState } from '@/types';

interface Step2Props {
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2AppInfo({ state, onUpdate, onNext, onBack }: Step2Props) {
  const { appName, appDescription } = state;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Step 2: App Info</h2>
        <p className="text-sm text-gray-500 mt-1">Tell Claude about your application.</p>
      </div>

      <Card>
        <div className="space-y-4">
          <div>
            <Label htmlFor="app-name">Application Name</Label>
            <Input
              id="app-name"
              placeholder="e.g. EMPREP Portal"
              value={appName}
              onChange={(e) => onUpdate({ appName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="app-desc">Description</Label>
            <Textarea
              id="app-desc"
              rows={5}
              placeholder="Brief overview of what the app does, its purpose, and main user types..."
              value={appDescription}
              onChange={(e) => onUpdate({ appDescription: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} disabled={!appName.trim()}>
          Next: Audiences →
        </Button>
      </div>
    </div>
  );
}
