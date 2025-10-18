import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { getOrCreateUser } from './src/services/userService.js';
import { getAllCategories, classifyExpense } from './src/services/categoryService.js';
import { getPaymentMethods, findPaymentMethodByName } from './src/services/paymentMethodService.js';
import { createExpense, getRecentExpenses, getMonthlyTotal, getCategoryTotals, getPaymentMethodTotals } from './src/services/expenseService.js';
import { parseExpenseMessage, formatCurrency } from './src/utils/parser.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Telegram Expense Bot is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Bot configuration
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new TelegramBot(token);

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    if (update.message) {
      await processMessage(update.message);
    }
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process message function
async function processMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  try {
    // Comando /start
    if (text === '/start') {
      await getOrCreateUser(msg.from);
      const welcomeMessage = `
¡Hola ${msg.from.first_name}! 👋

Soy tu asistente de gastos personales con clasificación automática.

*Cómo registrar un gasto:*
Simplemente envía un mensaje describiendo tu gasto:
\`50 almuerzo en restaurante\`
\`25.50 uber a casa tarjeta\`
\`15 farmacia efectivo\`

*Comandos disponibles:*
/categorias - Ver todas las categorías
/metodos - Ver tus medios de pago
/resumen - Ver resumen del mes actual
/recientes - Ver últimos 10 gastos
/ayuda - Ver ayuda detallada
      `.trim();
      await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
      return;
    }

    // Comando /categorias
    if (text === '/categorias') {
      const categories = await getAllCategories();
      let message = '📂 *Categorías disponibles:*\n\n';
      categories.forEach(cat => {
        message += `${cat.icon} ${cat.name}\n`;
      });
      message += '\n💡 El bot clasificará automáticamente tus gastos.';
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return;
    }

    // Comando /metodos
    if (text === '/metodos') {
      const methods = await getPaymentMethods();
      let message = '💳 *Medios de pago disponibles:*\n\n';
      methods.forEach(method => {
        message += `${method.icon} ${method.name}\n`;
      });
      message += '\n💡 Especifica el medio al final: `50 almuerzo efectivo`';
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return;
    }

    // Comando /resumen
    if (text === '/resumen') {
      const user = await getOrCreateUser(msg.from);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      
      const monthlyTotal = await getMonthlyTotal(user.id, year, month);
      const categoryTotals = await getCategoryTotals(user.id, year, month);
      const paymentMethodTotals = await getPaymentMethodTotals(user.id, year, month);
      
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      
      let message = `📊 *Resumen de ${monthNames[month - 1]} ${year}*\n\n`;
      message += `💰 Total: *${formatCurrency(monthlyTotal)}*\n\n`;
      
      if (Object.keys(categoryTotals).length === 0) {
        message += 'No hay gastos registrados este mes.';
      } else {
        message += '*Por categoría:*\n';
        for (const [category, total] of Object.entries(categoryTotals)) {
          message += `${category}: ${formatCurrency(total)}\n`;
        }
        
        message += '\n*Por medio de pago:*\n';
        for (const [method, total] of Object.entries(paymentMethodTotals)) {
          message += `${method}: ${formatCurrency(total)}\n`;
        }
      }
      
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return;
    }

    // Comando /recientes
    if (text === '/recientes') {
      const user = await getOrCreateUser(msg.from);
      const expenses = await getRecentExpenses(user.id);
      
      if (expenses.length === 0) {
        await bot.sendMessage(chatId, 'No tienes gastos registrados aún.');
        return;
      }
      
      let message = '📋 *Últimos gastos:*\n\n';
      expenses.forEach(expense => {
        const icon = expense.categories?.icon || '📦';
        const category = expense.categories?.name || 'Sin categoría';
        const paymentIcon = expense.payment_methods?.icon || '💰';
        const paymentMethod = expense.payment_methods?.name || 'N/E';
        const date = new Date(expense.expense_date).toLocaleDateString('es-ES');
        message += `${icon} ${formatCurrency(expense.amount)} - ${category}\n   ${expense.description}\n   ${paymentIcon} ${paymentMethod}\n   📅 ${date}\n\n`;
      });
      
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return;
    }

    // Comando /ayuda
    if (text === '/ayuda') {
      const helpMessage = `
📖 *Guía de uso*

*Registrar un gasto:*
Describe tu gasto con el monto y la descripción.

*Formatos válidos:*
✅ \`50 almuerzo restaurante\`
✅ \`25.50 uber casa tarjeta\`
✅ \`15 farmacia paracetamol efectivo\`

*Comandos:*
/categorias - Ver categorías
/metodos - Ver medios de pago
/resumen - Resumen del mes
/recientes - Últimos 10 gastos
      `.trim();
      await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
      return;
    }

    // Procesar gasto (mensajes que no son comandos)
    if (!text.startsWith('/')) {
      const user = await getOrCreateUser(msg.from);
      const parsed = parseExpenseMessage(text);
      
      if (!parsed.amount) {
        await bot.sendMessage(chatId, '❌ No detecté el monto.\n\nEjemplo: `50 almuerzo en restaurante`', { parse_mode: 'Markdown' });
        return;
      }
      
      // Clasificar automáticamente
      const category = await classifyExpense(parsed.description);
      
      if (!category) {
        await bot.sendMessage(chatId, '❌ Error al clasificar el gasto. Intenta de nuevo.');
        return;
      }
      
      // Buscar método de pago si fue especificado
      let paymentMethodId = null;
      if (parsed.paymentMethod) {
        const paymentMethod = await findPaymentMethodByName(user.id, parsed.paymentMethod);
        if (paymentMethod) {
          paymentMethodId = paymentMethod.id;
        }
      }
      
      // Crear gasto
      const expense = await createExpense(
        user.id,
        category.id,
        parsed.amount,
        parsed.description,
        paymentMethodId
      );
      
      const confirmationMessage = `
✅ *Gasto registrado*

${category.icon} Categoría: ${category.name}
💰 Monto: ${formatCurrency(expense.amount)}
📝 Descripción: ${expense.description}
${paymentMethodId ? `💳 Medio de pago: Especificado` : '💳 Medio de pago: No especificado'}
📅 Fecha: ${new Date(expense.expense_date).toLocaleDateString('es-ES')}
      `.trim();
      
      await bot.sendMessage(chatId, confirmationMessage, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Error processing message:', error);
    await bot.sendMessage(chatId, '❌ Error al procesar el gasto. Por favor intenta de nuevo.');
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 Webhook ready at /webhook`);
});

// Ruta temporal para configurar webhook
app.get('/setup-webhook', async (req, res) => {
  try {
    const webhookUrl = `https://${req.get('host')}/webhook`;
    const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    });
    
    const data = await response.json();
    res.json({ webhookUrl, result: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

