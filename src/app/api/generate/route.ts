import { NextRequest } from 'next/server';
import { streamDocumentation } from '@/lib/claude';
import type { JiraFeatures, UploadedScreen, CrawledPage, UploadedDesignDoc } from '@/types';

export const maxDuration = 120;

interface SingleAudience {
  audienceName: string;
  audienceDescription: string;
  customPrompt?: string;
}

interface GenerateBody {
  appName: string;
  appDescription: string;
  jiraFeatures: JiraFeatures | null;
  screens: UploadedScreen[] | null;
  crawledPages: CrawledPage[] | null;
  designDocs: UploadedDesignDoc[] | null;
  singleAudience: SingleAudience;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GenerateBody;
    const { appName, appDescription, jiraFeatures, screens, crawledPages, designDocs, singleAudience } = body;

    if (!appName || !singleAudience?.audienceName) {
      return new Response('Missing required fields', { status: 400 });
    }

    const readable = await streamDocumentation({
      appName,
      appDescription,
      jiraFeatures: jiraFeatures ?? null,
      screens: screens ?? null,
      crawledPages: crawledPages ?? null,
      designDocs: designDocs ?? null,
      audienceName: singleAudience.audienceName,
      audienceDescription: singleAudience.audienceDescription,
      customPromptOverride: singleAudience.customPrompt,
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(message, { status: 500 });
  }
}
