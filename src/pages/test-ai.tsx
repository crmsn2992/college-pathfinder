"use client";

import { useEffect, useState } from "react";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { getIdToken, signInAnonymously } from "firebase/auth";
import { auth, getFirebaseApp, initAppCheck } from "@/lib/firebaseClient";

export default function TestAIPage() {
  const [status, setStatus] = useState(
    "App Check initialized. Register the debug token, then test.",
  );
  const [prompt, setPrompt] = useState(
    "I enjoy biology and helping people. What college majors might suit me?",
  );
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initAppCheck();
  }, []);

  async function runClientTest() {
    setIsLoading(true);
    setResult("");
    setStatus("Signing in anonymously and calling Firebase AI...");

    try {
      const credential = await signInAnonymously(auth);
      await getIdToken(credential.user, true);

      const ai = getAI(getFirebaseApp(), {
        backend: new GoogleAIBackend(),
      });
      const model = getGenerativeModel(ai, {
        model: "gemini-3.6-flash",
      });
      const response = await model.generateContent(prompt);

      setResult(response.response.text());
      setStatus("Client AI request succeeded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus("Client AI request failed.");
      setResult(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-3xl font-bold">Firebase AI Test</h1>
        <p className="mt-2 text-muted">
          Open DevTools and register the App Check debug token in Firebase
          Console before running the test.
        </p>
      </div>

      <p role="status" className="rounded-lg border border-card-border p-4">
        {status}
      </p>

      <label className="flex flex-col gap-2">
        <span className="font-medium">Your prompt</span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={5}
          className="rounded-lg border border-card-border bg-background p-3"
          placeholder="Ask Firebase AI a question..."
        />
      </label>

      <button
        type="button"
        onClick={runClientTest}
        disabled={isLoading}
        className="rounded-lg bg-primary px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {isLoading ? "Testing..." : "Run client AI test"}
      </button>

      {result && (
        <pre className="whitespace-pre-wrap rounded-lg border border-card-border p-4">
          {result}
        </pre>
      )}
    </main>
  );
}
