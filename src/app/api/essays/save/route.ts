import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/admin';

export async function POST(request: Request) {
  try {
    const { userId, collegeId, essay, analysis } = await request.json();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const admin = getAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'server_not_configured' }, { status: 501 });
    }

    const firestore = admin.firestore();
    await firestore.collection('studentProfiles').doc(userId).collection('essays').add({
      collegeId: collegeId ?? null,
      essay,
      analysis,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('Error saving essay', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'unknown' }, { status: 500 });
  }
}
