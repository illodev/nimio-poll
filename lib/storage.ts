// Storage adapter for Nimio Poll using Upstash Redis
import { Redis } from "@upstash/redis";
import { Poll, TeamInstallation } from "./types";

// Initialize Redis client (will be null if not configured)
const redis =
  process.env.UPSTASH_REDIS_REST_KV_REST_API_URL &&
  process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
        token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
      })
    : null;

const POLL_PREFIX = "poll:";
const TEAM_PREFIX = "team:";
const CHANNEL_POLLS_PREFIX = "channel_polls:";
const ACTIVE_POLLS_KEY = "active_polls_with_expiry";

/**
 * Storage class for managing polls and installations
 */
export class PollStorage {
  private static getRedis(): Redis {
    if (!redis) {
      throw new Error(
        "Redis not configured. Set UPSTASH_REDIS_REST_KV_REST_API_URL and UPSTASH_REDIS_REST_KV_REST_API_TOKEN"
      );
    }
    return redis;
  }

  /**
   * Save a poll
   */
  static async savePoll(poll: Poll): Promise<void> {
    const r = this.getRedis();
    const key = `${POLL_PREFIX}${poll.id}`;
    await r.set(key, JSON.stringify(poll));

    // Also add to channel's poll list
    const channelKey = `${CHANNEL_POLLS_PREFIX}${poll.teamId}:${poll.channelId}`;
    await r.sadd(channelKey, poll.id);

    // Track polls with expiration for cron job
    if (poll.expiresAt && !poll.isClosed) {
      await r.zadd(ACTIVE_POLLS_KEY, {
        score: poll.expiresAt,
        member: poll.id,
      });
    } else if (poll.isClosed) {
      // Remove from active polls if closed
      await r.zrem(ACTIVE_POLLS_KEY, poll.id);
    }
  }

  /**
   * Get a poll by ID
   */
  static async getPoll(pollId: string): Promise<Poll | null> {
    const r = this.getRedis();
    const key = `${POLL_PREFIX}${pollId}`;
    const data = await r.get<string>(key);

    if (!data) return null;

    try {
      return typeof data === "string" ? JSON.parse(data) : (data as Poll);
    } catch {
      return null;
    }
  }

  /**
   * Delete a poll
   */
  static async deletePoll(poll: Poll): Promise<void> {
    const r = this.getRedis();
    const key = `${POLL_PREFIX}${poll.id}`;
    await r.del(key);

    // Remove from channel's poll list
    const channelKey = `${CHANNEL_POLLS_PREFIX}${poll.teamId}:${poll.channelId}`;
    await r.srem(channelKey, poll.id);
  }

  /**
   * Get all polls for a channel
   */
  static async getChannelPolls(
    teamId: string,
    channelId: string
  ): Promise<Poll[]> {
    const r = this.getRedis();
    const channelKey = `${CHANNEL_POLLS_PREFIX}${teamId}:${channelId}`;
    const pollIds = await r.smembers<string[]>(channelKey);

    if (!pollIds || pollIds.length === 0) return [];

    const polls: Poll[] = [];
    for (const pollId of pollIds) {
      const poll = await this.getPoll(pollId);
      if (poll) {
        polls.push(poll);
      }
    }

    return polls.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Save team installation
   */
  static async saveInstallation(installation: TeamInstallation): Promise<void> {
    const r = this.getRedis();
    const key = `${TEAM_PREFIX}${installation.teamId}`;
    await r.set(key, JSON.stringify(installation));
  }

  /**
   * Get team installation
   */
  static async getInstallation(
    teamId: string
  ): Promise<TeamInstallation | null> {
    const r = this.getRedis();
    const key = `${TEAM_PREFIX}${teamId}`;
    const data = await r.get<string>(key);

    if (!data) return null;

    try {
      return typeof data === "string"
        ? JSON.parse(data)
        : (data as TeamInstallation);
    } catch {
      return null;
    }
  }

  /**
   * Delete team installation
   */
  static async deleteInstallation(teamId: string): Promise<void> {
    const r = this.getRedis();
    const key = `${TEAM_PREFIX}${teamId}`;
    await r.del(key);
  }

  /**
   * Check if team is installed
   */
  static async isTeamInstalled(teamId: string): Promise<boolean> {
    const installation = await this.getInstallation(teamId);
    return installation !== null;
  }

  /**
   * Get all expired polls that are not yet closed
   */
  static async getExpiredPolls(): Promise<Poll[]> {
    const r = this.getRedis();
    const now = Date.now();

    // Get all poll IDs with expiration time <= now using zrange with BYSCORE
    const expiredIds = await r.zrange(ACTIVE_POLLS_KEY, 0, now, {
      byScore: true,
    });

    if (!expiredIds || expiredIds.length === 0) return [];

    const polls: Poll[] = [];
    for (const pollId of expiredIds) {
      const poll = await this.getPoll(pollId as string);
      if (poll && !poll.isClosed) {
        polls.push(poll);
      }
    }

    return polls;
  }
}

/**
 * In-memory fallback storage for development/testing
 */
export class InMemoryStorage {
  private static polls: Map<string, Poll> = new Map();
  private static installations: Map<string, TeamInstallation> = new Map();
  private static channelPolls: Map<string, Set<string>> = new Map();

  static async savePoll(poll: Poll): Promise<void> {
    this.polls.set(poll.id, poll);

    const channelKey = `${poll.teamId}:${poll.channelId}`;
    if (!this.channelPolls.has(channelKey)) {
      this.channelPolls.set(channelKey, new Set());
    }
    this.channelPolls.get(channelKey)!.add(poll.id);
  }

  static async getPoll(pollId: string): Promise<Poll | null> {
    return this.polls.get(pollId) || null;
  }

  static async deletePoll(poll: Poll): Promise<void> {
    this.polls.delete(poll.id);

    const channelKey = `${poll.teamId}:${poll.channelId}`;
    this.channelPolls.get(channelKey)?.delete(poll.id);
  }

  static async getChannelPolls(
    teamId: string,
    channelId: string
  ): Promise<Poll[]> {
    const channelKey = `${teamId}:${channelId}`;
    const pollIds = this.channelPolls.get(channelKey);

    if (!pollIds) return [];

    const polls: Poll[] = [];
    for (const pollId of pollIds) {
      const poll = this.polls.get(pollId);
      if (poll) polls.push(poll);
    }

    return polls.sort((a, b) => b.createdAt - a.createdAt);
  }

  static async saveInstallation(installation: TeamInstallation): Promise<void> {
    this.installations.set(installation.teamId, installation);
  }

  static async getInstallation(
    teamId: string
  ): Promise<TeamInstallation | null> {
    return this.installations.get(teamId) || null;
  }

  static async deleteInstallation(teamId: string): Promise<void> {
    this.installations.delete(teamId);
  }

  static async isTeamInstalled(teamId: string): Promise<boolean> {
    return this.installations.has(teamId);
  }

  static async getExpiredPolls(): Promise<Poll[]> {
    const now = Date.now();
    const polls: Poll[] = [];

    for (const poll of this.polls.values()) {
      if (poll.expiresAt && poll.expiresAt <= now && !poll.isClosed) {
        polls.push(poll);
      }
    }

    return polls;
  }
}

/**
 * Get the appropriate storage based on environment
 */
export function getStorage(): typeof PollStorage | typeof InMemoryStorage {
  // Use Upstash Redis in production, in-memory for development
  if (
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL &&
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN
  ) {
    return PollStorage;
  }
  console.warn("⚠️ Using in-memory storage. Data will be lost on restart.");
  return InMemoryStorage;
}
