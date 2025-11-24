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

type ParticipantRow = {
    id: string;
    first_name: string;
    last_name: string;
    role_type: "pro" | "perso";
    job_title: string | null;
    company: string | null;
    relation_label: string | null;
    family_group: string | null;
};

export default function EventParticipantsPage() {
    const params = useParams();
    const eventId = params.id as string;

    const [event, setEvent] = useState<EventRow | null>(null);
    const [participants, setParticipants] = useState<ParticipantRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const [search, setSearch] = useState("");

    useEffect(() => {
        async function load() {
            setLoading(true);
            setMessage(null);

            // 1) Charger l'événement (vérifie aussi que tu es bien owner, grâce au RLS)
            const { data: eventData, error: eventError } = await supabase
                .from("events")
                .select("id, name, type, date, location")
                .eq("id", eventId)
                .single();

            if (eventError || !eventData) {
                console.error(eventError);
                setMessage(
                    "Impossible de charger cet événement. Es-tu bien son organisateur ?"
                );
                setLoading(false);
                return;
            }

            setEvent(eventData as EventRow);

            // 2) Charger les participants
            setLoadingParticipants(true);
            const { data: participantsData, error: participantsError } = await supabase
                .from("participants")
                .select(
                    "id, first_name, last_name, role_type, job_title, company, relation_label, family_group"
                )
                .eq("event_id", eventId)
                .order("last_name", { ascending: true });

            if (participantsError) {
                console.error(participantsError);
                setMessage("Erreur lors du chargement des participants.");
            } else if (participantsData) {
                setParticipants(participantsData as ParticipantRow[]);
            }

            setLoadingParticipants(false);
            setLoading(false);
        }

        if (eventId) {
            load();
        }
    }, [eventId]);

    const filtered = participants.filter((p) => {
        const text =
            (p.first_name + " " + p.last_name + " " +
                (p.job_title || "") + " " + (p.company || "") +
                " " + (p.relation_label || "") + " " + (p.family_group || "")
            ).toLowerCase();
        return text.includes(search.toLowerCase());
    });

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
                    <p>{message || "Événement introuvable."}</p>
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
                        Participants — {event.name}
                    </h1>
                    <p className="text-sm">
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

                <section className="p-4 rounded-xl border space-y-3">
                    <div className="flex justify-between items-center gap-2">
                        <h2 className="text-lg font-semibold">Liste des participants</h2>
                        <span className="text-xs border rounded-full px-2 py-1">
                            {participants.length} participant(s)
                        </span>
                    </div>

                    <div>
                        <input
                            type="text"
                            placeholder="Rechercher par nom, société, lien familial..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full border rounded-md px-3 py-2 text-sm"
                        />
                    </div>

                    {loadingParticipants ? (
                        <p>Chargement des participants...</p>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm">Aucun participant pour le moment.</p>
                    ) : (
                        <ul className="space-y-2 text-sm">
                            {filtered.map((p) => (
                                <li
                                    key={p.id}
                                    className="border rounded-md px-3 py-2 flex flex-col gap-1"
                                >
                                    <span className="font-semibold">
                                        {p.first_name} {p.last_name}
                                    </span>

                                    {event.type === "pro" ? (
                                        <span>
                                            {p.job_title && <>{p.job_title} · </>}
                                            {p.company}
                                        </span>
                                    ) : (
                                        <>
                                            {p.relation_label && (
                                                <span>{p.relation_label}</span>
                                            )}
                                            {p.family_group && (
                                                <span className="text-xs">
                                                    Groupe / famille : {p.family_group}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    {message && <p className="text-sm mt-2">{message}</p>}
                </section>
            </div>
        </main>
    );
}
