'use client';

import { useState, useRef, useCallback } from 'react';
import type { GeneratedDoc, GenerateRequest, Audience } from '@/types';

type Status = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

interface UseStreamingGenerateResult {
  docs: GeneratedDoc[];
  status: Status;
  error: string | null;
  generate: (request: GenerateRequest) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

async function fetchStream(
  body: object,
  onChunk: (text: string) => void,
  signal: AbortSignal
): Promise<void> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Generate failed: ${res.status} ${text}`);
  }

  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

export function useStreamingGenerate(): UseStreamingGenerateResult {
  const [docs, setDocs] = useState<GeneratedDoc[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setDocs([]);
    setStatus('idle');
    setError(null);
  }, []);

  const generate = useCallback(async (request: GenerateRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const { appName, appDescription, jiraFeatures, screens, crawledPages, audiences, mode } = request;

    // Build list of stream targets
    let targets: Array<{ audienceName: string; audienceDescription: string }>;

    if (mode === 'combined' && audiences.length > 1) {
      targets = [
        {
          audienceName: audiences.map((a) => a.name).join(' & '),
          audienceDescription: audiences
            .map((a) => `**${a.name}**: ${a.description}`)
            .join('\n'),
        },
      ];
    } else {
      targets = audiences.map((a: Audience) => ({
        audienceName: a.name,
        audienceDescription: a.description,
      }));
    }

    // Initialize docs
    const initialDocs: GeneratedDoc[] = targets.map((t) => ({
      audienceName: t.audienceName,
      markdown: '',
      streaming: true,
    }));
    setDocs(initialDocs);
    setStatus('loading');
    setError(null);

    const basePayload = { appName, appDescription, jiraFeatures, screens, crawledPages };

    try {
      setStatus('streaming');

      // Start all streams in parallel, staggered by 300ms to avoid RPM limits
      await Promise.all(
        targets.map((target, idx) =>
          new Promise<void>((resolve, reject) => {
            setTimeout(async () => {
              try {
                await fetchStream(
                  { ...basePayload, singleAudience: target },
                  (chunk) => {
                    setDocs((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], markdown: next[idx].markdown + chunk };
                      return next;
                    });
                  },
                  controller.signal
                );
                setDocs((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], streaming: false };
                  return next;
                });
                resolve();
              } catch (err) {
                reject(err);
              }
            }, idx * 300);
          })
        )
      );

      setStatus('done');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message);
      setStatus('error');
    }
  }, []);

  return { docs, status, error, generate, cancel, reset };
}
