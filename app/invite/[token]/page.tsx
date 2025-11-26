"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type InviteInfo = {
    invite: {
        id: string;
        contact: string;
        status: "pending" | "accepted" | "declined";
    };
    event: {
        id: string;
        name: string;
        type: "pro" | "perso";
        date: string | null;
        location: string | null;
    };
};

export default function InvitePage() {
    const params = useParams();
    const token = params.token as string;

    const [info, setInfo] = useState<InviteInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingAction, setLoadingAction] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<
        "pending" | "accepted" | "declined" | null
    >(null);

    // Champs profil si accepté
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    const [jobTitle, setJobTitle] = useState("");
    const [company, setCompany] = useState("");

    const [relationLabel, setRelationLabel] = useState("");
    const [familyGroup, setFamilyGroup] = useState("");

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoUploading, setPhotoUploading] = useState(false);


    // Charger les infos d'invitation + événement
    useEffect(() => {
        async function load() {
            setLoading(true);
            setMessage(null);

            try {
                const res = await fetch(`/api/invite-info?token=${token}`);
                if (!res.ok) {
                    const body = await res.json();
                    setMessage(body.error || "Invitation introuvable.");
                    setLoading(false);
                    return;
                }

                const data = (await res.json()) as InviteInfo;
                setInfo(data);
            } catch (e) {
                console.error(e);
                setMessage("Erreur lors du chargement de l'invitation.");
            } finally {
                setLoading(false);
            }
        }

        if (token) {
            load();
        }
    }, [token]);

    async function handleRespond(status: "pending" | "accepted" | "declined") {
        setSelectedStatus(status);
        setMessage(null);

        if (status !== "accepted") {
            setLoadingAction(true);
            try {
                const res = await fetch("/api/invite-respond", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        token,
                        status,
                    }),
                });

                const body = await res.json();

                if (!res.ok) {
                    setMessage(body.error || "Erreur lors de l'enregistrement de la réponse.");
                } else {
                    // 🔹 Met à jour le statut localement
                    setInfo((prev) =>
                        prev
                            ? {
                                ...prev,
                                invite: {
                                    ...prev.invite,
                                    status,
                                },
                            }
                            : prev
                    );

                    if (status === "pending") {
                        setMessage("Votre réponse est enregistrée : vous répondrez plus tard.");
                    } else if (status === "declined") {
                        setMessage("Votre refus est enregistré. Merci de votre réponse.");
                    }
                }
            } catch (e) {
                console.error(e);
                setMessage("Erreur lors de l'enregistrement de la réponse.");
            } finally {
                setLoadingAction(false);
            }
        }
    }


    async function handleAcceptSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage(null);

        if (!info) return;

        if (!firstName.trim() || !lastName.trim()) {
            setMessage("Merci d'indiquer votre prénom et votre nom.");
            return;
        }

        setLoadingAction(true);

        try {
            let photoUrl: string | null = null;

            // 1) Si une photo est choisie, on l'upload dans Supabase Storage telle quelle
            if (photoFile) {
                setPhotoUploading(true);

                const fileExt =
                    photoFile.name.split(".").pop() || "jpg";
                const fileName = `${token}-${Date.now()}.${fileExt}`;
                const filePath = `participants/${fileName}`;

                const { data: uploadData, error: uploadError } =
                    await supabase.storage
                        .from("participant-photos")
                        .upload(filePath, photoFile, {
                            contentType: photoFile.type || "image/jpeg",
                        });

                if (uploadError) {
                    console.error(uploadError);
                    setMessage(
                        "Erreur lors du téléversement de la photo. Tu peux réessayer ou continuer sans photo."
                    );
                    setPhotoUploading(false);
                    setLoadingAction(false);
                    return;
                }

                const { data: publicUrlData } = supabase.storage
                    .from("participant-photos")
                    .getPublicUrl(uploadData.path);

                photoUrl = publicUrlData.publicUrl;
                setPhotoUploading(false);
            }

            // 2) On envoie la réponse d'invitation avec l'URL de la photo (si présente)
            const res = await fetch("/api/invite-respond", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    status: "accepted",
                    first_name: firstName,
                    last_name: lastName,
                    role_type: info.event.type,
                    job_title: info.event.type === "pro" ? jobTitle : undefined,
                    company: info.event.type === "pro" ? company : undefined,
                    relation_label:
                        info.event.type === "perso" ? relationLabel : undefined,
                    family_group: info.event.type === "perso" ? familyGroup : undefined,
                    photo_url: photoUrl,
                }),
            });

            const body = await res.json();

            if (!res.ok) {
                setMessage(
                    body.error || "Erreur lors de l'acceptation de l'invitation."
                );
            } else {
                setMessage("Votre participation est enregistrée ✅");
            }
        } catch (e) {
            console.error(e);
            setMessage("Erreur lors de l'acceptation de l'invitation.");
        } finally {
            setLoadingAction(false);
        }
    }


    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="p-6 rounded-xl border max-w-md w-full">
                    <p>Chargement de l'invitation...</p>
                </div>
            </main>
        );
    }

    if (!info) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="p-6 rounded-xl border max-w-md w-full">
                    <p>{message || "Invitation introuvable."}</p>
                </div>
            </main>
        );
    }

    const { event, invite } = info;

    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <div className="p-6 rounded-xl border max-w-md w-full space-y-4">
                <h1 className="text-2xl font-bold">{event.name}</h1>
                <p className="text-sm">
                    Vous êtes invité à cet événement{" "}
                    {event.type === "pro" ? "professionnel" : "personnel"}.
                </p>
                {event.date && (
                    <p className="text-sm">
                        Date : {new Date(event.date).toLocaleDateString()}
                    </p>
                )}
                {event.location && (
                    <p className="text-sm">Lieu : {event.location}</p>
                )}

                <div className="border-t pt-3">
                    <p className="text-sm mb-2">
                        Statut actuel de votre invitation :{" "}
                        <strong>
                            {invite.status === "pending"
                                ? "En attente"
                                : invite.status === "accepted"
                                    ? "Acceptée"
                                    : "Refusée"}
                        </strong>
                    </p>

                    <div className="flex flex-col gap-2 text-sm">
                        <button
                            className="border rounded-md px-3 py-2 text-left"
                            disabled={loadingAction}
                            onClick={() => handleRespond("pending")}
                        >
                            Je répondrai plus tard
                        </button>
                        <button
                            className="border rounded-md px-3 py-2 text-left"
                            disabled={loadingAction}
                            onClick={() => handleRespond("declined")}
                        >
                            Je ne pourrai pas venir
                        </button>
                        <button
                            className="border rounded-md px-3 py-2 text-left"
                            disabled={loadingAction}
                            onClick={() => setSelectedStatus("accepted")}
                        >
                            J&apos;accepte et je serai présent(e)
                        </button>
                    </div>
                </div>

                {selectedStatus === "accepted" && (
                    <form
                        onSubmit={handleAcceptSubmit}
                        className="border-t pt-3 space-y-3 text-sm"
                    >
                        <p className="font-semibold">
                            Merci de compléter vos informations :
                        </p>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="block mb-1">Prénom</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full border rounded-md px-2 py-1"
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block mb-1">Nom</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full border rounded-md px-2 py-1"
                                    required
                                />
                            </div>
                        </div>

                        {event.type === "pro" ? (
                            <>
                                <div>
                                    <label className="block mb-1">Poste (optionnel)</label>
                                    <input
                                        type="text"
                                        value={jobTitle}
                                        onChange={(e) => setJobTitle(e.target.value)}
                                        className="w-full border rounded-md px-2 py-1"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1">
                                        Société / Organisation (optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        value={company}
                                        onChange={(e) => setCompany(e.target.value)}
                                        className="w-full border rounded-md px-2 py-1"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block mb-1">
                                        Vous êtes qui pour l&apos;événement ? (ex: fils de..., ami
                                        de...)
                                    </label>
                                    <input
                                        type="text"
                                        value={relationLabel}
                                        onChange={(e) => setRelationLabel(e.target.value)}
                                        className="w-full border rounded-md px-2 py-1"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1">
                                        Groupe / Famille (optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        value={familyGroup}
                                        onChange={(e) => setFamilyGroup(e.target.value)}
                                        className="w-full border rounded-md px-2 py-1"
                                    />
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block mb-1 font-medium">Photo (optionnel)</label>

                            <button
                                type="button"
                                onClick={() => document.getElementById("photo-input")?.click()}
                                className="border rounded-md px-3 py-2 text-sm font-medium w-full flex items-center justify-center gap-2 bg-blue-600 text-white"
                            >
                                <span>📸 Ajouter une photo</span>
                            </button>

                            <input
                                id="photo-input"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setPhotoFile(file);
                                    if (file) {
                                        const url = URL.createObjectURL(file);
                                        setPhotoPreview(url);
                                    } else {
                                        setPhotoPreview(null);
                                    }
                                }}
                                className="hidden"
                            />

                            <p className="text-xs text-gray-600 mt-2">
                                Ajouter ta photo permet aux autres participants de mettre un visage sur ton
                                nom, et tu pourras aussi voir la photo des autres. C&apos;est facultatif
                                mais fortement recommandé.
                            </p>

                            {photoPreview && (
                                <div className="mt-3">
                                    <p className="text-xs mb-1">Aperçu de ta photo :</p>
                                    <img
                                        src={photoPreview}
                                        alt="Aperçu photo"
                                        className="w-28 h-28 rounded-full object-cover border mx-auto"
                                    />
                                </div>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={loadingAction}
                            className="border rounded-md px-3 py-2 text-sm font-medium"
                        >
                            {loadingAction ? "Enregistrement..." : "Valider ma participation"}
                        </button>
                    </form>
                )}
                {invite.status === "accepted" && (
                    <div className="border-t pt-3 mt-2">
                        <a
                            href={`/invite/${token}/participants`}
                            className="text-sm underline"
                        >
                            Voir la liste des participants
                        </a>
                    </div>
                )}

                {message && <p className="text-sm mt-2">{message}</p>}
            </div>
        </main>
    );
}
