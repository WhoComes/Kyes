"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("Erreur : " + error.message);
    } else {
      setStatus(
        "Si cet email existe, un lien de connexion vient d'être envoyé. Vérifie ta boîte mail."
      );
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="p-6 rounded-xl border max-w-sm w-full">
        <h1 className="text-xl font-bold mb-4">Connexion organisateur</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              placeholder="toi@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md px-3 py-2 font-medium border"
          >
            {loading ? "Envoi en cours..." : "Envoyer un lien de connexion"}
          </button>
        </form>
        {status && <p className="mt-4 text-sm">{status}</p>}
      </div>
    </main>
  );
}
