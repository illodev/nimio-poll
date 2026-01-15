// Slack Slash Command Handler
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createPoll } from "../../lib/poll-service";
import { getBotToken } from "../../lib/slack";
import { verifySlackSignature, parseUrlEncodedBody } from "../../lib/utils";
import { buildErrorBlocks } from "../../lib/blocks";
import { MESSAGES } from "../../lib/constants";
import { SlackCommandPayload } from "../../lib/types";

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
        console.error("Signature verification failed for command");
        return res
          .status(401)
          .json({ error: MESSAGES.errors.verificationFailed });
      }
    }

    // Parse body from raw string
    const payload = parseUrlEncodedBody(
      rawBody
    ) as unknown as SlackCommandPayload;

    // Get bot token for team
    let botToken = await getBotToken(payload.team_id);

    // Fallback to environment variable for single-workspace setup
    if (!botToken) {
      botToken = process.env.SLACK_BOT_TOKEN || null;
    }

    if (!botToken) {
      return res.status(200).json({
        response_type: "ephemeral",
        text: "❌ Bot no instalado. Por favor, reinstala la aplicación.",
      });
    }

    // Handle the command
    const result = await createPoll(payload, botToken);

    if (!result.success) {
      return res.status(200).json({
        response_type: "ephemeral",
        blocks: buildErrorBlocks(result.error || "Error desconocido"),
        text: result.error || "Error desconocido",
      });
    }

    // If there's a custom message (like help), return it
    if (result.message) {
      try {
        const parsed = JSON.parse(result.message);
        return res.status(200).json(parsed);
      } catch {
        return res.status(200).json({
          response_type: "ephemeral",
          text: result.message,
        });
      }
    }

    // Success - empty response (poll is posted directly to channel)
    // Return 200 with no body to acknowledge the command
    return res.status(200).send("");
  } catch (error) {
    console.error("Command handler error:", error);
    return res.status(200).json({
      response_type: "ephemeral",
      text: "❌ Error interno. Por favor, inténtalo de nuevo.",
    });
  }
}

// Disable body parsing to get raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
