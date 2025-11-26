import { NextResponse } from "next/server";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;
const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

type InvitePayload = {
  contact: string;      // numéro de téléphone
  invite_token: string; // token unique
};

type EventPayload = {
  name: string;
  type: "pro" | "perso";
  date: string | null;
  location?: string | null;
};

export async function POST(request: Request) {
  if (!accountSid || !authToken || !fromNumber) {
    console.error("Twilio env variables manquantes.");
    return NextResponse.json(
      { error: "Configuration SMS manquante côté serveur." },
      { status: 500 }
    );
  }

  const client = twilio(accountSid, authToken);

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

    for (const inv of invites) {
      const inviteLink = `${baseUrl}/invite/${inv.invite_token}`;

      // On tronque le nom de l'événement pour éviter les SMS trop longs
      const shortName =
        event.name.length > 40
          ? event.name.slice(0, 37) + "..."
          : event.name;

      const text = `[Kyes] Invitation à "${shortName}". Réponse : ${inviteLink}`;


      await client.messages.create({
        from: fromNumber,
        to: inv.contact, // doit être un numéro au format international (+33...)
        body: text,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi des SMS." },
      { status: 500 }
    );
  }
}
