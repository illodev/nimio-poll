// Cron job to automatically close expired polls
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { WebClient } from "@slack/web-api";
import { getStorage } from "../../lib/storage";
import { buildPollBlocks } from "../../lib/blocks";

const Storage = getStorage();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret to prevent unauthorized access
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Get all expired polls that are not yet closed
    const expiredPolls = await Storage.getExpiredPolls();

    if (expiredPolls.length === 0) {
      return res
        .status(200)
        .json({ message: "No expired polls to close", closed: 0 });
    }

    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: "SLACK_BOT_TOKEN not configured" });
    }

    const client = new WebClient(botToken);
    let closedCount = 0;
    const errors: string[] = [];

    for (const poll of expiredPolls) {
      try {
        // Mark poll as closed
        poll.isClosed = true;
        await Storage.savePoll(poll);

        // Update the Slack message
        if (poll.messageTs && poll.channelId) {
          await client.chat.update({
            channel: poll.channelId,
            ts: poll.messageTs,
            blocks: buildPollBlocks(poll),
            text: `📊 Encuesta cerrada: ${poll.question}`,
          });
        }

        closedCount++;
      } catch (error) {
        console.error(`Error closing poll ${poll.id}:`, error);
        errors.push(poll.id);
      }
    }

    return res.status(200).json({
      message: `Closed ${closedCount} expired polls`,
      closed: closedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
