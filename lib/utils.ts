// Utility functions for Nimio Poll
import crypto from "crypto";
import { ParsedPollCommand } from "./types";
import { LIMITS, EMOJIS } from "./constants";

/**
 * Generates a unique ID for polls
 */
export function generatePollId(): string {
  return `poll_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

/**
 * Generates a unique ID for options
 */
export function generateOptionId(): string {
  return `opt_${crypto.randomBytes(4).toString("hex")}`;
}

/**
 * Verifies Slack request signature
 */
export function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string,
): boolean {
  // Check timestamp is within 5 minutes
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", signingSecret)
      .update(sigBasestring, "utf8")
      .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(mySignature, "utf8"),
    Buffer.from(signature, "utf8"),
  );
}

/**
 * Parses poll command text into structured data
 * Format: "Question" "Option1" "Option2" ... [--flags]
 * Images can be added with: "Option" https://image.url or "Option|https://image.url"
 */
export function parsePollCommand(text: string): ParsedPollCommand {
  const result: ParsedPollCommand = {
    question: "",
    options: [],
    settings: {
      multipleChoice: false,
      anonymousVoting: false,
      showVoterNames: true,
      allowAddOptions: false,
    },
    errors: [],
  };

  if (!text || text.trim() === "" || text.trim().toLowerCase() === "help") {
    return result;
  }

  // Normalize curly/smart quotes to straight quotes
  const normalizedText = text
    .replace(/[""„‟❝❞⹂〝〞＂]/g, '"') // Various double quote styles
    .replace(/[''‚‛❛❜]/g, "'"); // Various single quote styles

  // Extract flags first
  const flagRegex =
    /--(anonymous|multi|hide-voters|allow-add|limit=\d+|expires=\d+)|-([amh])/g;
  let match;
  const cleanText = normalizedText
    .replace(flagRegex, (matched) => {
      // Process flags
      if (matched === "--anonymous" || matched === "-a") {
        result.settings.anonymousVoting = true;
        result.settings.showVoterNames = false;
      } else if (matched === "--multi" || matched === "-m") {
        result.settings.multipleChoice = true;
      } else if (matched === "--hide-voters" || matched === "-h") {
        result.settings.showVoterNames = false;
      } else if (matched === "--allow-add") {
        result.settings.allowAddOptions = true;
      } else if (matched.startsWith("--limit=")) {
        result.settings.limitVotesPerUser = parseInt(matched.split("=")[1]);
      } else if (matched.startsWith("--expires=")) {
        result.settings.expirationMinutes = parseInt(matched.split("=")[1]);
      }
      return "";
    })
    .trim();

  // Parse quoted strings for question and options
  // This regex handles emojis and special characters inside quotes
  const quotedRegex = /"([^"]+)"(?:\s+(https?:\/\/\S+))?/gu;
  const matches: Array<{ text: string; imageUrl?: string }> = [];

  while ((match = quotedRegex.exec(cleanText)) !== null) {
    const text = match[1].trim();
    const imageUrl = match[2]?.trim();

    // Check if the text contains an image URL separator (|)
    const parts = text.split("|").map((p) => p.trim());
    if (parts.length === 2 && parts[1].match(/^https?:\/\//)) {
      matches.push({ text: parts[0], imageUrl: parts[1] });
    } else {
      matches.push({ text, imageUrl });
    }
  }

  // If no quoted strings found, try to split by common delimiters
  if (matches.length === 0) {
    // Try splitting by newlines
    const parts = cleanText
      .split(/[\n]/)
      .map((p) => p.trim())
      .filter((p) => p);
    if (parts.length >= 2) {
      result.question = parts[0];
      result.options = parts.slice(1).map((text) => ({ text }));
    } else {
      result.errors.push(
        'No se encontraron opciones. Usa comillas: "/poll \\"Pregunta\\" \\"Opción 1\\" \\"Opción 2\\""',
      );
    }
  } else {
    result.question = matches[0].text;
    result.options = matches.slice(1);
  }

  // Validate
  if (result.question && result.question.length > LIMITS.maxQuestionLength) {
    result.errors.push(
      `La pregunta excede ${LIMITS.maxQuestionLength} caracteres.`,
    );
  }

  if (result.options.length > LIMITS.maxOptions) {
    result.errors.push(`Máximo ${LIMITS.maxOptions} opciones permitidas.`);
  }

  result.options.forEach((opt, i) => {
    if (opt.text.length > LIMITS.maxOptionLength) {
      result.errors.push(
        `La opción ${i + 1} excede ${LIMITS.maxOptionLength} caracteres.`,
      );
    }
    // Validate image URL format if provided
    if (
      opt.imageUrl &&
      !opt.imageUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)
    ) {
      result.errors.push(
        `La URL de imagen de la opción ${i + 1} debe ser una URL válida (http/https) que termine en jpg, jpeg, png, gif, o webp.`,
      );
    }
  });

  return result;
}

/**
 * Gets emoji for option index
 */
export function getOptionEmoji(
  index: number,
  style: "numbers" | "letters" | "colors" = "numbers",
): string {
  const emojiSet = EMOJIS[style];
  return emojiSet[index % emojiSet.length];
}

/**
 * Formats vote count with bar visualization
 */
export function formatVoteBar(
  votes: number,
  totalVotes: number,
  width: number = 10,
): string {
  if (totalVotes === 0) return "░".repeat(width);

  const percentage = votes / totalVotes;
  const filled = Math.round(percentage * width);
  const empty = width - filled;

  return "█".repeat(filled) + "░".repeat(empty);
}

/**
 * Formats percentage
 */
export function formatPercentage(votes: number, totalVotes: number): string {
  if (totalVotes === 0) return "0%";
  const percentage = (votes / totalVotes) * 100;
  return `${Math.round(percentage)}%`;
}

/**
 * Formats voter names for display
 */
export function formatVoterNames(
  voters: string[],
  maxShow: number = 3,
): string {
  if (voters.length === 0) return "";

  if (voters.length <= maxShow) {
    return voters.join(", ");
  }

  const shown = voters.slice(0, maxShow);
  const remaining = voters.length - maxShow;
  return `${shown.join(", ")} y ${remaining} más`;
}

/**
 * Calculates time remaining until expiration
 */
export function getTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const diff = expiresAt - now;

  if (diff <= 0) return "Expirada";

  const totalSeconds = Math.floor(diff / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  if (days > 0) return `${days}d ${hours}h ${minutes}m restantes`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s restantes`;
  if (minutes > 0) return `${minutes}m ${seconds}s restantes`;
  return `${seconds}s restantes`;
}

