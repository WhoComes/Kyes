"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Connexion en cours...");

  useEffect(() => {
    async function run() {
      // On regarde simplement si une session existe déjà
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setStatus("Erreur : " + error.message);
        return;
      }

      if (data.session) {
        // L’utilisateur est bien connecté
        setStatus("Connexion réussie ✅ Redirection...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        // Aucune session → probablement lien expiré ou mauvais navigateur
        setStatus(
          "Impossible de trouver la session. Retourne à la page de connexion et réessaie."
        );
      }
    }

    run();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="p-6 rounded-xl border max-w-sm w-full">
        <h1 className="text-xl font-bold mb-2">Retour de connexion</h1>
        <p>{status}</p>
      </div>
    </main>
  );
}
