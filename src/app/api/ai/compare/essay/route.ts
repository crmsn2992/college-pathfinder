import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const MODEL = process.env.AI_MODEL || 'gemini-1.5-flash';

async function callGenerativeModel(prompt: string) {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) throw new Error('no_service_account');

  const auth = new GoogleAuth({ credentials: JSON.parse(sa), scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  const token = typeof accessToken === 'string' ? accessToken : accessToken?.token;
  if (!token) throw new Error('no_token');

  const url = `https://generativelanguage.googleapis.com/v1beta2/models/${MODEL}:generateText`;
  const body = {
    prompt: { text: prompt },
    temperature: 0.2,
    maxOutputTokens: 512,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ai_error:${res.status} ${txt}`);
  }

  const data = await res.json();
  let text = '';
  if (data.candidates && data.candidates.length > 0) {
    text = data.candidates.map((c: any) => c.output ?? c.content ?? c.text ?? '').join('\n');
  } else if (data.output) {
    text = data.output?.[0]?.content ?? data.output?.content ?? '';
  } else if (data.completion) {
    text = data.completion?.[0]?.content ?? data.completion?.content ?? '';
  } else if (typeof data === 'string') {
    text = data;
  } else {
    text = JSON.stringify(data).slice(0, 2000);
  }
  return text;
}

export async function POST(request: Request) {
  try {
    const { collegeId, essay } = await request.json();
    if (!essay) return NextResponse.json({ error: 'missing_essay' }, { status: 400 });

    const prompt = `You are an admissions reviewer. Compare the following student essay to the expectations for applicants to the target college (id: ${collegeId}).\n\nEssay:\n${essay}\n\nProvide: 1) a short critique (strengths/weaknesses), 2) suggested improvements (list), 3) a rough fit estimate and reasons.`;

    try {
      const text = await callGenerativeModel(prompt);
      return NextResponse.json({ analysis: text });
    } catch (err) {
      console.error('compare essay AI failed', err);
      return NextResponse.json({ analysis: `Demo: ${essay.slice(0, 200)}... (enable AI to get full analysis)` });
    }
  } catch (err) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}
