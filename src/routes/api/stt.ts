import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "STT not configured." }), { status: 500 });
        }

        const authHeader = request.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error } = await sb.auth.getClaims(token);
        if (error || !claims?.claims?.sub) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const form = await request.formData();
        const file = form.get("audio") as Blob | null;
        if (!file || typeof (file as Blob).arrayBuffer !== "function") {
          return new Response(JSON.stringify({ error: "Missing audio" }), { status: 400 });
        }

        try {
          const apiForm = new FormData();
          apiForm.append("file", file, "audio.webm");
          apiForm.append("model_id", "scribe_v2");

          const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
            method: "POST",
            headers: { "xi-api-key": apiKey },
            body: apiForm,
          });
          if (!r.ok) {
            console.error("STT error", r.status, await r.text().catch(() => ""));
            return new Response(JSON.stringify({ error: "Transcription failed" }), { status: 500 });
          }
          const data = await r.json();
          return new Response(JSON.stringify({ text: data.text || "" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("STT handler error", e);
          return new Response(JSON.stringify({ error: "STT error" }), { status: 500 });
        }
      },
    },
  },
});
