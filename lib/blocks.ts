// Block Kit builder for Slack UI components
import {
  Poll,
  Block,
  TextObject,
  ActionElement,
  ContextElement,
} from "./types";
import { EMOJIS, ACTION_IDS, BLOCK_IDS } from "./constants";
import {
  getOptionEmoji,
  formatVoteBar,
  formatPercentage,
  formatVoterNames,
  getTimeRemaining,
  escapeSlackText,
} from "./utils";

/**
 * Creates a text object for Block Kit
 */
function text(
  content: string,
  type: "plain_text" | "mrkdwn" = "mrkdwn"
): TextObject {
  if (type === "plain_text") {
    return { type, text: content, emoji: true };
  }
  return { type, text: content };
}

/**
 * Creates a context element (mrkdwn text)
 */
function contextText(content: string): ContextElement {
  return { type: "mrkdwn", text: content };
}

/**
 * Builds the complete poll message blocks
 */
export function buildPollBlocks(poll: Poll): Block[] {
  const blocks: Block[] = [];
  const totalVotes = getTotalVotes(poll);
  const uniqueVoters = getUniqueVoters(poll);

  // Header with question
  blocks.push({
    type: "header",
    block_id: BLOCK_IDS.question,
    text: text(poll.question, "plain_text"),
  });

  // Poll info/status line
  const statusParts: string[] = [];
  if (poll.isAnonymous) statusParts.push(`${EMOJIS.anonymous} Anónima`);
  if (poll.settings.multipleChoice)
    statusParts.push(`${EMOJIS.multi} Múltiple`);
  if (poll.isClosed) statusParts.push(`${EMOJIS.lock} Cerrada`);
  if (poll.expiresAt && !poll.isClosed) {
    statusParts.push(`${EMOJIS.clock} ${getTimeRemaining(poll.expiresAt)}`);
  }

  if (statusParts.length > 0) {
    blocks.push({
      type: "context",
      elements: [contextText(statusParts.join("  •  "))],
    });
  }

  blocks.push({ type: "divider" });

  // Options with vote counts
  poll.options.forEach((option, index) => {
    const emoji = getOptionEmoji(index);
    const voteCount = option.votes.length;
    const bar = formatVoteBar(voteCount, totalVotes);
    const percentage = formatPercentage(voteCount, totalVotes);

    // Option text with vote visualization
    let optionText = `${emoji}  *${escapeSlackText(option.text)}*\n`;
    optionText += `\`${bar}\` ${percentage} (${voteCount} voto${
      voteCount !== 1 ? "s" : ""
    })`;

    // Show voter names if enabled and not anonymous
    if (
      poll.settings.showVoterNames &&
      !poll.settings.anonymousVoting &&
      voteCount > 0
    ) {
      const voterNames = option.votes.map((v) => v.userName);
      optionText += `\n${EMOJIS.users} ${formatVoterNames(voterNames, 5)}`;
    }

    blocks.push({
      type: "section",
      block_id: `${BLOCK_IDS.options}_${option.id}`,
      text: text(optionText),
      accessory: poll.isClosed
        ? undefined
        : {
            type: "button",
            text: text("Votar", "plain_text"),
            action_id: `${ACTION_IDS.vote}_${option.id}`,
            value: `${poll.id}|${option.id}`,
          },
    });
  });

  blocks.push({ type: "divider" });

  // Stats section
  blocks.push({
    type: "context",
    block_id: BLOCK_IDS.stats,
    elements: [
      contextText(
        `${EMOJIS.chart} *${totalVotes}* votos totales  •  ` +
          `${EMOJIS.users} *${uniqueVoters}* participantes  •  ` +
          `Creada por <@${poll.creatorId}>`
      ),
    ],
  });

  // Action buttons (only for creator, or if poll is active)
  if (!poll.isClosed) {
    const actionElements: ActionElement[] = [];

    if (poll.settings.allowAddOptions) {
      actionElements.push({
        type: "button",
        text: text("➕ Añadir opción", "plain_text"),
        action_id: ACTION_IDS.addOption,
        value: poll.id,
      });
    }

    // Show "Ver votos" button only if not anonymous and has votes
    if (!poll.settings.anonymousVoting && totalVotes > 0) {
      actionElements.push({
        type: "button",
        text: text("👥 Ver votos", "plain_text"),
        action_id: ACTION_IDS.showAllVotes,
        value: poll.id,
      });
    }

    actionElements.push({
      type: "button",
      text: text("🔄 Actualizar", "plain_text"),
      action_id: ACTION_IDS.refreshPoll,
      value: poll.id,
    });

    actionElements.push({
      type: "button",
      text: text("📋 Copiar comando", "plain_text"),
      action_id: ACTION_IDS.copyCommand,
      value: poll.id,
    });

    actionElements.push({
      type: "button",
      text: text("🔒 Cerrar", "plain_text"),
      action_id: ACTION_IDS.closePoll,
      value: poll.id,
      style: "danger",
    });

    blocks.push({
      type: "actions",
      block_id: BLOCK_IDS.actions,
      elements: actionElements,
    });
  } else {
    // Show final results for closed polls
    const winner = getWinner(poll);
    if (winner) {
      blocks.push({
        type: "section",
        text: text(
          `${EMOJIS.trophy} *Ganador:* ${winner.text} con ${winner.votes.length} votos`
        ),
      });
    }
  }

  return blocks;
}