/**
 * Parse URL encoded form data
 */
export function parseUrlEncodedBody(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Escape special characters for Slack mrkdwn
 */
export function escapeSlackText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Generate the /poll command to recreate a poll
 */
export function generatePollCommand(
  question: string,
  options: string[],
  settings: {
    multipleChoice?: boolean;
    anonymousVoting?: boolean;
    showVoterNames?: boolean;
    allowAddOptions?: boolean;
    limitVotesPerUser?: number;
    expirationMinutes?: number;
  },
): string {
  let command = `/poll "${question}"`;

  options.forEach((option) => {
    command += ` "${option}"`;
  });

  if (settings.anonymousVoting) command += " --anonymous";
  if (settings.multipleChoice) command += " --multi";
  if (!settings.showVoterNames && !settings.anonymousVoting)
    command += " --hide-voters";
  if (settings.allowAddOptions) command += " --allow-add";
  if (settings.limitVotesPerUser)
    command += ` --limit=${settings.limitVotesPerUser}`;
  if (settings.expirationMinutes)
    command += ` --expires=${settings.expirationMinutes}`;

  return command;
}

/**
 * Get relative time string
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `hace ${days} día${days > 1 ? "s" : ""}`;
  if (hours > 0) return `hace ${hours} hora${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? "s" : ""}`;
  return "hace un momento";
}
