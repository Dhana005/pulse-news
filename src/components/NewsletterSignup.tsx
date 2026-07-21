"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      className="mb-10 md:mb-14 rounded-[10px] px-6 py-8 md:px-10 md:py-10 flex flex-col gap-3"
      style={{ background: "var(--accent)", color: "var(--accent-text)" }}
    >
      <div className="flex flex-col md:flex-row items-center gap-5 md:gap-8">
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-[20px] md:text-[24px] font-bold m-0 mb-1.5">முக்கிய செய்திகள் உங்கள் மெயிலில்!</h2>
          <p className="text-[14px] md:text-[15px] m-0 opacity-90">
            தினசரி முக்கிய செய்திகள், சிறப்பு கட்டுரைகள் மற்றும் அப்டேட்களை நேரடியாக பெறுங்கள்.
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex w-full md:w-auto gap-2.5">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="உங்கள் மெயில் முகவரி"
            className="flex-1 md:w-64 px-4 py-3 rounded-lg text-[14.5px] text-text bg-surface border-0 outline-none"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-5 py-3 rounded-lg font-semibold text-[14.5px] cursor-pointer shrink-0 disabled:opacity-70"
            style={{ background: "var(--accent-text)", color: "var(--accent)" }}
          >
            {status === "loading" ? "…" : "சப்ஸ்கிரைப் செய்யுங்கள்"}
          </button>
        </form>
      </div>
      {status === "done" && (
        <span className="text-[13px] opacity-90 text-center md:text-right">சேர்க்கப்பட்டது, நன்றி!</span>
      )}
      {status === "error" && (
        <span className="text-[13px] opacity-90 text-center md:text-right">பிழை — மீண்டும் முயற்சிக்கவும்.</span>
      )}
    </section>
  );
}
