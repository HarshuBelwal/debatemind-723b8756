import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"; // George

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "TTS not configured." }), { status: 500 });
        }

        // Auth check
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

        let body: { text?: string; voiceId?: string };
        try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: "Bad JSON" }), { status: 400 }); }

        const text = (body.text || "").toString().slice(0, 2500);
        if (!text.trim()) return new Response(JSON.stringify({ error: "Missing text" }), { status: 400 });
        const voiceId = body.voiceId || DEFAULT_VOICE;

        try {
          const r = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
              body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5" }),
            }
          );
          if (!r.ok || !r.body) {
            console.error("TTS error", r.status, await r.text().catch(() => ""));
            return new Response(JSON.stringify({ error: "TTS failed" }), { status: 500 });
          }
          return new Response(r.body, {
            status: 200,
            headers: { "Content-Type": "audio/mpeg" },
          });
        } catch (e) {
          console.error("TTS handler error", e);
          return new Response(JSON.stringify({ error: "TTS error" }), { status: 500 });
        }
      },
    },
  },
});
