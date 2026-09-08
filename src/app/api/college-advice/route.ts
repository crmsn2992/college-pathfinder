// src/app/api/college-advice/route.ts
import { NextResponse } from "next/server";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "college-pathfinder-566ec.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "college-pathfinder-566ec",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "college-pathfinder-566ec.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "933596174185",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Firebase API key is not configured" },
        { status: 500 },
      );
    }

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, { model: "gemini-3.6-flash" });
    const { studentQuery } = await request.json();
    
    const prompt = `You are a helpful college pathfinder assistant. Answer this student's query: ${studentQuery}`;
    const result = await model.generateContent(prompt);
    const aiText = await result.response.text();
    
    return NextResponse.json({ advice: aiText });
  } catch (error) {
    console.error("AI Logic Error:", error);
    return NextResponse.json({ error: "Failed to fetch advice" }, { status: 500 });
  }
}
