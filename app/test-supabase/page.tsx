"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

export default function TestSupabasePage() {
  const [status, setStatus] = useState("Test en cours...");

  useEffect(() => {
    async function run() {
      const { error } = await supabase.auth.getSession();
      if (error) {
        setStatus("Erreur : " + error.message);
      } else {
        setStatus("Connexion Supabase OK ✅");
      }
    }
    run();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="p-6 rounded-xl border">
        <h1 className="text-xl font-bold mb-2">Test Supabase</h1>
        <p>{status}</p>
      </div>
    </main>
  );
}
