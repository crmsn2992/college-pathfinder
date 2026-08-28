import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const MODEL_URL = 'https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string = body?.prompt ?? '';
    const profile = body?.profile ?? null;

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Build a focused system prompt including a compact profile summary
    const profileSummary = profile
      ? `Student profile:\nName: ${profile.name ?? 'N/A'}\nGrades: ${profile.grades ?? 'N/A'}%\nBoard: ${profile.educationBoard ?? 'N/A'}\nCurrent grade: ${profile.currentGrade ?? 'N/A'}\nIntended majors: ${(profile.intendedMajors || []).join(', ') || 'N/A'}\nTest scores: ${JSON.stringify(profile.testScores || {})}\nExtracurriculars: ${(profile.extracurriculars || []).join(', ') || 'N/A'}\nBudgetRange: ${profile.budgetRange ?? 'N/A'}\nPreferred countries: ${(profile.preferredCountries || []).join(', ') || 'N/A'}`
      : 'No profile provided.';

    const systemPrompt = `You are an expert college admissions advisor for high-school students. Use the student profile below to craft a tailored, actionable response. Be specific: include strengths, weaknesses, prioritized next steps, which tests to take (with target score ranges where possible), and suggest a shortlist of 6 colleges (2 reach, 2 match, 2 safety) appropriate to the student's budget and preferred countries. Keep the answer concise (bullet points + 3 short paragraphs) and reference the student's key profile fields.\n\n${profileSummary}\n\nUser question: ${prompt}`;

    // Prepare request payload for the Generative API
    const requestBody = {
      prompt: { text: systemPrompt },
      temperature: 0.2,
      maxOutputTokens: 800,
    };

    let response;

    // Prefer API key if provided, otherwise attempt service-account authentication
    if (process.env.GOOGLE_API_KEY) {
      const url = `${MODEL_URL}?key=${process.env.GOOGLE_API_KEY}`;
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    } else {
      // Use google-auth-library to acquire an access token from the environment's credentials
      const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
      const client = await auth.getClient();
      const accessToken = (await client.getAccessToken())?.token;
      if (!accessToken) {
        return NextResponse.json({ error: 'No Google credentials available for Generative API' }, { status: 503 });
      }

      response = await fetch(MODEL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });
    }

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: 'Generative API request failed', details: text }, { status: 502 });
    }

    const data = await response.json();

    // Google generative responses often include 'candidates' with 'content'
    const recommendation = data?.candidates?.[0]?.content ?? data?.output?.[0]?.content ?? JSON.stringify(data);

    return NextResponse.json({ recommendation, raw: data });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
