// Types for Nimio Poll - Modern Slack Polling App

export interface Poll {
  id: string;
  teamId: string;
  channelId: string;
  creatorId: string;
  creatorName: string;
  question: string;
  options: PollOption[];
  settings: PollSettings;
  createdAt: number;
  expiresAt?: number;
  messageTs?: string;
  isAnonymous: boolean;
  isClosed: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  emoji?: string;
  votes: Vote[];
}

export interface Vote {
  userId: string;
  userName: string;
  votedAt: number;
}

export interface PollSettings {
  multipleChoice: boolean;
  anonymousVoting: boolean;
  showVoterNames: boolean;
  limitVotesPerUser?: number;
  allowAddOptions: boolean;
  expirationMinutes?: number;
}

export interface SlackUser {
  id: string;
  name: string;
  realName?: string;
  avatar?: string;
}

export interface SlackCommandPayload {
  token: string;
  team_id: string;
  team_domain: string;
  enterprise_id?: string;
  enterprise_name?: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  api_app_id: string;
  is_enterprise_install: string;
  response_url: string;
  trigger_id: string;
}

export interface SlackInteractionPayload {
  type: string;
  user: {
    id: string;
    username: string;
    name: string;
    team_id: string;
  };
  container: {
    type: string;
    message_ts: string;
    channel_id: string;
  };
  team: {
    id: string;
    domain: string;
  };
  channel: {
    id: string;
    name: string;
  };
  message: {
    ts: string;
    blocks: unknown[];
  };
  actions: SlackAction[];
  response_url: string;
  trigger_id: string;
}

export interface SlackAction {
  action_id: string;
  block_id: string;
  type: string;
  value?: string;
  action_ts: string;
}

export interface SlackOAuthPayload {
  ok: boolean;
  app_id: string;
  authed_user: {
    id: string;
  };
  scope: string;
  token_type: string;
  access_token: string;
  bot_user_id: string;
  team: {
    id: string;
    name: string;
  };
  enterprise?: {
    id: string;
    name: string;
  };
  is_enterprise_install: boolean;
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
}

export interface TeamInstallation {
  teamId: string;
  teamName: string;
  botToken: string;
  botUserId: string;
  installedAt: number;
  installedBy: string;
}

export interface BlockKit {
  blocks: Block[];
}

export interface Block {
  type: string;
  block_id?: string;
  text?: TextObject;
  accessory?: Accessory;
  elements?: (ContextElement | ActionElement)[];
  fields?: TextObject[];
}

export interface TextObject {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
}

export interface Accessory {
  type: string;
  action_id?: string;
  value?: string;
  text?: TextObject;
  options?: SelectOption[];
  style?: 'primary' | 'danger';
}

export interface ContextElement {
  type: string;
  text?: string;
  action_id?: string;
  value?: string;
  style?: 'primary' | 'danger';
  url?: string;
}

export interface ActionElement {
  type: string;
  action_id?: string;
  value?: string;
  text?: TextObject;
  style?: 'primary' | 'danger';
  url?: string;
}

export interface SelectOption {
  text: TextObject;
  value: string;
}

export interface ParsedPollCommand {
  question: string;
  options: string[];
  settings: Partial<PollSettings>;
  errors: string[];
}
