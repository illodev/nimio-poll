// Poll service - Core business logic
import { WebClient } from "@slack/web-api";
import { Poll, SlackCommandPayload } from "./types";
import { getStorage } from "./storage";
import {
  buildPollBlocks,
  buildHelpBlocks,
  buildPollListBlocks,
} from "./blocks";
import { generatePollId, generateOptionId, parsePollCommand } from "./utils";
import { MESSAGES, LIMITS } from "./constants";

const Storage = getStorage();

/**
 * Creates a new poll from command input
 */
export async function createPoll(
  payload: SlackCommandPayload,
  botToken: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const parsed = parsePollCommand(payload.text);

  // Check for help command
  if (!payload.text || payload.text.trim().toLowerCase() === "help") {
    return {
      success: true,
      message: JSON.stringify({
        blocks: buildHelpBlocks(),
        response_type: "ephemeral",
      }),
    };
  }

  // Check for list command
  if (payload.text.trim().toLowerCase() === "list") {
    const polls = await Storage.getChannelPolls(
      payload.team_id,
      payload.channel_id
    );
    const activePolls = polls.filter((p) => !p.isClosed);
    return {
      success: true,
      message: JSON.stringify({
        blocks: buildPollListBlocks(activePolls),
        response_type: "ephemeral",
      }),
    };
  }

  // Validate parsed command
  if (parsed.errors.length > 0) {
    return { success: false, error: parsed.errors.join("\n") };
  }

  if (!parsed.question) {
    return { success: false, error: MESSAGES.errors.noQuestion };
  }

  if (parsed.options.length < 2) {
    return { success: false, error: MESSAGES.errors.notEnoughOptions };
  }

  // Create poll object
  const poll: Poll = {
    id: generatePollId(),
    teamId: payload.team_id,
    channelId: payload.channel_id,
    creatorId: payload.user_id,
    creatorName: payload.user_name,
    question: parsed.question,
    options: parsed.options.map((text) => ({
      id: generateOptionId(),
      text,
      votes: [],
    })),
    settings: {
      multipleChoice: parsed.settings.multipleChoice ?? false,
      anonymousVoting: parsed.settings.anonymousVoting ?? false,
      showVoterNames: parsed.settings.showVoterNames ?? true,
      allowAddOptions: parsed.settings.allowAddOptions ?? false,
      limitVotesPerUser: parsed.settings.limitVotesPerUser,
      expirationMinutes: parsed.settings.expirationMinutes,
    },
    createdAt: Date.now(),
    isAnonymous: parsed.settings.anonymousVoting ?? false,
    isClosed: false,
  };

  // Set expiration if configured
  if (poll.settings.expirationMinutes) {
    poll.expiresAt = Date.now() + poll.settings.expirationMinutes * 60 * 1000;
  }

  // Post poll to channel
  const client = new WebClient(botToken);

  try {
    const result = await client.chat.postMessage({
      channel: payload.channel_id,
      blocks: buildPollBlocks(poll),
      text: `📊 Nueva encuesta: ${poll.question}`,
    });

    poll.messageTs = result.ts;

    // Save poll to storage
    await Storage.savePoll(poll);

    return { success: true };
  } catch (error: unknown) {
    console.error("Error posting poll:", error);

    // Handle specific Slack API errors
    const slackError = error as { data?: { error?: string } };
    const errorCode = slackError?.data?.error;

    if (errorCode === "channel_not_found" || errorCode === "not_in_channel") {
      return {
        success: false,
        error:
          "❌ No puedo publicar en este canal. Por favor, invita al bot al canal escribiendo: /invite @NimioPoll",
      };
    }

    if (errorCode === "is_archived") {
      return {
        success: false,
        error: "❌ Este canal está archivado.",
      };
    }

    return {
      success: false,
      error: "Error al crear la encuesta. Verifica los permisos del bot.",
    };
  }
}

/**
 * Handles vote interaction
 */
