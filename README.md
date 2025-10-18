# Bot de Telegram - Control de Gastos

Bot de Telegram para gestión de gastos personales con clasificación automática.

## Deploy en Vercel

1. Fork o clona este repositorio
2. Conecta tu repositorio con Vercel
3. Configura las variables de entorno en Vercel:
   - `TELEGRAM_BOT_TOKEN`
   - `Database_URL`
   - `Database_SERVICE_ROLE_KEY`
4. Deploy

## Configurar Webhook

Después del deploy, ejecuta:

```bash
curl -X POST "https://api.telegram.org/bot<TU_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://tu-proyecto.vercel.app/api/webhook"}'