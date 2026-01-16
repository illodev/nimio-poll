// Constants for Nimio Poll

export const EMOJIS = {
  numbers: [
    "1️⃣",
    "2️⃣",
    "3️⃣",
    "4️⃣",
    "5️⃣",
    "6️⃣",
    "7️⃣",
    "8️⃣",
    "9️⃣",
    "🔟",
    "🔢",
    "🔠",
    "🔡",
    "🔤",
    "🅰️",
    "🅱️",
    "🆎",
    "🆑",
    "🆒",
    "🆓",
    "🆔",
    "🆕",
    "🆖",
    "🆗",
    "🆘",
    "🆙",
    "🆚",
    "🈁",
    "🈂️",
    "🈷️",
    "🔴",
    "🟠",
    "🟡",
    "🟢",
    "🔵",
    "🟣",
    "🟤",
    "⚫",
    "⚪",
    "🩷",
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "🤎",
    "💗",
    "⭐",
    "🌟",
    "✨",
    "💫",
    "🔥",
    "💥",
    "💢",
    "💦",
    "💨",
    "🎯",
    "🎪",
    "🎭",
    "🎨",
    "🎬",
    "🎤",
    "🎧",
    "🎼",
    "🎹",
    "🎸",
    "🎺",
    "🎻",
    "🥁",
    "🎲",
    "🎯",
    "🎳",
    "🎮",
    "🎰",
    "🧩",
    "♟️",
    "🎴",
    "🀄",
    "🃏",
    "🎁",
    "🎀",
    "🎊",
    "🎉",
    "🎎",
    "🎏",
    "🎐",
    "🎑",
  ],
  letters: ["🅰️", "🅱️", "©️", "®️", "🅾️", "🅿️", "Ⓜ️", "🆎", "🆑", "🆒"],
  colors: ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤", "⚫", "⚪", "🩷"],
  check: "✅",
  cross: "❌",
  chart: "📊",
  lock: "🔒",
  unlock: "🔓",
  anonymous: "🕵️",
  multi: "☑️",
  single: "⭕",
  clock: "⏰",
  trophy: "🏆",
  fire: "🔥",
  star: "⭐",
  users: "👥",
  user: "👤",
} as const;

export const COLORS = {
  primary: "#667eea",
  secondary: "#764ba2",
  success: "#48bb78",
  warning: "#ed8936",
  danger: "#f56565",
  info: "#4299e1",
} as const;

export const LIMITS = {
  maxOptions: 100,
  maxQuestionLength: 2000,
  maxOptionLength: 2000,
  maxPollsPerChannel: 20000,
  defaultExpirationHours: 24,
  maxExpirationHours: 168, // 1 week
} as const;

export const ACTION_IDS = {
  vote: "nimio_vote",
  addOption: "nimio_add_option",
  closePoll: "nimio_close_poll",
  deletePoll: "nimio_delete_poll",
  showVoters: "nimio_show_voters",
  showAllVotes: "nimio_show_all_votes",
  refreshPoll: "nimio_refresh",
  toggleAnonymous: "nimio_toggle_anonymous",
  submitNewOption: "nimio_submit_new_option",
  cancelModal: "nimio_cancel_modal",
  copyCommand: "nimio_copy_command",
} as const;

export const BLOCK_IDS = {
  question: "poll_question",
  options: "poll_options",
  stats: "poll_stats",
  actions: "poll_actions",
  footer: "poll_footer",
} as const;

export const MESSAGES = {
  errors: {
    invalidCommand:
      '❌ Comando inválido. Usa `/poll "Tu pregunta" "Opción 1" "Opción 2"`',
    noQuestion: "❌ Debes incluir una pregunta para la encuesta.",
    notEnoughOptions:
      "❌ Necesitas al menos 2 opciones para crear una encuesta.",
    tooManyOptions: `❌ Máximo ${LIMITS.maxOptions} opciones permitidas.`,
    questionTooLong: `❌ La pregunta no puede exceder ${LIMITS.maxQuestionLength} caracteres.`,
    optionTooLong: `❌ Las opciones no pueden exceder ${LIMITS.maxOptionLength} caracteres.`,
    pollNotFound: "❌ Encuesta no encontrada.",
    pollClosed: "🔒 Esta encuesta está cerrada.",
    alreadyVoted: "⚠️ Ya has votado por esta opción.",
    notAuthorized: "❌ No tienes permiso para realizar esta acción.",
    installationError:
      "❌ Error en la instalación. Por favor, intenta de nuevo.",
    verificationFailed: "❌ No se pudo verificar la solicitud de Slack.",
  },
  success: {
    pollCreated: "✅ Encuesta creada exitosamente.",
    voteRecorded: "✅ Voto registrado.",
    voteRemoved: "✅ Voto eliminado.",
    pollClosed: "🔒 Encuesta cerrada.",
    pollDeleted: "🗑️ Encuesta eliminada.",
    optionAdded: "✅ Opción añadida.",
    installed: "✅ Nimio Poll instalado correctamente.",
  },
  help: `
*🗳️ Nimio Poll - Ayuda*

*Crear una encuesta básica:*
\`/poll "¿Cuál es tu color favorito?" "Rojo" "Azul" "Verde"\`

*Opciones avanzadas:*
• \`--anonymous\` o \`-a\`: Votación anónima
• \`--multi\` o \`-m\`: Permitir múltiples votos
• \`--limit=N\`: Limitar a N votos por usuario
• \`--expires=N\`: Expira en N minutos
• \`--hide-voters\`: Ocultar nombres de votantes

*Ejemplos:*
\`/poll "¿Pizza para el almuerzo?" "Sí" "No" --anonymous\`
\`/poll "Elige tus frameworks" "React" "Vue" "Angular" --multi --limit=2\`

*Comandos adicionales:*
\`/poll help\` - Mostrar esta ayuda
\`/poll list\` - Ver encuestas activas
`,
} as const;

export const HELP_MODAL = {
  title: "Ayuda de Nimio Poll",
  content: MESSAGES.help,
} as const;
