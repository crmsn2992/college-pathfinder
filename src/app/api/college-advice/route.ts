// src/app/api/college-advice/route.ts
import { NextResponse } from "next/server";
import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY, 
  authDomain: "://firebaseapp.com",
  projectId: "college-pathfinder-566ec",
  storageBucket: "college-pathfinder-566ec.firebasestorage.app",
  messagingSenderId: "933596174185",
  appId: process.env.FIREBASE_APP_ID
};

// 1. Initialize Firebase and AI
const app = initializeApp(firebaseConfig);
const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: "gemini-3.6-flash" });

// 2. Export ONLY the POST route handler (Next.js requirement)
export async function POST(request: Request) {
  try {
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

