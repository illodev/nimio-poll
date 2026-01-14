# 🗳️ Nimio Poll

**Una aplicación de encuestas moderna para Slack** - Más potente y elegante que Simple Poll.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)
![Vercel](https://img.shields.io/badge/Hosted%20on-Vercel-black.svg)

## ✨ Características

- 📊 **Visualización en tiempo real** - Barras de progreso y porcentajes actualizados al instante
- 🕵️ **Votación anónima** - Oculta la identidad de los votantes
- ☑️ **Múltiples respuestas** - Permite votar por varias opciones
- ⏰ **Expiración automática** - Cierra encuestas automáticamente
- ➕ **Añadir opciones** - Los participantes pueden añadir nuevas opciones
- 🔄 **Toggle de votos** - Haz clic de nuevo para quitar tu voto
- 🏆 **Resultados destacados** - Muestra el ganador al cerrar

## 🚀 Despliegue Rápido

### 1. Crear App en Slack

1. Ve a [api.slack.com/apps](https://api.slack.com/apps) y crea una nueva app
2. Selecciona "From scratch" y dale un nombre (ej: "Nimio Poll")
3. En **OAuth & Permissions**, añade estos Bot Token Scopes:

   - `chat:write`
   - `chat:write.public`
   - `commands`
   - `users:read`
   - `channels:read`
   - `groups:read`

4. En **Slash Commands**, crea un nuevo comando:

   - Command: `/poll`
   - Request URL: `https://nimio-poll.vercel.app/api/slack/command`
   - Description: `Crear encuestas modernas`
   - Usage Hint: `"Pregunta" "Opción 1" "Opción 2" [--anonymous] [--multi]`

5. En **Interactivity & Shortcuts**:

   - Activa Interactivity
   - Request URL: `https://nimio-poll.vercel.app/api/slack/interactions`

6. En **OAuth & Permissions**:
   - Add Redirect URL: `https://nimio-poll.vercel.app/api/slack/oauth/redirect`

### 2. Desplegar en Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/nimio-poll)

O manualmente:

```bash
# Clonar el repositorio
git clone https://github.com/your-repo/nimio-poll
cd nimio-poll

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales

# Desplegar
vercel
```

### 3. Configurar Upstash Redis

**Opción A - Desde Vercel Marketplace (recomendado):**

1. En el dashboard de Vercel, ve a **Storage** > **Browse Marketplace**
2. Selecciona **Upstash Redis**
3. Crea una nueva base de datos y conecta a tu proyecto
4. Las variables de entorno se configuran automáticamente

**Opción B - Desde Upstash directamente:**

1. Ve a [console.upstash.com](https://console.upstash.com)
2. Crea una nueva base de datos Redis
3. Copia `UPSTASH_REDIS_REST_KV_URL` y `UPSTASH_REDIS_REST_KV_REST_API_TOKEN`
4. Añádelas en Vercel > Settings > Environment Variables

### 4. Variables de Entorno

Configura estas variables en Vercel:

| Variable                               | Descripción                            |
| -------------------------------------- | -------------------------------------- |
| `SLACK_CLIENT_ID`                      | Client ID de tu Slack App              |
| `SLACK_CLIENT_SECRET`                  | Client Secret de tu Slack App          |
| `SLACK_SIGNING_SECRET`                 | Signing Secret para verificar requests |
| `SLACK_BOT_TOKEN`                      | Bot Token (para single workspace)      |
| `UPSTASH_REDIS_REST_KV_URL`            | URL de Upstash Redis                   |
| `UPSTASH_REDIS_REST_KV_REST_API_TOKEN` | Token de Upstash Redis                 |

## 📖 Uso

### Crear una encuesta básica

```
/poll "¿Dónde almorzamos hoy?" "Pizza" "Sushi" "Tacos"
```

### Opciones disponibles

| Opción               | Descripción                   |
| -------------------- | ----------------------------- |
| `--anonymous` o `-a` | Votación anónima              |
| `--multi` o `-m`     | Permitir múltiples votos      |
| `--limit=N`          | Limitar a N votos por persona |
| `--expires=N`        | Expira en N minutos           |
| `--hide-voters`      | Ocultar nombres de votantes   |
| `--allow-add`        | Permitir añadir opciones      |

### Ejemplos

```bash
# Encuesta anónima
/poll "¿Qué framework prefieres?" "React" "Vue" "Angular" --anonymous

# Múltiples votos con límite
/poll "Elige 2 lenguajes" "Python" "JavaScript" "Go" "Rust" --multi --limit=2

# Encuesta con expiración
/poll "¿Reunión mañana?" "9:00" "10:00" "11:00" --expires=60

# Permitir añadir opciones
/poll "Ideas para el team building" "Escape room" "Paintball" --allow-add
```

### Comandos adicionales

```bash
/poll help    # Ver ayuda
/poll list    # Ver encuestas activas
```

## 🏗️ Arquitectura

```
nimio-poll/
├── api/
│   ├── index.ts              # Health check
│   └── slack/
│       ├── command.ts        # /poll command handler
│       ├── interactions.ts   # Button clicks, modals
│       ├── events.ts         # Event subscriptions
│       └── oauth/
│           ├── index.ts      # OAuth start
│           └── redirect.ts   # OAuth callback
├── lib/
│   ├── types.ts              # TypeScript interfaces
│   ├── constants.ts          # Emojis, limits, messages
│   ├── utils.ts              # Helper functions
│   ├── storage.ts            # Vercel KV storage
│   ├── blocks.ts             # Slack Block Kit builder
│   ├── poll-service.ts       # Business logic
│   └── slack.ts              # Slack API helpers
├── package.json
├── tsconfig.json
└── vercel.json
```

## 🔧 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# En otra terminal, usa ngrok para exponer localmente
ngrok http 3000

# Actualiza las URLs en tu Slack app con la URL de ngrok
```

## 🎨 Personalización

### Cambiar emojis

Edita `lib/constants.ts`:

```typescript
export const EMOJIS = {
  numbers: ['1️⃣', '2️⃣', '3️⃣', ...],
  // Añade tu propio estilo
  custom: ['🍕', '🍣', '🌮', ...],
};
```

### Cambiar límites

```typescript
export const LIMITS = {
  maxOptions: 10, // Máximo de opciones
  maxQuestionLength: 300, // Longitud de pregunta
  maxOptionLength: 150, // Longitud de opción
};
```

## 📝 API Reference

### POST /api/slack/command

Maneja el comando `/poll`. Espera form-urlencoded con payload de Slack.

### POST /api/slack/interactions

Maneja interacciones (botones, modales). Espera form-urlencoded con `payload` JSON.

### POST /api/slack/events

Maneja eventos de Slack (menciones, desinstalación).

### GET /api/slack/oauth

Inicia el flujo OAuth para instalación multi-workspace.

### GET /api/slack/oauth/redirect

Callback de OAuth. Guarda tokens y muestra página de éxito.

## 🔐 Seguridad

- ✅ Verificación de firma de Slack en cada request
- ✅ Tokens almacenados de forma segura en Vercel KV
- ✅ No se exponen credenciales en el cliente
- ✅ Validación de timestamps para prevenir replay attacks

## 📄 Licencia

MIT © 2024

---

<p align="center">
  Hecho con ❤️ para equipos que quieren mejores encuestas en Slack
</p>
