import type { JiraCredentials, JiraEpic, JiraStory, JiraFeatures } from '@/types';

// Recursively extract plain text from Atlassian Document Format (ADF)
function extractAdfText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as Record<string, unknown>;
  if (n.type === 'text' && typeof n.text === 'string') return n.text;
  if (Array.isArray(n.content)) {
    return (n.content as unknown[]).map(extractAdfText).join(' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: { name: string };
    issuetype: { name: string };
    description: unknown;
    parent?: { key: string };
    customfield_10014?: string; // epic link (older)
    epicKey?: string;
  };
}

async function searchIssues(
  credentials: JiraCredentials,
  jql: string,
  startAt = 0,
  maxResults = 100
): Promise<{ issues: JiraIssue[]; total: number }> {
  const { baseUrl, email, apiToken } = credentials;
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  const url = `${baseUrl.replace(/\/$/, '')}/rest/api/3/search/jql`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ jql, startAt, maxResults, fields: ['summary', 'status', 'issuetype', 'description', 'parent', 'customfield_10014'] }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira API error ${res.status}: ${text}`);
  }

  const data = await res.json() as { issues: JiraIssue[]; total: number };
  return data;
}

export async function fetchJiraFeatures(credentials: JiraCredentials): Promise<JiraFeatures> {
  const { projectKey } = credentials;
  const jql = `project = "${projectKey}" AND issuetype in (Epic, Story) ORDER BY key ASC`;

  const epics: JiraEpic[] = [];
  const stories: JiraStory[] = [];

  let startAt = 0;
  const maxResults = 100;

  while (true) {
    const { issues, total } = await searchIssues(credentials, jql, startAt, maxResults);

    for (const issue of issues) {
      const typeName = issue.fields.issuetype.name.toLowerCase();
      if (typeName === 'epic') {
        epics.push({
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
        });
      } else {
        // Try to determine epic parent via parent field or customfield
        const epicKey =
          issue.fields.parent?.key ?? issue.fields.customfield_10014 ?? null;

        stories.push({
          key: issue.key,
          summary: issue.fields.summary,
          description: issue.fields.description
            ? extractAdfText(issue.fields.description)
            : null,
          status: issue.fields.status.name,
          epicKey,
        });
      }
    }

    startAt += issues.length;
    if (startAt >= total || issues.length === 0) break;
  }

  return { epics, stories };
}
