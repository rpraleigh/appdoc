import { NextRequest, NextResponse } from 'next/server';
import { crawlSite } from '@/lib/crawl';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url: string; depth: number };
    const { url, depth } = body;

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    const pages = await crawlSite(url, depth ?? 2);
    return NextResponse.json({ pages });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
