import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

// Your College pathfinder Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "college-pathfinder-566ec.firebaseapp.com",
  projectId: "college-pathfinder-566ec",
  storageBucket: "college-pathfinder-566ec.firebasestorage.app",
  messagingSenderId: "933596174185",
  appId: "YOUR_APP_ID"
};

// 1. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 2. Initialize the AI Logic service using the Google AI (Developer) backend
const ai = getAI(app, { backend: new GoogleAIBackend() });

// 3. Create a model instance (such as gemini-3.6-flash)
const model = getGenerativeModel(ai, { model: "gemini-3.6-flash" });

// 4. Generate college pathfinding advice!
export async function getCollegeAdvice(studentQuery: string) {
  try {
    const prompt = `You are a helpful college pathfinder assistant. Answer this student's query: ${studentQuery}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Logic Error:", error);
    throw error;
  }
}
