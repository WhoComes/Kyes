"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type EventRow = {
  id: string;
  name: string;
  type: "pro" | "perso";
  date: string | null;
  location: string | null;
};

type InviteRow = {
  id: string;
  contact: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  channel: "email" | "sms" | "link" | null;
};

export default function EventInvitesPage() {
  const params = useParams();
  const eventId = params.id as string; // récupère l'id dans l'URL

  const [event, setEvent] = useState<EventRow | null>(null);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const [contactsText, setContactsText] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Charger les infos de l'événement + les invites
  useEffect(() => {
    async function load() {
      setLoading(true);
      // 1) Charger l'événement
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, name, type, date, location")
        .eq("id", eventId)
        .single();

      if (eventError) {
        console.error(eventError);
        setMessage("Erreur lors du chargement de l'événement.");
        setLoading(false);
        return;
      }

      setEvent(eventData as EventRow);

      // 2) Charger les invites
      setLoadingInvites(true);
      const { data: invitesData, error: invitesError } = await supabase
        .from("invites")
        .select("id, contact, status, created_at, channel")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (invitesError) {
        console.error(invitesError);
        setMessage("Erreur lors du chargement des invitations.");
      } else if (invitesData) {
        setInvites(invitesData as InviteRow[]);
      }

      setLoadingInvites(false);
      setLoading(false);
    }

    if (eventId) {
      load();
    }
  }, [eventId]);

  function parseContacts(text: string): string[] {
    // On découpe par ligne ou virgule, on nettoie
    return text
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
  }

  function generateToken() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    // Fallback simple si randomUUID pas dispo
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  async function handleAddInvites(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!eventId || !event) {
      setMessage("Événement introuvable.");
      return;
    }

    const contacts = parseContacts(contactsText);
    if (contacts.length === 0) {
      setMessage("Merci d'indiquer au moins un contact.");
      return;
    }

    // Vérifications simples selon le type de canal
    if (channel === "email") {
      const invalid = contacts.filter((c) => !c.includes("@"));
      if (invalid.length > 0) {
        setMessage(
          "Certains contacts ne ressemblent pas à des emails : " +
            invalid.join(", ")
        );
        return;
      }
    } else if (channel === "sms") {
      const invalid = contacts.filter(
        (c) => !c.startsWith("+") || c.length < 8
      );
      if (invalid.length > 0) {
        setMessage(
          "Certains numéros ne semblent pas au format international (+33...) : " +
            invalid.join(", ")
        );
        return;
      }
    }

    setSaving(true);

    const rowsToInsert = contacts.map((contact) => ({
      event_id: eventId,
      contact,
      channel,
      status: "pending" as const,
      invite_token: generateToken(),
    }));

    const { data, error } = await supabase
      .from("invites")
      .insert(rowsToInsert)
      .select();

    if (error) {
      console.error(error);
      setMessage("Erreur lors de l'ajout des invitations.");
      setSaving(false);
      return;
    }

    try {
      if (channel === "email") {
        // Envoi des emails via l'API Next + Resend
        await fetch("/api/send-invites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invites: data?.map((inv: any) => ({
              contact: inv.contact,
              invite_token: inv.invite_token,
            })),
            event: {
              name: event.name,
              type: event.type,
              date: event.date,
            },
          }),
        });
        setMessage("Invitations ajoutées et emails envoyés ✅");
      } else if (channel === "sms") {
        // Envoi des SMS via Twilio
        await fetch("/api/send-invites-sms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invites: data?.map((inv: any) => ({
              contact: inv.contact,
              invite_token: inv.invite_token,
            })),
            event: {
              name: event.name,
              type: event.type,
              date: event.date,
              location: event.location,
            },
          }),
        });
        setMessage("Invitations ajoutées et SMS envoyés ✅");
      }
    } catch (e) {
      console.error(e);
      setMessage(
        channel === "email"
          ? "Invitations ajoutées, mais erreur lors de l'envoi des emails."
          : "Invitations ajoutées, mais erreur lors de l'envoi des SMS."
      );
    }

    setContactsText("");

    // Mettre à jour la liste locale
    if (data) {
      setInvites((prev) => [...(data as InviteRow[]), ...prev]);
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="p-6 rounded-xl border max-w-md w-full">
          <p>Chargement...</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="p-6 rounded-xl border max-w-md w-full">
          <p>Événement introuvable.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <section className="p-4 rounded-xl border">
          <a href="/dashboard" className="text-xs underline">
            ← Retour au tableau de bord
          </a>
          <h1 className="text-2xl font-bold mb-2 mt-2">
            Invitations pour : {event.name}
          </h1>
          <p className="text-sm mb-1">
            Type : {event.type === "pro" ? "Professionnel" : "Personnel"}
          </p>
          {event.date && (
            <p className="text-sm">
              Date : {new Date(event.date).toLocaleDateString()}
            </p>
          )}
          {event.location && (
            <p className="text-sm">Lieu : {event.location}</p>
          )}
        </section>

        <section className="p-4 rounded-xl border">
          <h2 className="text-lg font-semibold mb-2">
            Ajouter des invités
          </h2>

          <form onSubmit={handleAddInvites} className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <span>Inviter par :</span>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="channel"
                  value="email"
                  checked={channel === "email"}
                  onChange={() => setChannel("email")}
                />
                <span>Email</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="channel"
                  value="sms"
                  checked={channel === "sms"}
                  onChange={() => setChannel("sms")}
                />
                <span>SMS</span>
              </label>
            </div>

            <div>
              <label className="block text-sm mb-1">
                {channel === "email"
                  ? "Emails (un par ligne ou séparés par des virgules)"
                  : "Numéros de téléphone (format international, un par ligne ou séparés par des virgules)"}
              </label>
              <textarea
                value={contactsText}
                onChange={(e) => setContactsText(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                rows={4}
                placeholder={
                  channel === "email"
                    ? "ex:\ninvite1@example.com\ninvite2@example.com"
                    : "ex:\n+33612345678\n+33698765432"
                }
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md px-4 py-2 border text-sm font-medium"
            >
              {saving
                ? "Ajout en cours..."
                : channel === "email"
                ? "Ajouter et envoyer les emails"
                : "Ajouter et envoyer les SMS"}
            </button>
          </form>
          {message && <p className="text-sm mt-2">{message}</p>}
        </section>

        <section className="p-4 rounded-xl border">
          <h2 className="text-lg font-semibold mb-3">Invitations existantes</h2>
          {loadingInvites ? (
            <p>Chargement des invitations...</p>
          ) : invites.length === 0 ? (
            <p>Aucune invitation pour le moment.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="border rounded-md px-3 py-2 flex flex-col gap-1"
                >
                  <span>{inv.contact}</span>
                  <span className="text-xs">
                    Canal : {inv.channel || "email"}
                  </span>
                  <span className="text-xs">
                    Statut :{" "}
                    {inv.status === "pending"
                      ? "En attente"
                      : inv.status === "accepted"
                      ? "Acceptée"
                      : "Refusée"}
                  </span>
                  <span className="text-xs">
                    Ajoutée le :{" "}
                    {new Date(inv.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
