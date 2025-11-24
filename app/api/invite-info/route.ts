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

    // On récupère l'invite + les infos de l'événement associé
    const { data, error } = await supabaseAdmin
        .from("invites")
        .select(
            `
      id,
      contact,
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

    if (error || !data) {
        console.error(error);
        return NextResponse.json(
            { error: "Invitation introuvable." },
            { status: 404 }
        );
    }

    // Ici on dit juste à TypeScript : "considère data comme any"
    const row: any = data;

    return NextResponse.json({
        invite: {
            id: row.id,
            contact: row.contact,
            status: row.status,
        },
        event: {
            id: row.events.id,
            name: row.events.name,
            type: row.events.type,
            date: row.events.date,
            location: row.events.location,
        },
    });
}
