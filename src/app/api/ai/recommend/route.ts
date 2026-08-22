import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { getAdmin } from '@/lib/admin';

const MODEL = process.env.AI_MODEL || 'gemini-1.5-flash';
const CACHE_TTL_MS = Number(process.env.AI_CACHE_TTL_MS) || 5 * 60 * 1000; // 5 minutes default
const RATE_LIMIT_WINDOW_MS = Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60 * 1000; // 1 minute
const RATE_LIMIT_COUNT = Number(process.env.AI_RATE_LIMIT_COUNT) || 5; // 5 requests per window

type CacheEntry = { text: string; expires: number };
const cache = new Map<string, CacheEntry>();

type RateInfo = { count: number; windowStart: number };
const rateMap = new Map<string, RateInfo>();

function profileHash(profile: unknown) {
  try {
    const s = JSON.stringify(profile);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return h.toString(36);
  } catch (e) {
    return 'nohash';
  }
}

async function callGenerativeModel(prompt: string) {
  // Use google-auth-library to obtain an access token from service account
  try {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!sa) throw new Error('no_service_account');

    const auth = new GoogleAuth({
      credentials: JSON.parse(sa),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
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
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`ai_error:${res.status} ${txt}`);
    }

    const data = await res.json();
    // Expect candidates or output field depending on API
    // Try multiple shapes
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
      // Fallback: inspect keys
      text = JSON.stringify(data).slice(0, 2000);
    }

    return text;
  } catch (err) {
    // bubble up
    throw err;
  }
}

function demoRecommendation(profile: any) {
  const name = profile?.name ? `${profile.name}, ` : '';
  const majors = (profile?.intendedMajors || []).slice(0, 3).join(', ') || 'your chosen fields';
  return `${name}Based on your profile, here are quick recommendations for ${majors}:

1) Focus on improving core grades to be competitive (current: ${profile?.grades ?? 'N/A'}%).
2) Prioritize relevant standardized tests for your target countries (SAT/ACT for USA, CUET for India, etc.).
3) Add 1-2 demonstrable extracurriculars aligned with ${majors} (projects, internships, competitions).

Suggested next steps:
- Shortlist 6 colleges across reach/match/safety based on your budget and preferred countries.
- Prepare a timeline to complete tests and applications.

(This is a demo recommendation. Enable live AI to get a tailored roadmap.)`;
}

export async function POST(request: Request) {
  try {
    const { profile, userId } = await request.json();
    const key = profileHash(profile);

    // Rate limiting by userId or by key
    const rateKey = userId || (request.headers.get('x-forwarded-for') ?? 'anon');
    const now = Date.now();
    const ri = rateMap.get(rateKey) ?? { count: 0, windowStart: now };
    if (now - ri.windowStart > RATE_LIMIT_WINDOW_MS) {
      ri.count = 0;
      ri.windowStart = now;
    }
    ri.count += 1;
    rateMap.set(rateKey, ri);
    if (ri.count > RATE_LIMIT_COUNT) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    // Check cache
    const existing = cache.get(key);
    if (existing && existing.expires > now) {
      return NextResponse.json({ recommendation: existing.text });
    }

    // Try calling AI
    try {
      const prompt = `Create a concise actionable college roadmap for the following student profile:\n${JSON.stringify(profile, null, 2)}\n\nBe specific about tests, timeline, strengths, and gaps.`;
      const text = await callGenerativeModel(prompt);
      const expires = Date.now() + CACHE_TTL_MS;
      cache.set(key, { text, expires });
      return NextResponse.json({ recommendation: text });
    } catch (err) {
      console.error('AI call failed, falling back to demo', err);
      const demo = demoRecommendation(profile);
      cache.set(key, { text: demo, expires: Date.now() + CACHE_TTL_MS });
      return NextResponse.json({ recommendation: demo });
    }
  } catch (err) {
    console.error('Bad request to /api/ai/recommend', err);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}
