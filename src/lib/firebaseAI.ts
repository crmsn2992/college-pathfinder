import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
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

  // Initialize App Check if site key is present (reCAPTCHA v3)
  try {
    const siteKey = process.env.NEXT_PUBLIC_APP_CHECK_SITE_KEY;
    if (siteKey) {
      // initializeAppCheck is safe to call multiple times; guard so it doesn't re-init in HMR
      try {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
        // console.info('Firebase App Check initialized');
      } catch (err) {
        // If App Check was already initialized by HMR, ignore
        // console.warn('App Check init warning', err);
      }
    } else {
      // App Check not configured; recommend enabling for production
      // console.warn('NEXT_PUBLIC_APP_CHECK_SITE_KEY not found — App Check not initialized.');
    }
  } catch (err) {
    // ignore App Check init errors in client environments
    // console.warn('App Check initialization failed', err);
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
