// OAuth Start - Redirects to Slack OAuth
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri =
    process.env.SLACK_REDIRECT_URI ||
    `${req.headers.host}/api/slack/oauth/redirect`;

  if (!clientId) {
    return res.status(500).json({ error: "SLACK_CLIENT_ID not configured" });
  }

  // Required scopes for the bot
  const scopes = [
    "chat:write",
    "chat:write.public",
    "commands",
    "users:read",
    "channels:read",
    "groups:read",
    "im:read",
    "mpim:read",
  ].join(",");

  // User scopes (optional, for user-specific actions)
  const userScopes = ["users:read"].join(",");

  const slackAuthUrl = new URL("https://slack.com/oauth/v2/authorize");
  slackAuthUrl.searchParams.set("client_id", clientId);
  slackAuthUrl.searchParams.set("scope", scopes);
  slackAuthUrl.searchParams.set("user_scope", userScopes);
  slackAuthUrl.searchParams.set("redirect_uri", `https://${redirectUri}`);

  return res.redirect(slackAuthUrl.toString());
}
