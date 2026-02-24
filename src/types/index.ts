export interface JiraCredentials {
  baseUrl: string;
  projectKey: string;
  email: string;
  apiToken: string;
}

export interface JiraEpic {
  key: string;
  summary: string;
  status: string;
}

export interface JiraStory {
  key: string;
  summary: string;
  description: string | null;
  status: string;
  epicKey: string | null;
}

export interface JiraFeatures {
  epics: JiraEpic[];
  stories: JiraStory[];
}

export type UIInputMode = 'upload' | 'url';

export interface UploadedScreen {
  name: string;
  base64: string;
  mimeType: string;
}

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
  navLinks: string[];
}

export interface Audience {
  id: string;
  name: string;
  description: string;
}

export type GenerationMode = 'per-audience' | 'combined';

export interface WizardState {
  jiraCredentials: JiraCredentials;
  uiInputMode: UIInputMode;
  crawlUrl: string;
  crawlDepth: number;
  uploadedScreens: UploadedScreen[];
  appName: string;
  appDescription: string;
  audiences: Audience[];
  generationMode: GenerationMode;
  jiraFeatures: JiraFeatures | null;
  crawledPages: CrawledPage[] | null;
}

export interface GenerateRequest {
  appName: string;
  appDescription: string;
  jiraFeatures: JiraFeatures | null;
  screens: UploadedScreen[] | null;
  crawledPages: CrawledPage[] | null;
  audiences: Audience[];
  mode: GenerationMode;
}

export interface GeneratedDoc {
  audienceName: string;
  markdown: string;
  streaming: boolean;
}
