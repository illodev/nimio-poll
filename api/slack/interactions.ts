// Slack Interactions Handler (buttons, modals, etc.)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleInteraction, getBotToken } from "../../lib/slack";
import { verifySlackSignature } from "../../lib/utils";

// Helper to read raw body from stream
async function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on("end", () => {
      resolve(data);
    });
    req.on("error", reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Read raw body for signature verification
    const rawBody = await readRawBody(req);

    // Verify Slack signature
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    const signature = req.headers["x-slack-signature"] as string;
    const timestamp = req.headers["x-slack-request-timestamp"] as string;

    if (signingSecret && signature && timestamp) {
      const isValid = verifySlackSignature(
        signingSecret,
        signature,
        timestamp,
        rawBody
      );
      if (!isValid) {
        console.error("Signature verification failed for interactions");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    // Parse payload from raw body
    const params = new URLSearchParams(rawBody);
    const payloadStr = params.get("payload");

    if (!payloadStr) {
      return res.status(400).json({ error: "Missing payload" });
    }

    const payload = JSON.parse(payloadStr);

    if (!payload || !payload.type) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // Handle URL verification (shouldn't happen for interactions but just in case)
    if (payload.type === "url_verification") {
      return res.status(200).json({ challenge: payload.challenge });
    }

    // Get bot token
    let botToken = await getBotToken(payload.team?.id || payload.user?.team_id);
    if (!botToken) {
      botToken = process.env.SLACK_BOT_TOKEN || null;
    }

    if (!botToken) {
      return res.status(200).json({
        response_type: "ephemeral",
        text: "❌ Bot no configurado correctamente.",
      });
    }

    // Handle the interaction
    const result = await handleInteraction(payload, botToken);

    // For modal submissions, we need to respond immediately
    if (payload.type === "view_submission") {
      if (result.response) {
        return res.status(200).json(result.response);
      }
      return res.status(200).send("");
    }

    // For block actions, respond with acknowledgment
    if (result.response) {
      return res.status(200).json(result.response);
    }

    return res.status(200).send("");
  } catch (error) {
    console.error("Interaction handler error:", error);
    return res.status(200).json({
      response_type: "ephemeral",
      text: "❌ Error procesando la interacción.",
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
