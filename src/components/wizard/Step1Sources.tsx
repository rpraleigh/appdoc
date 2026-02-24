'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { DropZone } from '@/components/ui/DropZone';
import { Spinner } from '@/components/ui/Spinner';
import type { WizardState, JiraFeatures } from '@/types';

interface Step1Props {
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onNext: () => void;
}

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

export function Step1Sources({ state, onUpdate, onNext }: Step1Props) {
  const { jiraCredentials, uiInputMode, crawlUrl, crawlDepth, uploadedScreens } = state;
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Reset Jira test status when credentials change
  useEffect(() => {
    setTestStatus('idle');
    setTestMessage('');
  }, [jiraCredentials.baseUrl, jiraCredentials.projectKey, jiraCredentials.email, jiraCredentials.apiToken]);

  async function testConnection() {
    setTestStatus('loading');
    setTestMessage('');
    try {
      const res = await fetch('/api/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: jiraCredentials }),
      });
      const data = await res.json() as JiraFeatures & { error?: string };
      if (!res.ok || data.error) {
        setTestStatus('error');
        setTestMessage(data.error ?? 'Connection failed');
      } else {
        setTestStatus('success');
        setTestMessage(`Connected! Found ${data.epics.length} epics and ${data.stories.length} stories.`);
        onUpdate({ jiraFeatures: data });
      }
    } catch (err) {
      setTestStatus('error');
      setTestMessage((err as Error).message);
    }
  }

  const canProceed =
    jiraCredentials.baseUrl && jiraCredentials.projectKey &&
    jiraCredentials.email && jiraCredentials.apiToken &&
    (uiInputMode === 'upload' ? true : crawlUrl.trim().length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Step 1: Sources</h2>
        <p className="text-sm text-gray-500 mt-1">Connect your Jira project and choose how to provide UI context.</p>
      </div>

      {/* Jira credentials */}
      <Card>
        <h3 className="text-base font-semibold text-gray-800 mb-4">Jira Connection</h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="jira-url">Jira Base URL</Label>
            <Input
              id="jira-url"
              placeholder="https://yourorg.atlassian.net"
              value={jiraCredentials.baseUrl}
              onChange={(e) => onUpdate({ jiraCredentials: { ...jiraCredentials, baseUrl: e.target.value } })}
            />
          </div>
          <div>
            <Label htmlFor="jira-project">Project Key</Label>
            <Input
              id="jira-project"
              placeholder="MYAPP"
              value={jiraCredentials.projectKey}
              onChange={(e) => onUpdate({ jiraCredentials: { ...jiraCredentials, projectKey: e.target.value.toUpperCase() } })}
            />
          </div>
          <div>
            <Label htmlFor="jira-email">Email</Label>
            <Input
              id="jira-email"
              type="email"
              placeholder="you@example.com"
              value={jiraCredentials.email}
              onChange={(e) => onUpdate({ jiraCredentials: { ...jiraCredentials, email: e.target.value } })}
            />
          </div>
          <div>
            <Label htmlFor="jira-token">API Token</Label>
            <Input
              id="jira-token"
              type="password"
              placeholder="Your Jira API token"
              value={jiraCredentials.apiToken}
              onChange={(e) => onUpdate({ jiraCredentials: { ...jiraCredentials, apiToken: e.target.value } })}
            />
            <p className="text-xs text-gray-400 mt-1">Credentials are stored only in your browser (localStorage).</p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="secondary"
              onClick={testConnection}
              disabled={
                testStatus === 'loading' ||
                !jiraCredentials.baseUrl || !jiraCredentials.projectKey ||
                !jiraCredentials.email || !jiraCredentials.apiToken
              }
            >
              {testStatus === 'loading' && <Spinner size="sm" />}
              Test Connection
            </Button>
            {testStatus === 'success' && <span className="text-sm text-green-600">{testMessage}</span>}
            {testStatus === 'error' && <span className="text-sm text-red-500">{testMessage}</span>}
          </div>
        </div>
      </Card>

      {/* UI input mode */}
      <Card>
        <h3 className="text-base font-semibold text-gray-800 mb-4">UI Context</h3>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="uiMode"
              value="upload"
              checked={uiInputMode === 'upload'}
              onChange={() => onUpdate({ uiInputMode: 'upload' })}
              className="text-blue-600"
            />
            <span className="text-sm font-medium">Upload screenshots</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="uiMode"
              value="url"
              checked={uiInputMode === 'url'}
              onChange={() => onUpdate({ uiInputMode: 'url' })}
              className="text-blue-600"
            />
            <span className="text-sm font-medium">Crawl a URL</span>
          </label>
        </div>

        {uiInputMode === 'upload' && (
          <DropZone
            screens={uploadedScreens}
            onChange={(screens) => onUpdate({ uploadedScreens: screens })}
          />
        )}

        {uiInputMode === 'url' && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="crawl-url">URL to crawl</Label>
              <Input
                id="crawl-url"
                type="url"
                placeholder="https://your-app.com"
                value={crawlUrl}
                onChange={(e) => onUpdate({ crawlUrl: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">
                Note: Single-page apps (React, etc.) may return limited content — screenshots are more reliable for SPAs.
              </p>
            </div>
            <div>
              <Label>Crawl depth: {crawlDepth}</Label>
              <input
                type="range"
                min={1}
                max={4}
                value={crawlDepth}
                onChange={(e) => onUpdate({ crawlDepth: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 (start page only)</span>
                <span>4 (deep crawl)</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed}>
          Next: App Info →
        </Button>
      </div>
    </div>
  );
}
