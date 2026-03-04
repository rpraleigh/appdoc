'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import type { WizardState, JiraFeatures, CrawledPage, GeneratedDoc } from '@/types';

interface Step4Props {
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onBack: () => void;
  onNext: () => void;
  docs: GeneratedDoc[];
  generateStatus: 'idle' | 'loading' | 'streaming' | 'done' | 'error';
  generateError: string | null;
  onGenerate: () => void;
  onCancel: () => void;
}

type FetchStatus = 'idle' | 'loading' | 'done' | 'error';

export function Step4Generate({
  state,
  onUpdate,
  onBack,
  onNext,
  docs,
  generateStatus,
  generateError,
  onGenerate,
  onCancel,
}: Step4Props) {
  const { jiraCredentials, jiraFeatures, uiInputMode, crawlUrl, crawlDepth, crawledPages, uploadedScreens, appName, audiences, generationMode } = state;
  const [jiraFetchStatus, setJiraFetchStatus] = useState<FetchStatus>(jiraFeatures ? 'done' : 'idle');
  const [jiraError, setJiraError] = useState('');
  const [crawlStatus, setCrawlStatus] = useState<FetchStatus>(crawledPages ? 'done' : 'idle');
  const [crawlError, setCrawlError] = useState('');

  async function fetchJira() {
    setJiraFetchStatus('loading');
    setJiraError('');
    try {
      const res = await fetch('/api/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: jiraCredentials }),
      });
      const data = await res.json() as JiraFeatures & { error?: string };
      if (!res.ok || data.error) {
        setJiraFetchStatus('error');
        setJiraError(data.error ?? 'Jira fetch failed');
      } else {
        onUpdate({ jiraFeatures: data });
        setJiraFetchStatus('done');
      }
    } catch (err) {
      setJiraFetchStatus('error');
      setJiraError((err as Error).message);
    }
  }

  async function doCrawl() {
    setCrawlStatus('loading');
    setCrawlError('');
    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: crawlUrl, depth: crawlDepth }),
      });
      const data = await res.json() as { pages: CrawledPage[]; error?: string };
      if (!res.ok || data.error) {
        setCrawlStatus('error');
        setCrawlError(data.error ?? 'Crawl failed');
      } else {
        onUpdate({ crawledPages: data.pages });
        setCrawlStatus('done');
      }
    } catch (err) {
      setCrawlStatus('error');
      setCrawlError((err as Error).message);
    }
  }

  const isGenerating = generateStatus === 'loading' || generateStatus === 'streaming';
  const isDone = generateStatus === 'done';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Step 5: Generate</h2>
        <p className="text-sm text-gray-500 mt-1">Review your inputs, fetch data, then generate documentation.</p>
      </div>

      {/* Summary */}
      <Card>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Summary</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-gray-500 shrink-0 w-32">App:</dt>
            <dd className="text-gray-800 font-medium">{appName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 shrink-0 w-32">Jira project:</dt>
            <dd className="text-gray-800">{jiraCredentials.projectKey || '—'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 shrink-0 w-32">UI source:</dt>
            <dd className="text-gray-800">
              {uiInputMode === 'upload'
                ? `${uploadedScreens.length} screenshot(s)`
                : `Crawl: ${crawlUrl} (depth ${crawlDepth})`}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 shrink-0 w-32">Audiences:</dt>
            <dd className="text-gray-800">
              {audiences.map((a) => a.name).join(', ')} ({generationMode})
            </dd>
          </div>
        </dl>
      </Card>

      {/* Jira fetch */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Jira Features</h3>
            {jiraFeatures && (
              <p className="text-xs text-green-600 mt-0.5">
                {jiraFeatures.epics.length} epics, {jiraFeatures.stories.length} stories loaded
              </p>
            )}
            {jiraError && <p className="text-xs text-red-500 mt-0.5">{jiraError}</p>}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={fetchJira}
            disabled={jiraFetchStatus === 'loading' || isGenerating}
          >
            {jiraFetchStatus === 'loading' ? <Spinner size="sm" /> : null}
            {jiraFeatures ? 'Re-fetch Jira' : 'Fetch Jira'}
          </Button>
        </div>
      </Card>

      {/* Crawl */}
      {uiInputMode === 'url' && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Web Crawl</h3>
              {crawledPages && (
                <p className="text-xs text-green-600 mt-0.5">{crawledPages.length} pages crawled</p>
              )}
              {crawlError && <p className="text-xs text-red-500 mt-0.5">{crawlError}</p>}
              {crawledPages && crawledPages.some((p) => p.text.length < 100) && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Some pages returned little text — this URL may be a SPA. Consider using screenshots instead.
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={doCrawl}
              disabled={crawlStatus === 'loading' || isGenerating || !crawlUrl}
            >
              {crawlStatus === 'loading' ? <Spinner size="sm" /> : null}
              {crawledPages ? 'Re-crawl' : 'Crawl'}
            </Button>
          </div>
        </Card>
      )}

      {/* Generate */}
      {generateError && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-600">
          {generateError}
        </div>
      )}

      {docs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            {isGenerating ? 'Generating...' : 'Output preview'}
          </h3>
          {docs.map((doc, i) => (
            <div key={i} className="mb-3">
              {docs.length > 1 && (
                <p className="text-xs font-medium text-gray-500 mb-1">{doc.audienceName}</p>
              )}
              <pre className="bg-gray-900 text-gray-100 text-xs rounded-md p-4 overflow-auto max-h-48 whitespace-pre-wrap">
                {doc.markdown || (doc.streaming ? '...' : '')}
              </pre>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isGenerating}>← Back</Button>
        <div className="flex gap-3">
          {isGenerating && (
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {!isDone && (
            <Button
              onClick={onGenerate}
              disabled={isGenerating}
            >
              {isGenerating && <Spinner size="sm" />}
              {isGenerating ? 'Generating...' : 'Generate Documentation'}
            </Button>
          )}
          {isDone && (
            <Button onClick={onNext}>
              View Output →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
