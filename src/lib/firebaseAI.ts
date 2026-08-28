import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

let initialized = false;
let model: any | null = null;

function getFirebaseConfig() {
  // Expect NEXT_PUBLIC_ env vars to be available at build time for client use.
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !projectId) return null;

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

export async function initFirebaseAI() {
  if (initialized) return model;
  const cfg = getFirebaseConfig();
  if (!cfg) throw new Error('Missing NEXT_PUBLIC_FIREBASE_* configuration for client Firebase initialization');

  // Initialize Firebase app if not already initialized
  let app;
  try {
    app = getApp();
  } catch (e) {
    app = initializeApp(cfg as any);
  }

  const ai = getAI(app, { backend: new GoogleAIBackend() });
  model = getGenerativeModel(ai, { model: 'gemini-3.6-flash' });
  initialized = true;
  return model;
}

export async function getCollegeAdvice(studentQuery: string) {
  const mdl = await initFirebaseAI();
  try {
    // The firebase/ai SDK may expose different shapes; attempt generateContent as in snippet
    if (typeof mdl.generateContent === 'function') {
      const result = await mdl.generateContent({ prompt: studentQuery });
      // adapt to typical response shapes
      if (result?.response?.text) return result.response.text;
      if (result?.responseText) return result.responseText;
      return JSON.stringify(result);
    }

    // Fallback if model has a different API
    const res = await mdl.generateContent(studentQuery);
    return res?.response?.text ?? JSON.stringify(res);
  } catch (err) {
    console.error('Firebase AI generate error', err);
    throw err;
  }
}
