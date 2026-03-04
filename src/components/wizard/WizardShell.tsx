'use client';

import { useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useStreamingGenerate } from '@/hooks/useStreamingGenerate';
import { Step1Sources } from './Step1Sources';
import { Step2AppInfo } from './Step2AppInfo';
import { Step3Audiences } from './Step3Audiences';
import { Step4OutputFormat } from './Step4OutputFormat';
import { Step4Generate } from './Step4Generate';
import { Step6Output } from './Step6Output';
import { randomUUID } from '@/lib/utils';
import type { WizardState, JiraCredentials } from '@/types';

const DEFAULT_CREDENTIALS: JiraCredentials = {
  baseUrl: '',
  projectKey: '',
  email: '',
  apiToken: '',
};

const DEFAULT_STATE: WizardState = {
  jiraCredentials: DEFAULT_CREDENTIALS,
  uiInputMode: 'upload',
  crawlUrl: '',
  crawlDepth: 2,
  uploadedScreens: [],
  designDocs: [],
  appName: '',
  appDescription: '',
  audiences: [{ id: randomUUID(), name: '', description: '' }],
  generationMode: 'per-audience',
  jiraFeatures: null,
  crawledPages: null,
  outputFormats: ['md'],
  embedScreenshots: false,
};

const STEPS = ['Sources', 'App Info', 'Audiences', 'Output Format', 'Generate', 'Output'];

export function WizardShell() {
  const [step, setStep] = useLocalStorage<number>('appdoc:step', 0);
  const [wizardState, setWizardState] = useLocalStorage<WizardState>('appdoc:state', DEFAULT_STATE);
  const [jiraCredentials, setJiraCredentials] = useLocalStorage<JiraCredentials>('appdoc:jira', DEFAULT_CREDENTIALS);

  const { docs, status, error, generate, cancel, reset: resetGenerate } = useStreamingGenerate();

  const update = useCallback(
    (partial: Partial<WizardState>) => {
      setWizardState((prev) => {
        const next = { ...prev, ...partial };
        // Keep jira credentials in sync with their own key
        if (partial.jiraCredentials) setJiraCredentials(partial.jiraCredentials);
        return next;
      });
    },
    [setWizardState, setJiraCredentials]
  );

  // Merge persisted credentials into wizard state on hydration
  const stateWithCreds: WizardState = {
    ...wizardState,
    jiraCredentials,
  };

  // Ensure fields added in new version have defaults when loading old persisted state
  const state: WizardState = {
    ...stateWithCreds,
    designDocs: stateWithCreds.designDocs ?? [],
    outputFormats: stateWithCreds.outputFormats ?? ['md'],
    embedScreenshots: stateWithCreds.embedScreenshots ?? false,
  };

  function handleGenerate() {
    const { appName, appDescription, jiraFeatures, uploadedScreens, crawledPages, designDocs, audiences, generationMode, uiInputMode } = state;
    generate({
      appName,
      appDescription,
      jiraFeatures,
      screens: uiInputMode === 'upload' && uploadedScreens.length > 0 ? uploadedScreens : null,
      crawledPages: uiInputMode === 'url' ? crawledPages : null,
      designDocs: designDocs.length > 0 ? designDocs : null,
      audiences,
      mode: generationMode,
    });
  }

  function handleReset() {
    resetGenerate();
    setWizardState(DEFAULT_STATE);
    setJiraCredentials(DEFAULT_CREDENTIALS);
    setStep(0);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">AppDoc</h1>
            <p className="text-xs text-gray-500">AI-powered documentation generator</p>
          </div>
          {/* Step indicator */}
          <nav className="flex items-center gap-1">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center">
                <button
                  onClick={() => { if (i < step || (i === step)) return; }}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    i === step
                      ? 'bg-blue-100 text-blue-700'
                      : i < step
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`}
                >
                  <span>{i < step ? '✓' : i + 1}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className="text-gray-300 mx-0.5">›</span>
                )}
              </div>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {step === 0 && (
          <Step1Sources
            state={state}
            onUpdate={update}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <Step2AppInfo
            state={state}
            onUpdate={update}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <Step3Audiences
            state={state}
            onUpdate={update}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step4OutputFormat
            state={state}
            onUpdate={update}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <Step4Generate
            state={state}
            onUpdate={update}
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
            docs={docs}
            generateStatus={status}
            generateError={error}
            onGenerate={handleGenerate}
            onCancel={cancel}
          />
        )}
        {step === 5 && (
          <Step6Output
            docs={docs}
            appName={state.appName}
            outputFormats={state.outputFormats}
            embedScreenshots={state.embedScreenshots}
            uploadedScreens={state.uploadedScreens}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}
