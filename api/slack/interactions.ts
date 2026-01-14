// Slack Interactions Handler (buttons, modals, etc.)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleInteraction, getBotToken } from "../../lib/slack";
import { verifySlackSignature, parseUrlEncodedBody } from "../../lib/utils";
import { MESSAGES } from "../../lib/constants";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get raw body for signature verification
    const rawBody =
      typeof req.body === "string"
        ? req.body
        : new URLSearchParams(req.body).toString();

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
        console.error("Signature verification failed");
        return res
          .status(401)
          .json({ error: MESSAGES.errors.verificationFailed });
      }
    }

    // Parse payload from form data
    let payload;
    if (typeof req.body === "string") {
      const parsed = parseUrlEncodedBody(req.body);
      payload = JSON.parse(parsed.payload || "{}");
    } else if (req.body.payload) {
      payload = JSON.parse(req.body.payload);
    } else {
      payload = req.body;
    }

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
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
