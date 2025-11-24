"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type EventRow = {
    id: string;
    name: string;
    description: string | null;
    type: "pro" | "perso";
    date: string | null;
    location: string | null;
};

export default function DashboardPage() {
    const [email, setEmail] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    // Champs du formulaire
    const [eventType, setEventType] = useState<"pro" | "perso">("pro");
    const [eventName, setEventName] = useState("");
    const [eventDescription, setEventDescription] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [eventLocation, setEventLocation] = useState("");

    const [saving, setSaving] = useState(false);
    const [formMessage, setFormMessage] = useState<string | null>(null);

    const [events, setEvents] = useState<EventRow[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);

    // 1) Récupérer l'utilisateur connecté
    useEffect(() => {
        async function run() {
            const { data, error } = await supabase.auth.getUser();

            if (error) {
                console.error(error);
            }

            const user = data.user;
            setEmail(user?.email ?? null);
            setUserId(user?.id ?? null);
            setLoadingUser(false);
        }
        run();
    }, []);

    // 2) Charger les événements de cet utilisateur
    useEffect(() => {
        if (!userId) return;

        async function loadEvents() {
            setLoadingEvents(true);
            const { data, error } = await supabase
                .from("events")
                .select("id, name, description, type, date, location")
                .eq("owner_id", userId)
                .order("created_at", { ascending: false });

            if (error) {
                console.error(error);
            } else if (data) {
                setEvents(data as EventRow[]);
            }
            setLoadingEvents(false);
        }

        loadEvents();
    }, [userId]);

    async function handleCreateEvent(e: React.FormEvent) {
        e.preventDefault();
        setFormMessage(null);

        if (!userId) {
            setFormMessage("Utilisateur non connecté.");
            return;
        }

        if (!eventName.trim()) {
            setFormMessage("Merci d'indiquer un nom d'événement.");
            return;
        }

        setSaving(true);

        // Préparer la date au format ISO (si renseignée)
        let dateValue: string | null = null;
        if (eventDate) {
            // ex: "2025-11-17" -> "2025-11-17T00:00:00.000Z"
            dateValue = new Date(eventDate + "T00:00:00").toISOString();
        }

        // 1) Créer l'événement
        const { data: insertEventData, error: insertEventError } = await supabase
            .from("events")
            .insert([
                {
                    owner_id: userId,
                    type: eventType,
                    name: eventName,
                    description: eventDescription || null,
                    date: dateValue,
                    location: eventLocation || null,
                },
            ])
            .select()
            .single();

        if (insertEventError || !insertEventData) {
            console.error(insertEventError);
            setFormMessage("Erreur lors de la création de l'événement.");
            setSaving(false);
            return;
        }

        const eventId = insertEventData.id as string;

        // 2) Créer le membership owner
        const { error: membershipError } = await supabase
            .from("event_memberships")
            .insert([
                {
                    event_id: eventId,
                    user_id: userId,
                    role: "owner",
                },
            ]);

        if (membershipError) {
            console.error(membershipError);
            setFormMessage(
                "Événement créé, mais erreur lors de la création du membership."
            );
            setSaving(false);
            return;
        }

        setFormMessage("Événement créé ✅");

        // Réinitialiser le formulaire
        setEventName("");
        setEventDescription("");
        setEventDate("");
        setEventLocation("");

        // Mettre à jour la liste des événements localement
        setEvents((prev) => [
            {
                id: eventId,
                name: insertEventData.name,
                description: insertEventData.description,
                type: insertEventData.type,
                date: insertEventData.date,
                location: insertEventData.location,
            },
            ...prev,
        ]);

        setSaving(false);
    }
    async function handleDeleteEvent(id: string) {
        const confirmation = window.confirm(
            "Es-tu sûr de vouloir supprimer cet événement ? Cela supprimera aussi les invitations et participants associés."
        );
        if (!confirmation) return;

        const { error } = await supabase.from("events").delete().eq("id", id);

        if (error) {
            console.error(error);
            setFormMessage("Erreur lors de la suppression de l'événement.");
            return;
        }

        // On retire l'événement de la liste localement
        setEvents((prev) => prev.filter((evt) => evt.id !== id));
        setFormMessage("Événement supprimé ✅");
    }

    if (loadingUser) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="p-6 rounded-xl border max-w-md w-full">
                    <p>Chargement utilisateur...</p>
                </div>
            </main>
        );
    }

    if (!email || !userId) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="p-6 rounded-xl border max-w-md w-full">
                    <h1 className="text-2xl font-bold mb-4">Tableau de bord</h1>
                    <p>Utilisateur non connecté. Retourne à la page de connexion.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex flex-col items-center p-6">
            <div className="w-full max-w-2xl space-y-6">
                <section className="p-4 rounded-xl border">
                    <h1 className="text-2xl font-bold mb-2">Bonjour {email}</h1>
                    <p className="mb-2">Crée ton premier événement 👇</p>

                    <form onSubmit={handleCreateEvent} className="space-y-4 mt-4">
                        <div className="flex gap-4 items-center">
                            <span className="text-sm">Type d'événement :</span>
                            <label className="flex items-center gap-1 text-sm">
                                <input
                                    type="radio"
                                    name="type"
                                    value="pro"
                                    checked={eventType === "pro"}
                                    onChange={() => setEventType("pro")}
                                />
                                <span>Pro</span>
                            </label>
                            <label className="flex items-center gap-1 text-sm">
                                <input
                                    type="radio"
                                    name="type"
                                    value="perso"
                                    checked={eventType === "perso"}
                                    onChange={() => setEventType("perso")}
                                />
                                <span>Perso</span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">
                                Nom de l&apos;événement
                            </label>
                            <input
                                type="text"
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                                className="w-full border rounded-md px-3 py-2"
                                placeholder="Anniversaire de Paul, Afterwork équipe marketing..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Description (optionnel)</label>
                            <textarea
                                value={eventDescription}
                                onChange={(e) => setEventDescription(e.target.value)}
                                className="w-full border rounded-md px-3 py-2"
                                rows={3}
                                placeholder="Quelques mots sur l'événement..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm mb-1">Date</label>
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="w-full border rounded-md px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Lieu (optionnel)</label>
                                <input
                                    type="text"
                                    value={eventLocation}
                                    onChange={(e) => setEventLocation(e.target.value)}
                                    className="w-full border rounded-md px-3 py-2"
                                    placeholder="Adresse, ville, etc."
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-md px-4 py-2 border text-sm font-medium"
                        >
                            {saving ? "Création en cours..." : "Créer l'événement"}
                        </button>

                        {formMessage && (
                            <p className="text-sm mt-2">
                                {formMessage}
                            </p>
                        )}
                    </form>
                </section>

                <section className="p-4 rounded-xl border">
                    <h2 className="text-xl font-bold mb-3">Mes événements</h2>
                    {loadingEvents ? (
                        <p>Chargement des événements...</p>
                    ) : events.length === 0 ? (
                        <p>Aucun événement pour le moment.</p>
                    ) : (
                        <ul className="space-y-3">
                            {events.map((evt) => (
                                <li
                                    key={evt.id}
                                    className="border rounded-md px-3 py-2 text-sm flex flex-col gap-1"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold">{evt.name}</span>
                                        <span className="text-xs uppercase border rounded-full px-2 py-0.5">
                                            {evt.type}
                                        </span>
                                    </div>
                                    {evt.date && (
                                        <span className="text-xs">
                                            Date : {new Date(evt.date).toLocaleDateString()}
                                        </span>
                                    )}
                                    {evt.location && (
                                        <span className="text-xs">Lieu : {evt.location}</span>
                                    )}
                                    {evt.description && (
                                        <span className="text-xs text-gray-700">
                                            {evt.description}
                                        </span>
                                    )}

                                    <div className="mt-2 flex flex-wrap gap-4 text-xs items-center">
                                        <a
                                            href={`/event/${evt.id}/invites`}
                                            className="underline"
                                        >
                                            Gérer les invitations
                                        </a>
                                        <a
                                            href={`/event/${evt.id}/participants`}
                                            className="underline"
                                        >
                                            Voir les participants
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteEvent(evt.id)}
                                            className="text-red-600 underline"
                                        >
                                            Supprimer l'événement
                                        </button>
                                    </div>



                                </li>
                            ))}

                        </ul>
                    )}
                </section>
            </div>
        </main>
    );
}