/**
 * Builds a help message
 */
export function buildHelpBlocks(): Block[] {
  return [
    {
      type: "header",
      text: text("🗳️ Nimio Poll - Ayuda", "plain_text"),
    },
    {
      type: "section",
      text: text(
        "*Crear una encuesta básica:*\n" +
          '```/poll "¿Cuál es tu color favorito?" "Rojo" "Azul" "Verde"```'
      ),
    },
    {
      type: "section",
      text: text(
        "*Opciones disponibles:*\n" +
          "• `--anonymous` o `-a` → Votación anónima\n" +
          "• `--multi` o `-m` → Permitir múltiples votos\n" +
          "• `--limit=N` → Limitar a N votos por persona\n" +
          "• `--expires=N` → Expira en N minutos\n" +
          "• `--hide-voters` → Ocultar nombres de votantes\n" +
          "• `--allow-add` → Permitir añadir opciones"
      ),
    },
    {
      type: "section",
      text: text(
        "*Ejemplos:*\n" +
          '```/poll "¿Pizza para el almuerzo?" "Sí" "No" --anonymous\n' +
          '/poll "Elige frameworks" "React" "Vue" "Angular" --multi --limit=2```'
      ),
    },
    { type: "divider" },
    {
      type: "context",
      elements: [
        contextText(
          "💡 _Tip: Puedes usar | para separar opciones sin comillas_"
        ),
      ],
    },
  ];
}

/**
 * Builds error message blocks
 */
export function buildErrorBlocks(message: string): Block[] {
  return [
    {
      type: "section",
      text: text(`❌ *Error*\n${message}`),
    },
  ];
}

/**
 * Builds success message blocks
 */
export function buildSuccessBlocks(message: string): Block[] {
  return [
    {
      type: "section",
      text: text(`✅ ${message}`),
    },
  ];
}

/**
 * Builds the add option modal
 */
export function buildAddOptionModal(pollId: string, question: string): object {
  return {
    type: "modal",
    callback_id: ACTION_IDS.submitNewOption,
    private_metadata: pollId,
    title: text("Añadir Opción", "plain_text"),
    submit: text("Añadir", "plain_text"),
    close: text("Cancelar", "plain_text"),
    blocks: [
      {
        type: "section",
        text: text(`*Encuesta:* ${question}`),
      },
      {
        type: "input",
        block_id: "new_option_input",
        element: {
          type: "plain_text_input",
          action_id: "new_option_value",
          placeholder: text("Escribe tu opción...", "plain_text"),
          max_length: 150,
        },
        label: text("Nueva opción", "plain_text"),
      },
    ],
  };
}

