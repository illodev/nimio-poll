// Main API endpoint - Health check and info
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    name: "Nimio Poll",
    version: "1.0.0",
    description: "Modern polling app for Slack",
    status: "running",
    endpoints: {
      slash_command: "/api/slack/command",
      interactions: "/api/slack/interactions",
      oauth: "/api/slack/oauth",
      oauth_redirect: "/api/slack/oauth/redirect",
    },
    documentation: "https://github.com/your-repo/nimio-poll",
  });
}
