import type { NextApiRequest, NextApiResponse } from "next";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";
import { GoogleAuth } from "google-auth-library";

function getServiceAccount() {
  const value = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!value) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
  }
  return JSON.parse(value);
}

const firebaseAdminApp =
  getApps()[0] ||
  (() => {
    const serviceAccount = getServiceAccount();
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  })();

async function verifyAppCheck(req: NextApiRequest) {
  const appCheckToken = req.headers["x-firebase-appcheck"];
  if (typeof appCheckToken !== "string" || !appCheckToken) {
    throw new Error("Missing App Check token");
  }
  await getAppCheck(firebaseAdminApp).verifyToken(appCheckToken);
}

async function verifyIdToken(req: NextApiRequest) {
  const authorization = req.headers.authorization;
  const match =
    typeof authorization === "string"
      ? authorization.match(/^Bearer (.+)$/)
      : null;
  if (!match) {
    throw new Error("Missing Authorization header with Firebase ID token");
  }
  return getAuth(firebaseAdminApp).verifyIdToken(match[1]);
}

function getErrorStatus(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  return 401;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unauthorized";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await verifyAppCheck(req);
    const user = await verifyIdToken(req);
    const vars = req.body?.variables || {};
    const templateId =
      process.env.FIREBASE_PROMPT_TEMPLATE_ID || "college-advisor";
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJson) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
    }

    const auth = new GoogleAuth({
      credentials: JSON.parse(serviceAccountJson),
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const project =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID;

    if (!project) {
      throw new Error("Firebase project ID is not configured");
    }

    const url = `https://firebasevertexai.googleapis.com/v1/projects/${project}/locations/us-central1/servers:invokeTemplate`;
    const response = await client.request({
      url,
      method: "POST",
      data: {
        templateId,
        input: vars,
        userId: user.uid,
      },
    });

    return res.status(200).json(response.data);
  } catch (error: unknown) {
    console.error("ai-proxy error:", error);
    return res
      .status(getErrorStatus(error))
      .json({ error: getErrorMessage(error) });
  }
}
