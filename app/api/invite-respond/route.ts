import { NextResponse } from "next/server";
import { supabaseAdmin } from "../_lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token = body.token as string | undefined;
    const status = body.status as
      | "pending"
      | "accepted"
      | "declined"
      | undefined;

    if (!token || !status) {
      return NextResponse.json(
        { error: "Token ou statut manquant." },
        { status: 400 }
      );
    }

    // 1) Retrouver l'invite + l'événement
    const { data: inviteData, error: inviteError } = await supabaseAdmin
      .from("invites")
      .select(
        `
        id,
        status,
        event_id,
        events (
          id,
          type
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

    const row: any = inviteData; // on simplifie pour TS
    const event = row.events;

    // 2) Mettre à jour le statut de l'invitation
    const { error: updateError } = await supabaseAdmin
      .from("invites")
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) {
      console.error(updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour de la réponse." },
        { status: 500 }
      );
    }

    // 3) Si refusé ou en attente, on s'arrête là
    if (status !== "accepted") {
      return NextResponse.json({ success: true });
    }

    // 4) Si accepté, vérifier les infos profil minimales
    const firstName = (body.first_name as string | undefined)?.trim();
    const lastName = (body.last_name as string | undefined)?.trim();

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "Prénom et nom requis pour accepter." },
        { status: 400 }
      );
    }

    // Infos optionnelles selon le type d'événement
    const jobTitle =
      event.type === "pro" ? (body.job_title as string | undefined) ?? null : null;
    const company =
      event.type === "pro" ? (body.company as string | undefined) ?? null : null;
    const relationLabel =
      event.type === "perso"
        ? (body.relation_label as string | undefined) ?? null
        : null;
    const familyGroup =
      event.type === "perso"
        ? (body.family_group as string | undefined) ?? null
        : null;

    // 5) Créer le participant
    const { error: participantError } = await supabaseAdmin
      .from("participants")
      .insert([
        {
          event_id: row.event_id,
          user_id: null, // pas de compte invité dans ce MVP
          first_name: firstName,
          last_name: lastName,
          role_type: event.type, // "pro" ou "perso"
          job_title: jobTitle,
          company: company,
          relation_label: relationLabel,
          family_group: familyGroup,
          tags: null,
        },
      ]);

    if (participantError) {
      console.error(participantError);
      return NextResponse.json(
        { error: "Erreur lors de la création du participant." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur serveur lors de la réponse à l'invitation." },
      { status: 500 }
    );
  }
}
