import { useRef, useState } from "react";
import { toast } from "sonner";
import { MicRecorder, transcribe } from "@/lib/voice";

interface Props {
  onTranscript: (text: string) => void;
  className?: string;
  title?: string;
}

export function MicButton({ onTranscript, className = "", title = "Hold or click to speak" }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<MicRecorder | null>(null);

  async function start() {
    if (recording || busy) return;
    try {
      const rec = new MicRecorder();
      await rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch (e) {
      toast.error("Microphone access denied");
    }
  }

  async function stop() {
    if (!recRef.current) return;
    setRecording(false);
    setBusy(true);
    try {
      const blob = await recRef.current.stop();
      recRef.current = null;
      if (blob.size < 1000) { setBusy(false); return; }
      const text = await transcribe(blob);
      if (text) onTranscript(text);
      else toast.info("Didn't catch that — try again.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Voice failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={recording ? stop : start}
      disabled={busy}
      title={title}
      className={`grid h-10 w-10 place-items-center rounded-xl border transition shrink-0 ${
        recording
          ? "bg-defeat/20 border-defeat text-defeat animate-pulse"
          : "bg-card border-border hover:border-primary/60 text-foreground"
      } ${busy ? "opacity-50" : ""} ${className}`}
      aria-label={recording ? "Stop recording" : "Start recording"}
    >
      {busy ? "…" : recording ? "■" : "🎤"}
    </button>
  );
}
