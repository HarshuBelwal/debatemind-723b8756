import { ReactNode } from "react";

export function FeatureCard({
  icon, label, badge, children, className = "",
}: { icon: string; label: string; badge?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-gradient-card border border-border shadow-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{icon}</span>
          <span className="font-arena text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
