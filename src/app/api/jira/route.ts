import { NextRequest, NextResponse } from 'next/server';
import { fetchJiraFeatures } from '@/lib/jira';
import type { JiraCredentials } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { credentials: JiraCredentials };
    const { credentials } = body;

    if (!credentials?.baseUrl || !credentials?.projectKey || !credentials?.email || !credentials?.apiToken) {
      return NextResponse.json({ error: 'Missing Jira credentials' }, { status: 400 });
    }

    const features = await fetchJiraFeatures(credentials);
    return NextResponse.json(features);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
