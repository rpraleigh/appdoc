import { GoogleGenerativeAI } from '@google/generative-ai';
import type { JiraFeatures, UploadedScreen, CrawledPage, Audience, UploadedDesignDoc } from '@/types';

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const DEFAULT_PROMPT_TEMPLATE = `Generate comprehensive markdown documentation for the **{audience}** audience.

Structure your response with these sections:
1. **Overview** — what the application does and why it exists
2. **Key Features** — organized by epic/feature area
3. **User Flows** — step-by-step walkthroughs of main tasks
4. **Audience-Specific Notes** — guidance tailored specifically for {audience}
5. **Glossary** — key terms and definitions

Write in clear, professional language appropriate for {audience}. Be specific and actionable.
Respond ONLY with the markdown document — no preamble, no wrapping code fences.`;

interface BuildPartsOptions {
  appName: string;
  appDescription: string;
  jiraFeatures: JiraFeatures | null;
  screens: UploadedScreen[] | null;
  crawledPages: CrawledPage[] | null;
  designDocs: UploadedDesignDoc[] | null;
  audienceName: string;
  audienceDescription: string;
  customPromptOverride?: string;
}

function buildPrompt(opts: BuildPartsOptions): string {
  const { appName, appDescription, jiraFeatures, screens, crawledPages, designDocs, audienceName, audienceDescription, customPromptOverride } = opts;
  const lines: string[] = [];

  lines.push(`# Application: ${appName}`);
  if (appDescription) lines.push(`\n${appDescription}`);

  if (jiraFeatures && (jiraFeatures.epics.length > 0 || jiraFeatures.stories.length > 0)) {
    lines.push('\n## Features (from Jira)');
    const storyMap = new Map<string, typeof jiraFeatures.stories>();
    const orphans: typeof jiraFeatures.stories = [];

    for (const story of jiraFeatures.stories) {
      if (story.epicKey) {
        const list = storyMap.get(story.epicKey) ?? [];
        list.push(story);
        storyMap.set(story.epicKey, list);
      } else {
        orphans.push(story);
      }
    }

    for (const epic of jiraFeatures.epics) {
      lines.push(`\n### Epic: ${epic.key} — ${epic.summary} [${epic.status}]`);
      const epicStories = storyMap.get(epic.key) ?? [];
      for (const s of epicStories) {
        lines.push(`- **${s.key}** (${s.status}): ${s.summary}${s.description ? `\n  ${s.description.slice(0, 300)}` : ''}`);
      }
    }

    if (orphans.length > 0) {
      lines.push('\n### Other Stories');
      for (const s of orphans) {
        lines.push(`- **${s.key}** (${s.status}): ${s.summary}`);
      }
    }
  }

  if (designDocs && designDocs.length > 0) {
    lines.push('\n## Design Documents');
    for (const doc of designDocs) {
      lines.push(`\n### ${doc.name}`);
      lines.push(doc.text.slice(0, 5000));
    }
  }

  if (crawledPages && crawledPages.length > 0) {
    lines.push('\n## UI Context (from web crawl)');
    for (const page of crawledPages.slice(0, 15)) {
      lines.push(`\n### Page: ${page.title} (${page.url})`);
      lines.push(page.text.slice(0, 1000));
    }
  } else if (screens && screens.length > 0) {
    lines.push(`\n## UI Context\nScreenshots of the application have been provided (${screens.length} image${screens.length > 1 ? 's' : ''}).`);
  }

  lines.push(`\n## Target Audience: ${audienceName}`);
  if (audienceDescription) lines.push(audienceDescription);

  const promptTemplate = customPromptOverride ?? DEFAULT_PROMPT_TEMPLATE;
  const instructions = promptTemplate.replace(/\{audience\}/g, audienceName);
  lines.push(`\n## Instructions\n${instructions}`);

  return lines.join('\n');
}

export async function streamDocumentation(
  opts: BuildPartsOptions
): Promise<ReadableStream<Uint8Array>> {
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction:
      'You are an expert technical writer. Generate clear, structured markdown documentation. Respond only with the markdown document — no preamble, no wrapping code fences.',
  });

  const parts: Parameters<typeof model.generateContentStream>[0] extends { contents: infer C } ? never : any[] = [];

  // Add images first
  if (opts.screens && opts.screens.length > 0) {
    for (const screen of opts.screens) {
      const base64 = screen.base64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: screen.mimeType,
          data: base64,
        },
      });
    }
  }

  // Add text prompt
  parts.push({ text: buildPrompt(opts) });

  const result = await model.generateContentStream(parts);

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

export type { Audience };
