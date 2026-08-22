import admin from 'firebase-admin';

let initialized = false;

export function getAdmin() {
  try {
    if (initialized && admin.apps && admin.apps.length > 0) return admin;

    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!sa) return null;

    const cred = JSON.parse(sa);
    admin.initializeApp({ credential: admin.credential.cert(cred) });
    initialized = true;
    return admin;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize firebase-admin:', err);
    return null;
  }
}
