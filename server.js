import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import dotenv, { parse } from 'dotenv';
import { getOrCreateUser } from './src/services/userService.js';
import { getAllCategories, getCategoryBySubcategory } from './src/services/categoryService.js';
import { getAllSubcategories, findSubcategoryByName } from './src/services/subcategoryService.js';
import { getPaymentMethods, findPaymentMethodByName } from './src/services/paymentMethodService.js';
import { createExpense, getRecentExpenses, getMonthlyTotal, getCategoryTotals, getPaymentMethodTotals } from './src/services/expenseService.js';
import { parseExpenseMessage, formatCurrency } from './src/utils/parser.js';
import { classifyExpense } from './src/utils/classifier.js';
import { classifyExpense as classifyExpenseDB } from './src/services/subcategoryService.js';
import { Database } from './src/supabase.js';

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
    if (text === '/inicio') {
      await getOrCreateUser(msg.from);
      const welcomeMessage = 
`
👋 *Hola ${msg.from.first_name}!*

Soy *Mammón*, tu asistente para llevar el control de tus gastos.
Estoy aquí para ayudarte a registrar tus movimientos de forma rápida y sencilla, solo con un mensaje.
Puedo clasificar tus gastos automáticamente y mostrarte en qué se te va el dinero.

💡 *Cómo registrar un gasto:*
Escribe el importe, una breve descripción y, si querés, la forma de pago después de un punto. Yo me encargo del resto.
Ejemplos:
  \`50 almuerzo en restaurante\`
  \`25.50 uber a casa. Efectivo\`
  \`15 farmacia. Tarjeta\`

⚙️ *Comandos disponibles:*
/recientes - Te muestro los últimos 10 gastos registrados
/resumen - Todos los gastos clasificados por categoría o método de pago
/metodos - Lista de métodos de pago disponibles
/categorias - Lista de categorías disponibles
/subcategorias - Lista de subcategorías disponibles
/buscar [palabra o monto] - Encuentra un gasto específico
/balance - Total gastado y resumen del mes
/borrar [ID o palabra] - Elimina un gasto registrados
/vincular [email] - Vincular tu cuenta web para ver estadísticas
/ayuda - Consultas frecuentes y soporte
      
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

    // Comando /subcategorias
    if (text === '/subcategorias') {
      const subcategories = await getAllSubcategories();
      let message = '📂 *Subcategorías disponibles:*\n\n';
      subcategories.forEach(cat => {
        message += `${cat.name}\n`;
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
      const helpMessage = 
`
❓ Centro de ayuda de *Mammón*
Si necesitas una mano para usarme, te dejo una guía rápida con todo lo que podemos hacer juntos.

💡 Registrar un gasto:
Solo escribí el importe, una breve descripción y, si querés, la forma de pago después de un punto.
Ejemplos:
  \`50 almuerzo en restaurante\`
  \`25.50 uber a casa. Efectivo\`
  \`15 farmacia. Tarjeta\`

🧠 Consejos rápidos:
Podés escribir los montos con o sin decimales.
Si no indicás un método de pago, lo guardaré automáticamente como “Efectivo”.
Podés pedirme tus gastos recientes, un resumen o buscar algo específico con los comandos disponibles.

💖 Apoyá el proyecto:
Si querés ayudarme a seguir creciendo y mejorando, podés hacerlo a través de...

📩 ¿Tienes dudas o algo no funciona bien?
Podés comunicarte con mi creador: @unpeladoconpelo

`.trim();
      await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
      return;
    }

    // Comando /vincular
    if (text.startsWith('/vincular')) {
      const email = text.split(' ')[1]?.trim();
      if (!email || !email.includes('@')) {
        await bot.sendMessage(chatId, 'Uso: `/vincular tu@email.com`\n\nPrimero registrate en la web y luego usa este comando para vincular tu cuenta.', { parse_mode: 'Markdown' });
        return;
      }

      const user = await getOrCreateUser(msg.from);

      // Buscar el usuario de auth por email
      const { data: { users: authUsers }, error: authError } = await Database.auth.admin.listUsers();
      if (authError) {
        await bot.sendMessage(chatId, '🔴 Error al buscar la cuenta. Intenta de nuevo.');
        return;
      }

      const authUser = authUsers?.find(u => u.email === email);
      if (!authUser) {
        await bot.sendMessage(chatId, '🔴 No se encontro una cuenta web con ese email. Registrate primero en la web.');
        return;
      }

      // Vincular cuentas
      const { error: updateError } = await Database
        .from('users')
        .update({ email, auth_id: authUser.id })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error vinculando cuenta:', updateError);
        await bot.sendMessage(chatId, '🔴 Error al vincular. Puede que ese email ya este vinculado a otra cuenta.');
        return;
      }

      await bot.sendMessage(chatId, '🟢 *Cuenta vinculada exitosamente!*\n\nYa podes ver tus gastos y estadísticas en la web.', { parse_mode: 'Markdown' });
      return;
    }

    // Procesar gasto (mensajes que no son comandos)
    if (!text.startsWith('/')) {
      const user = await getOrCreateUser(msg.from);
      const parsed = await parseExpenseMessage(text);

      if (!parsed.amount) {
        await bot.sendMessage(chatId, '🔴 No detecté el monto.\n\nEjemplo: `50 almuerzo en restaurante`', { parse_mode: 'Markdown' });
        return;
      }
      
      // Clasificar automáticamente (scoring por similitud → fallback DB → "Otros")
      let subcategory = null;

      // Tier 1: Clasificación por scoring de keywords locales
      const subcategoryName = classifyExpense(parsed.description);
      if (subcategoryName) {
        subcategory = await findSubcategoryByName(subcategoryName);
      }

      // Tier 2: Fallback a búsqueda por keywords en base de datos
      if (!subcategory) {
        subcategory = await classifyExpenseDB(parsed.description);
      }

      if (!subcategory) {
        await bot.sendMessage(chatId, '🔴 No pude clasificar el gasto. Intenta con una descripción más detallada.');
        return;
      }

      const category = await getCategoryBySubcategory(subcategory.id);
      
      // Buscar método de pago si fue especificado
      let paymentMethodId = null;
      if (parsed.paymentMethod) {
        const paymentMethod = await findPaymentMethodByName(parsed.paymentMethod);
        if (paymentMethod) {
          paymentMethodId = paymentMethod.id;
        }
      }
      
      // Crear gasto
      const expense = await createExpense(
        user.id,
        subcategory.id,
        parsed.amount,
        parsed.description,
        paymentMethodId
      );

      const confirmationMessage = 
`
🟢 *Registrado*
📅 ${new Date(expense.expense_date).toLocaleDateString('es-ES')}
${category.icon} ${category.name} > ${subcategory.name}
💰 *${formatCurrency(expense.amount)}* · ${expense.description}
${paymentMethodId ? `💳 Pago con ${parsed.paymentMethod.toLowerCase()}` : '💳 Pago no definido'}
`.trim();

      await bot.sendMessage(chatId, confirmationMessage, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Error processing message:', error);
    await bot.sendMessage(chatId, '🔴 Error al procesar el gasto. Por favor intenta de nuevo.');
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

