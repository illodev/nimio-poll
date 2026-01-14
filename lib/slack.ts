// Slack API helpers and interaction handlers
import { WebClient } from '@slack/web-api';
import { SlackInteractionPayload, SlackOAuthPayload, TeamInstallation } from './types';
import { getStorage } from './storage';
import { 
  handleVote, 
  closePoll, 
  addPollOption, 
  refreshPoll,
  getPollForModal 
} from './poll-service';
import { buildAddOptionModal } from './blocks';
import { ACTION_IDS, MESSAGES } from './constants';

const Storage = getStorage();

/**
 * Handles all Slack interactions (button clicks, modal submissions)
 */
export async function handleInteraction(
  payload: SlackInteractionPayload,
  botToken: string
): Promise<{ response?: object; error?: string }> {
  const { type, user, actions, trigger_id } = payload;

  // Handle block actions (button clicks)
  if (type === 'block_actions' && actions && actions.length > 0) {
    const action = actions[0];
    const actionId = action.action_id;
    const value = action.value || '';

    // Vote action
    if (actionId.startsWith(ACTION_IDS.vote)) {
      const [pollId, optionId] = value.split('|');
      const result = await handleVote(pollId, optionId, user.id, user.name, botToken);
      
      if (!result.success) {
        return {
          response: {
            response_type: 'ephemeral',
            replace_original: false,
            text: result.message,
          },
        };
      }
      
      return { response: { response_type: 'ephemeral', text: '' } };
    }

    // Close poll action
    if (actionId === ACTION_IDS.closePoll) {
      const result = await closePoll(value, user.id, botToken);
      
      return {
        response: {
          response_type: 'ephemeral',
          replace_original: false,
          text: result.message || (result.success ? MESSAGES.success.pollClosed : MESSAGES.errors.notAuthorized),
        },
      };
    }

    // Refresh poll action
    if (actionId === ACTION_IDS.refreshPoll) {
      await refreshPoll(value, botToken);
      return { response: { response_type: 'ephemeral', text: '🔄 Encuesta actualizada' } };
    }

    // Add option action - open modal
    if (actionId === ACTION_IDS.addOption) {
      const poll = await getPollForModal(value);
      
      if (!poll) {
        return {
          response: {
            response_type: 'ephemeral',
            text: MESSAGES.errors.pollNotFound,
          },
        };
      }

      // Open modal
      const client = new WebClient(botToken);
      try {
        await client.views.open({
          trigger_id,
          view: buildAddOptionModal(poll.id, poll.question) as any,
        });
      } catch (error) {
        console.error('Error opening modal:', error);
      }

      return { response: { response_type: 'ephemeral', text: '' } };
    }
  }

  // Handle modal submissions
  if (type === 'view_submission') {
    const viewPayload = payload as any;
    const callbackId = viewPayload.view?.callback_id;
    
    if (callbackId === ACTION_IDS.submitNewOption) {
      const pollId = viewPayload.view?.private_metadata;
      const values = viewPayload.view?.state?.values;
      const newOptionText = values?.new_option_input?.new_option_value?.value;

      if (pollId && newOptionText) {
        const result = await addPollOption(
          pollId,
          newOptionText.trim(),
          user.id,
          user.name,
          botToken
        );

        if (!result.success) {
          return {
            response: {
              response_action: 'errors',
              errors: {
                new_option_input: result.message || 'Error al añadir opción',
              },
            },
          };
        }
      }

      return { response: { response_action: 'clear' } };
    }
  }

  return { response: {} };
}

/**
 * Handles OAuth callback and saves installation
 */
export async function handleOAuthCallback(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ success: boolean; teamName?: string; error?: string }> {
  const client = new WebClient();

  try {
    const result = await client.oauth.v2.access({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }) as SlackOAuthPayload;

    if (!result.ok) {
      return { success: false, error: 'OAuth failed' };
    }

    // Save installation
    const installation: TeamInstallation = {
      teamId: result.team.id,
      teamName: result.team.name,
      botToken: result.access_token,
      botUserId: result.bot_user_id,
      installedAt: Date.now(),
      installedBy: result.authed_user.id,
    };

    await Storage.saveInstallation(installation);

    return { success: true, teamName: result.team.name };
  } catch (error) {
    console.error('OAuth error:', error);
    return { success: false, error: 'Error during OAuth process' };
  }
}

/**
 * Gets bot token for a team
 */
export async function getBotToken(teamId: string): Promise<string | null> {
  const installation = await Storage.getInstallation(teamId);
  return installation?.botToken || null;
}

/**
 * Sends ephemeral message to user
 */
export async function sendEphemeralMessage(
  channelId: string,
  userId: string,
  text: string,
  botToken: string,
  blocks?: any[]
): Promise<void> {
  const client = new WebClient(botToken);

  try {
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text,
      blocks,
    });
  } catch (error) {
    console.error('Error sending ephemeral message:', error);
  }
}

/**
 * Responds to response_url
 */
export async function respondToUrl(
  responseUrl: string,
  message: object
): Promise<void> {
  try {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Error responding to URL:', error);
  }
}