export async function handleVote(
  pollId: string,
  optionId: string,
  userId: string,
  userName: string,
  botToken: string
): Promise<{ success: boolean; message?: string; poll?: Poll }> {
  const poll = await Storage.getPoll(pollId);

  if (!poll) {
    return { success: false, message: MESSAGES.errors.pollNotFound };
  }

  if (poll.isClosed) {
    return { success: false, message: MESSAGES.errors.pollClosed };
  }

  // Check expiration
  if (poll.expiresAt && Date.now() > poll.expiresAt) {
    poll.isClosed = true;
    await Storage.savePoll(poll);
    return { success: false, message: MESSAGES.errors.pollClosed };
  }

  const option = poll.options.find((o) => o.id === optionId);
  if (!option) {
    return { success: false, message: "Opción no encontrada." };
  }

  // Check if user already voted for this option
  const existingVoteIndex = option.votes.findIndex((v) => v.userId === userId);

  if (existingVoteIndex >= 0) {
    // Remove vote (toggle)
    option.votes.splice(existingVoteIndex, 1);
  } else {
    // Check vote limits for non-multiple choice
    if (!poll.settings.multipleChoice) {
      // Remove any existing votes by this user
      poll.options.forEach((opt) => {
        opt.votes = opt.votes.filter((v) => v.userId !== userId);
      });
    } else if (poll.settings.limitVotesPerUser) {
      // Check if user has reached vote limit
      const userVoteCount = poll.options.reduce(
        (count, opt) =>
          count + opt.votes.filter((v) => v.userId === userId).length,
        0
      );

      if (userVoteCount >= poll.settings.limitVotesPerUser) {
        return {
          success: false,
          message: `Has alcanzado el límite de ${poll.settings.limitVotesPerUser} votos.`,
        };
      }
    }

    // Add vote
    option.votes.push({
      userId,
      userName: poll.settings.anonymousVoting ? "Anónimo" : userName,
      votedAt: Date.now(),
    });
  }

  // Save updated poll
  await Storage.savePoll(poll);

  // Update message
  await updatePollMessage(poll, botToken);

  return { success: true, poll };
}

/**
 * Closes a poll
 */
export async function closePoll(
  pollId: string,
  userId: string,
  botToken: string
): Promise<{ success: boolean; message?: string }> {
  const poll = await Storage.getPoll(pollId);

  if (!poll) {
    return { success: false, message: MESSAGES.errors.pollNotFound };
  }

  // Only creator can close the poll
  if (poll.creatorId !== userId) {
    return { success: false, message: MESSAGES.errors.notAuthorized };
  }

  poll.isClosed = true;
  await Storage.savePoll(poll);
  await updatePollMessage(poll, botToken);

  return { success: true, message: MESSAGES.success.pollClosed };
}

/**
 * Adds a new option to a poll
 */
export async function addPollOption(
  pollId: string,
  optionText: string,
  userId: string,
  _userName: string,
  botToken: string
): Promise<{ success: boolean; message?: string }> {
  const poll = await Storage.getPoll(pollId);

  if (!poll) {
    return { success: false, message: MESSAGES.errors.pollNotFound };
  }

  if (poll.isClosed) {
    return { success: false, message: MESSAGES.errors.pollClosed };
  }

  if (!poll.settings.allowAddOptions && poll.creatorId !== userId) {
    return { success: false, message: MESSAGES.errors.notAuthorized };
  }

  if (poll.options.length >= LIMITS.maxOptions) {
    return { success: false, message: MESSAGES.errors.tooManyOptions };
  }

  if (optionText.length > LIMITS.maxOptionLength) {
    return { success: false, message: MESSAGES.errors.optionTooLong };
  }

  // Add new option
  poll.options.push({
    id: generateOptionId(),
    text: optionText,
    votes: [],
  });

  await Storage.savePoll(poll);
  await updatePollMessage(poll, botToken);

  return { success: true, message: MESSAGES.success.optionAdded };
}

/**
 * Refreshes a poll display
 */
export async function refreshPoll(
  pollId: string,
  botToken: string
): Promise<{ success: boolean; message?: string }> {
  const poll = await Storage.getPoll(pollId);

  if (!poll) {
    return { success: false, message: MESSAGES.errors.pollNotFound };
  }

  // Check expiration
  if (poll.expiresAt && Date.now() > poll.expiresAt && !poll.isClosed) {
    poll.isClosed = true;
    await Storage.savePoll(poll);
  }

  await updatePollMessage(poll, botToken);

  return { success: true };
}

/**
 * Updates the poll message in Slack
 */
async function updatePollMessage(poll: Poll, botToken: string): Promise<void> {
  if (!poll.messageTs) return;

  const client = new WebClient(botToken);

  try {
    await client.chat.update({
      channel: poll.channelId,
      ts: poll.messageTs,
      blocks: buildPollBlocks(poll),
      text: `📊 Encuesta: ${poll.question}`,
    });
  } catch (error) {
    console.error("Error updating poll message:", error);
  }
}

/**
 * Gets poll for modal
 */
export async function getPollForModal(pollId: string): Promise<Poll | null> {
  return Storage.getPoll(pollId);
}
