// Slack Events Handler (for app mentions, etc.)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifySlackSignature } from "../../lib/utils";
import { MESSAGES } from "../../lib/constants";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;

    // Handle URL verification challenge
    if (body.type === "url_verification") {
      return res.status(200).json({ challenge: body.challenge });
    }

    // Verify Slack signature
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    const signature = req.headers["x-slack-signature"] as string;
    const timestamp = req.headers["x-slack-request-timestamp"] as string;

    if (signingSecret && signature && timestamp) {
      const rawBody = JSON.stringify(body);
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

    // Handle different event types
    if (body.type === "event_callback") {
      const event = body.event;

      switch (event.type) {
        case "app_mention":
          // Handle app mention - could trigger help or create poll
          console.log("App mentioned:", event);
          break;

        case "app_uninstalled":
          // Clean up when app is uninstalled
          console.log("App uninstalled from team:", body.team_id);
          break;

        case "tokens_revoked":
          // Handle token revocation
          console.log("Tokens revoked for team:", body.team_id);
          break;

        default:
          console.log("Unhandled event type:", event.type);
      }
    }

    // Acknowledge receipt
    return res.status(200).send("");
  } catch (error) {
    console.error("Events handler error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
