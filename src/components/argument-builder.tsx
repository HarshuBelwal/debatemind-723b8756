import { useRef, useState } from "react";
import { toast } from "sonner";
import { FeatureCard } from "./feature-card";
import type { ArgumentAnalysis } from "@/lib/types";
import { callAI } from "@/lib/ai-client";
import { useAuth, awardPoints } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const FIELDS = [
  { key: "claim", label: "Claim", emoji: "🎯", placeholder: "What are you arguing?" },
  { key: "evidence", label: "Evidence", emoji: "📊", placeholder: "Facts, data, examples that support the claim." },
  { key: "warrant", label: "Warrant", emoji: "🔗", placeholder: "Why does the evidence support the claim?" },
  { key: "rebuttal", label: "Rebuttal", emoji: "🛡️", placeholder: "Anticipate the strongest objection — and answer it." },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export function ArgumentBuilder() {
  const { user, profile, refreshProfile } = useAuth();
  const [topic, setTopic] = useState("");
  const [vals, setVals] = useState<Record<FieldKey, string>>({ claim: "", evidence: "", warrant: "", rebuttal: "" });
  const [analysis, setAnalysis] = useState<ArgumentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("argument-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("argument-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Image attached");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function analyze() {
    if (!topic.trim() || Object.values(vals).some(v => !v.trim())) {
      return toast.info("Fill in topic and all four fields.");
    }
    setLoading(true);
    try {
      const r = await callAI<{ result: ArgumentAnalysis }>("argument_analyze", { topic, ...vals });
      setAnalysis(r.result);
      if (user && profile) {
        await supabase.from("arguments").insert({
          user_id: user.id, topic, ...vals,
          ai_analysis: `${r.result.improvement}`,
          ai_score: r.result.score,
          image_url: imageUrl,
        });
        const pts = Math.round(r.result.score / 4); // up to ~25 pts
        if (pts > 0) {
          await awardPoints(user.id, pts, profile.total_score, profile.current_streak);
          await refreshProfile(user.id);
          toast.success(`+${pts} pts`);
        }
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI failed"); }
    finally { setLoading(false); }
  }

  return (
    <FeatureCard icon="🏗️" label="Argument Builder · Toulmin">
      <div className="space-y-3">
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Topic (e.g., AI will replace most jobs in 20 years)"
          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:border-primary"
        />
        {FIELDS.map(f => (
          <div key={f.key}>
            <div className="font-arena text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              {f.emoji} {f.label}
            </div>
            <textarea
              value={vals[f.key]}
              onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        ))}
        <button
          onClick={analyze}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-arena py-2.5 text-sm font-bold text-arena-foreground shadow-arena disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "🔍 Analyze argument"}
        </button>

        {analysis && (
          <div className="rounded-xl border border-gold/50 bg-gradient-gold/10 p-4 space-y-3 animate-rise">
            <div className="flex items-center justify-between">
              <div className="font-arena text-[10px] uppercase tracking-widest text-gold">AI Analysis</div>
              <div className="font-display text-2xl font-black text-gradient-gold">{analysis.score}/100</div>
            </div>
            <div>
              <div className="font-arena text-[10px] uppercase tracking-widest text-victory mb-1">Strengths</div>
              <ul className="space-y-1 text-xs">
                {analysis.strengths.map((s, i) => <li key={i}>✓ {s}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-arena text-[10px] uppercase tracking-widest text-defeat mb-1">Weaknesses</div>
              <ul className="space-y-1 text-xs">
                {analysis.weaknesses.map((s, i) => <li key={i}>✗ {s}</li>)}
              </ul>
            </div>
            <div className="rounded-md bg-background/40 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Improve:</strong> {analysis.improvement}
            </div>
          </div>
        )}
      </div>
    </FeatureCard>
  );
}
