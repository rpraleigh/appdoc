import Anthropic from '@anthropic-ai/sdk';
import type { JiraFeatures, UploadedScreen, CrawledPage, Audience } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface BuildMessagesOptions {
  appName: string;
  appDescription: string;
  jiraFeatures: JiraFeatures | null;
  screens: UploadedScreen[] | null;
  crawledPages: CrawledPage[] | null;
  audienceName: string;
  audienceDescription: string;
}

export function buildMessages(opts: BuildMessagesOptions): Anthropic.MessageParam[] {
  const { appName, appDescription, jiraFeatures, screens, crawledPages, audienceName, audienceDescription } = opts;

  const content: Anthropic.ContentBlockParam[] = [];

  // Add screenshot image blocks
  if (screens && screens.length > 0) {
    for (const screen of screens) {
      const base64 = screen.base64.replace(/^data:[^;]+;base64,/, '');
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: screen.mimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
          data: base64,
        },
      });
    }
  }

  // Build text block
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

  if (crawledPages && crawledPages.length > 0) {
    lines.push('\n## UI Context (from web crawl)');
    for (const page of crawledPages.slice(0, 15)) {
      lines.push(`\n### Page: ${page.title} (${page.url})`);
      lines.push(page.text.slice(0, 1000));
    }
  } else if (screens && screens.length > 0) {
    lines.push(`\n## UI Context\nScreenshots of the application have been provided above (${screens.length} image${screens.length > 1 ? 's' : ''}).`);
  }

  lines.push(`\n## Target Audience: ${audienceName}`);
  if (audienceDescription) lines.push(audienceDescription);

  lines.push(`
## Instructions
Generate comprehensive markdown documentation for the **${audienceName}** audience.

Structure your response with these sections:
1. **Overview** — what the application does and why it exists
2. **Key Features** — organized by epic/feature area
3. **User Flows** — step-by-step walkthroughs of main tasks
4. **Audience-Specific Notes** — guidance tailored specifically for ${audienceName}
5. **Glossary** — key terms and definitions

Write in clear, professional language appropriate for ${audienceName}. Be specific and actionable.
Respond ONLY with the markdown document — no preamble, no wrapping code fences.`);

  content.push({ type: 'text', text: lines.join('\n') });

  return [{ role: 'user', content }];
}

export async function streamDocumentation(
  opts: BuildMessagesOptions
): Promise<ReadableStream<Uint8Array>> {
  const messages = buildMessages(opts);

  const stream = await client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system:
      'You are an expert technical writer. Generate clear, structured markdown documentation. Respond only with the markdown document — no preamble, no wrapping code fences.',
    messages,
  });

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
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
