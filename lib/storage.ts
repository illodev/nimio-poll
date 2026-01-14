// Storage adapter for Nimio Poll using Vercel KV
import { kv } from '@vercel/kv';
import { Poll, TeamInstallation } from './types';

const POLL_PREFIX = 'poll:';
const TEAM_PREFIX = 'team:';
const CHANNEL_POLLS_PREFIX = 'channel_polls:';

/**
 * Storage class for managing polls and installations
 */
export class PollStorage {
  /**
   * Save a poll
   */
  static async savePoll(poll: Poll): Promise<void> {
    const key = `${POLL_PREFIX}${poll.id}`;
    await kv.set(key, JSON.stringify(poll));
    
    // Also add to channel's poll list
    const channelKey = `${CHANNEL_POLLS_PREFIX}${poll.teamId}:${poll.channelId}`;
    await kv.sadd(channelKey, poll.id);
    
    // Set expiration if configured
    if (poll.expiresAt) {
      const ttl = Math.ceil((poll.expiresAt - Date.now()) / 1000);
      if (ttl > 0) {
        await kv.expire(key, ttl);
      }
    }
  }

  /**
   * Get a poll by ID
   */
  static async getPoll(pollId: string): Promise<Poll | null> {
    const key = `${POLL_PREFIX}${pollId}`;
    const data = await kv.get<string>(key);
    
    if (!data) return null;
    
    try {
      return typeof data === 'string' ? JSON.parse(data) : data as Poll;
    } catch {
      return null;
    }
  }

  /**
   * Delete a poll
   */
  static async deletePoll(poll: Poll): Promise<void> {
    const key = `${POLL_PREFIX}${poll.id}`;
    await kv.del(key);
    
    // Remove from channel's poll list
    const channelKey = `${CHANNEL_POLLS_PREFIX}${poll.teamId}:${poll.channelId}`;
    await kv.srem(channelKey, poll.id);
  }

  /**
   * Get all polls for a channel
   */
  static async getChannelPolls(teamId: string, channelId: string): Promise<Poll[]> {
    const channelKey = `${CHANNEL_POLLS_PREFIX}${teamId}:${channelId}`;
    const pollIds = await kv.smembers<string[]>(channelKey);
    
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
    const key = `${TEAM_PREFIX}${installation.teamId}`;
    await kv.set(key, JSON.stringify(installation));
  }

  /**
   * Get team installation
   */
  static async getInstallation(teamId: string): Promise<TeamInstallation | null> {
    const key = `${TEAM_PREFIX}${teamId}`;
    const data = await kv.get<string>(key);
    
    if (!data) return null;
    
    try {
      return typeof data === 'string' ? JSON.parse(data) : data as TeamInstallation;
    } catch {
      return null;
    }
  }

  /**
   * Delete team installation
   */
  static async deleteInstallation(teamId: string): Promise<void> {
    const key = `${TEAM_PREFIX}${teamId}`;
    await kv.del(key);
  }

  /**
   * Check if team is installed
   */
  static async isTeamInstalled(teamId: string): Promise<boolean> {
    const installation = await this.getInstallation(teamId);
    return installation !== null;
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

  static async getChannelPolls(teamId: string, channelId: string): Promise<Poll[]> {
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

  static async getInstallation(teamId: string): Promise<TeamInstallation | null> {
    return this.installations.get(teamId) || null;
  }

  static async deleteInstallation(teamId: string): Promise<void> {
    this.installations.delete(teamId);
  }

  static async isTeamInstalled(teamId: string): Promise<boolean> {
    return this.installations.has(teamId);
  }
}

/**
 * Get the appropriate storage based on environment
 */
export function getStorage(): typeof PollStorage | typeof InMemoryStorage {
  // Use KV in production, in-memory for development
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return PollStorage;
  }
  console.warn('⚠️ Using in-memory storage. Data will be lost on restart.');
  return InMemoryStorage;
}
