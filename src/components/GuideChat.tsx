"use client";

import { FormEvent, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Où manger à Douala ce soir ?",
  "Restaurants romantiques à Yaoundé",
  "Bon rapport qualité-prix à Kribi",
  "Spots pour un week-end gastronomique",
];

export function GuideChat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Je suis ton guide Cameroun. Dis-moi une ville, une envie (terrasse, fruits de mer, budget…) et je te propose des lieux réels de notre base.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Erreur guide" }));
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              err.error ||
              "Le guide IA est indisponible pour le moment. Explore la carte et les fiches lieux en attendant.",
          },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value, { stream: true });
        const snapshot = assistant;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: snapshot };
          return copy;
        });
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Connexion au guide interrompue. Tu peux continuer à découvrir les lieux sans l’IA.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[rgba(22,36,28,0.85)]">
      <header className="border-b border-[var(--line)] px-5 py-4">
        <p className="text-xs tracking-[0.22em] uppercase text-[var(--accent)]">Guide IA</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl">
          Demande un itinéraire
        </h2>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((msg, i) => (
          <div
            key={`${msg.role}-${i}`}
            className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "ml-auto bg-[var(--leaf)] text-white"
                : "bg-[rgba(243,236,220,0.06)] text-[#efe8da]"
            }`}
          >
            {msg.content || (loading ? "…" : "")}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[var(--line)] px-4 py-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void send(s)}
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-soft)]"
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-[var(--line)] p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex. 2 jours à Douala, restos + vue…"
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[rgba(15,26,20,0.8)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[#1a1408] transition hover:bg-[var(--accent-soft)] disabled:opacity-60"
        >
          Envoyer
        </button>
      </form>
    </section>
  );
}