/**
 * Builds modal to display command for copying
 */
export function buildCopyCommandModal(
  command: string,
  question: string
): object {
  return {
    type: "modal",
    callback_id: "copy_command_modal",
    title: text("📋 Copiar comando", "plain_text"),
    submit: text("✅ Listo", "plain_text"),
    close: text("Cerrar", "plain_text"),
    blocks: [
      {
        type: "section",
        text: text(`*Encuesta:* ${escapeSlackText(question)}`),
      },
      {
        type: "divider",
      },
      {
        type: "section",
        text: text(
          "Selecciona y copia el siguiente comando para recrear esta encuesta:"
        ),
      },
      {
        type: "input",
        block_id: "command_display",
        element: {
          type: "plain_text_input",
          action_id: "command_text",
          initial_value: command,
          multiline: true,
        },
        label: text("Comando", "plain_text"),
        hint: text(
          "💡 Selecciona todo el texto (Ctrl+A / Cmd+A) y copia (Ctrl+C / Cmd+C)",
          "plain_text"
        ),
      },
    ],
  };
}

/**
 * Builds poll list message
 */
export function buildPollListBlocks(polls: Poll[]): Block[] {
  if (polls.length === 0) {
    return [
      {
        type: "section",
        text: text("📭 No hay encuestas activas en este canal."),
      },
    ];
  }

  const blocks: Block[] = [
    {
      type: "header",
      text: text("📊 Encuestas Activas", "plain_text"),
    },
    { type: "divider" },
  ];

  polls.slice(0, 10).forEach((poll, index) => {
    const totalVotes = getTotalVotes(poll);
    const status = poll.isClosed ? "🔒 Cerrada" : "🟢 Activa";

    blocks.push({
      type: "section",
      text: text(
        `*${index + 1}. ${escapeSlackText(poll.question)}*\n` +
          `${status} • ${totalVotes} votos • Por <@${poll.creatorId}>`
      ),
    });
  });

  return blocks;
}

/**
 * Builds the modal to show all votes for a poll
 */
export function buildAllVotesModal(poll: Poll): object {
  const blocks: Block[] = [];

  poll.options.forEach((option, index) => {
    const emoji = getOptionEmoji(index);
    const voteCount = option.votes.length;

    // Option header
    blocks.push({
      type: "section",
      text: text(
        `${emoji} *${escapeSlackText(option.text)}* — ${voteCount} voto${
          voteCount !== 1 ? "s" : ""
        }`
      ),
    });

    // List all voters
    if (voteCount > 0) {
      const voterList = option.votes.map((v) => `• <@${v.userId}>`).join("\n");

      blocks.push({
        type: "context",
        elements: [contextText(voterList)],
      });
    } else {
      blocks.push({
        type: "context",
        elements: [contextText("_Sin votos_")],
      });
    }

    blocks.push({ type: "divider" });
  });

  // Summary
  const totalVotes = getTotalVotes(poll);
  const uniqueVoters = getUniqueVoters(poll);

  blocks.push({
    type: "context",
    elements: [
      contextText(
        `${EMOJIS.chart} *Total:* ${totalVotes} votos de ${uniqueVoters} participantes`
      ),
    ],
  });

  return {
    type: "modal",
    title: text("👥 Todos los votos", "plain_text"),
    close: text("Cerrar", "plain_text"),
    blocks,
  };
}

// Helper functions

function getTotalVotes(poll: Poll): number {
  return poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
}

function getUniqueVoters(poll: Poll): number {
  const voters = new Set<string>();
  poll.options.forEach((opt) => {
    opt.votes.forEach((vote) => voters.add(vote.userId));
  });
  return voters.size;
}

function getWinner(poll: Poll): (typeof poll.options)[0] | null {
  if (poll.options.length === 0) return null;

  return poll.options.reduce((winner, current) =>
    current.votes.length > winner.votes.length ? current : winner
  );
}
