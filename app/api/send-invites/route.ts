import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type InvitePayload = {
  contact: string;      // email
  invite_token: string; // token unique
};

type EventPayload = {
  name: string;
  type: "pro" | "perso";
  date: string | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const invites = body.invites as InvitePayload[] | undefined;
    const event = body.event as EventPayload | undefined;

    if (!invites || !event || invites.length === 0) {
      return NextResponse.json(
        { error: "Données manquantes (invites / event)." },
        { status: 400 }
      );
    }

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const fromEmail =
      process.env.INVITE_FROM_EMAIL || "WHOcomes <onboarding@resend.dev>";

    // On envoie les emails un par un (MVP)
    for (const inv of invites) {
      const inviteLink = `${baseUrl}/invite/${inv.invite_token}`;

      const subject =
        event.type === "pro"
          ? `Invitation (Kyes) à l'événement pro : ${event.name}`
          : `Invitation (Kyes) à l'événement : ${event.name}`;

      const html = `
        <div style="font-family: sans-serif; line-height: 1.4;">
          <h1>${event.name}</h1>
          <p>Vous êtes invité${event.type === "pro" ? "" : "e"} à cet événement.</p>
          ${
            event.date
              ? `<p><strong>Date :</strong> ${new Date(
                  event.date
                ).toLocaleDateString()}</p>`
              : ""
          }
          <p>Pour répondre à l'invitation et compléter vos informations, cliquez sur le lien ci-dessous :</p>
          <p>
            <a href="${inviteLink}" style="display:inline-block;padding:8px 12px;border-radius:6px;border:1px solid #000;text-decoration:none;color:#000;">
              Répondre à l'invitation
            </a>
          </p>
          <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
          <p>${inviteLink}</p>
        </div>
      `;

      await resend.emails.send({
        from: fromEmail,
        to: inv.contact,
        subject,
        html,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi des invitations." },
      { status: 500 }
    );
  }
}
