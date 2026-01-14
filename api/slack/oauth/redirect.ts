// OAuth Redirect - Handles callback from Slack
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOAuthCallback } from '../../../lib/slack';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, error } = req.query;

  // Handle errors from Slack
  if (error) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Instalación Cancelada - Nimio Poll</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 400px;
            }
            h1 { color: #e74c3c; margin-bottom: 16px; }
            p { color: #666; line-height: 1.6; }
            a {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 24px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              transition: transform 0.2s;
            }
            a:hover { transform: translateY(-2px); }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Instalación Cancelada</h1>
            <p>La instalación de Nimio Poll fue cancelada o hubo un error.</p>
            <p>Error: ${error}</p>
            <a href="/api/slack/oauth">Intentar de nuevo</a>
          </div>
        </body>
      </html>
    `);
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing authorization code');
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = process.env.SLACK_REDIRECT_URI || `https://${req.headers.host}/api/slack/oauth/redirect`;

  if (!clientId || !clientSecret) {
    return res.status(500).send('OAuth credentials not configured');
  }

  try {
    const result = await handleOAuthCallback(code, clientId, clientSecret, redirectUri);

    if (!result.success) {
      throw new Error(result.error || 'OAuth failed');
    }

    // Success page
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>¡Instalado! - Nimio Poll</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            .icon { font-size: 64px; margin-bottom: 20px; }
            h1 { color: #2c3e50; margin-bottom: 16px; }
            p { color: #666; line-height: 1.6; }
            .team { 
              display: inline-block;
              background: #f0f0f0;
              padding: 8px 16px;
              border-radius: 8px;
              font-weight: 600;
              color: #333;
              margin: 10px 0;
            }
            .command {
              background: #1e1e1e;
              color: #fff;
              padding: 16px;
              border-radius: 8px;
              font-family: 'SF Mono', Monaco, monospace;
              margin: 20px 0;
            }
            .features {
              text-align: left;
              margin: 20px 0;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .features li { margin: 8px 0; }
            a {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 24px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              transition: transform 0.2s;
            }
            a:hover { transform: translateY(-2px); }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🗳️</div>
            <h1>¡Nimio Poll Instalado!</h1>
            <p>La aplicación se ha instalado correctamente en:</p>
            <div class="team">${result.teamName}</div>
            
            <p>Ahora puedes crear encuestas modernas en cualquier canal:</p>
            <div class="command">/poll "¿Tu pregunta?" "Opción 1" "Opción 2"</div>
            
            <div class="features">
              <strong>✨ Características:</strong>
              <ul>
                <li>📊 Visualización en tiempo real de votos</li>
                <li>🕵️ Votación anónima</li>
                <li>☑️ Múltiples respuestas</li>
                <li>⏰ Expiración automática</li>
                <li>➕ Añadir opciones sobre la marcha</li>
              </ul>
            </div>
            
            <p>Escribe <code>/poll help</code> para ver todas las opciones.</p>
            
            <a href="slack://open">Abrir Slack</a>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('OAuth error:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error - Nimio Poll</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 400px;
            }
            h1 { color: #e74c3c; margin-bottom: 16px; }
            p { color: #666; line-height: 1.6; }
            a {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 24px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              transition: transform 0.2s;
            }
            a:hover { transform: translateY(-2px); }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Error de Instalación</h1>
            <p>Hubo un problema al instalar Nimio Poll. Por favor, inténtalo de nuevo.</p>
            <a href="/api/slack/oauth">Reintentar</a>
          </div>
        </body>
      </html>
    `);
  }
}
