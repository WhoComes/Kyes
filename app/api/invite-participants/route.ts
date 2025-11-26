import { NextResponse } from "next/server";
import { supabaseAdmin } from "../_lib/supabaseAdmin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token manquant." },
      { status: 400 }
    );
  }

  // 1) Retrouver l'invitation et l'événement
  const { data: inviteData, error: inviteError } = await supabaseAdmin
    .from("invites")
    .select(
      `
      id,
      status,
      event_id,
      events (
        id,
        name,
        type,
        date,
        location
      )
    `
    )
    .eq("invite_token", token)
    .single();

  if (inviteError || !inviteData) {
    console.error(inviteError);
    return NextResponse.json(
      { error: "Invitation introuvable." },
      { status: 404 }
    );
  }

  const row: any = inviteData;

  if (row.status !== "accepted") {
    return NextResponse.json(
      { error: "Seules les invitations acceptées peuvent voir la liste des participants." },
      { status: 403 }
    );
  }

  const event = row.events;

  // 2) Récupérer les participants de cet événement
  const { data: participantsData, error: participantsError } = await supabaseAdmin
    .from("participants")
    .select(
      "id, first_name, last_name, role_type, job_title, company, relation_label, family_group, photo_url"
    )

    .eq("event_id", row.event_id)
    .order("last_name", { ascending: true });

  if (participantsError) {
    console.error(participantsError);
    return NextResponse.json(
      { error: "Erreur lors du chargement des participants." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    event: {
      id: event.id,
      name: event.name,
      type: event.type,
      date: event.date,
      location: event.location,
    },
    participants: participantsData ?? [],
  });
}
