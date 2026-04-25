import { useLanguage, LANGUAGES } from "@/lib/language";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();

  return (
    <label className="relative inline-flex items-center" title="Interface & AI language">
      <span className="pointer-events-none absolute left-2 text-sm">{language.flag}</span>
      <select
        value={language.code}
        onChange={(e) => setLanguage(e.target.value)}
        aria-label="Select language"
        className={`appearance-none rounded-md border border-border bg-background/60 pl-7 pr-6 py-1.5 text-xs font-medium text-foreground hover:border-primary/50 focus:outline-none focus:border-primary transition ${
          compact ? "max-w-[110px]" : ""
        }`}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.nativeName}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1.5 text-[10px] text-muted-foreground">▼</span>
    </label>
  );
}
