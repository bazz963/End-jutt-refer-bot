const { Telegraf, Markup } = require('telegraf');

// ================= CONFIGURATION =================
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'; // Replace with BotFather token
const ADMIN_ID = 123456789; // Your numeric Telegram User ID
const FORCE_CHANNEL = '@yourchannelusername'; // Must start with @ (Bot MUST be admin in channel!)
const IMAGE_URL = 'https://i.imgur.com/example.jpg'; // Direct link to your image (.jpg/.png)
const LOCKED_LINK = 'https://t.me/yourchannelusername'; // Shown before 5 refs
const UNLOCKED_LINK = 'https://t.me/your_secret_unlocked_link'; // Unlocked link after 5 refs
// =================================================

const bot = new Telegraf(BOT_TOKEN);

// Memory database for users
const users = {}; 

// Helper: Check Force Join Status
async function isSubscribed(ctx, userId) {
  try {
    const member = await ctx.telegram.getChatMember(FORCE_CHANNEL, userId);
    return ['creator', 'administrator', 'member'].includes(member.status);
  } catch (err) {
    console.error('Force join error:', err);
    return false;
  }
}

// Helper: Initialize User Profile
function initUser(id, referrerId = null) {
  if (!users[id]) {
    users[id] = {
      referrals: 0,
      referredBy: referrerId,
      joinedDate: new Date().toLocaleDateString('en-US')
    };
    if (referrerId && users[referrerId] && referrerId !== id) {
      users[referrerId].referrals += 1;
    }
  }
}

// Helper: Custom Visual Progress Bar
function getProgressBar(count, max = 5) {
  const filled = Math.min(count, max);
  const empty = max - filled;
  return '🟩'.repeat(filled) + '⬛'.repeat(empty);
}

// Main Reply Keyboard Menu
const mainMenuKeyboard = Markup.keyboard([
  ['📊 Check Status', '🔗 Share Link'],
  ['🎁 Get Target Link', '👨‍💻 Developer']
]).resize();

// /start Command
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const startPayload = ctx.payload;
  const referrerId = startPayload && startPayload.startsWith('ref_') 
    ? parseInt(startPayload.replace('ref_', '')) 
    : null;

  initUser(userId, referrerId);

  // Check Force Join Status
  const hasJoined = await isSubscribed(ctx, userId);
  if (!hasJoined) {
    return ctx.replyWithPhoto(IMAGE_URL, {
      caption: `⚠️ <b>ACCESS DENIED!</b>\n\nWelcome <b>${ctx.from.first_name}</b>!\nTo use <b>End JUTT Refer Bot</b>, you must first join our channel: <b>${FORCE_CHANNEL}</b>.\n\nAfter joining, send /start again!`,
      parse_mode: 'HTML'
    });
  }

  sendDashboard(ctx);
});

// Dashboard Renderer
function sendDashboard(ctx) {
  const userId = ctx.from.id;
  const userData = users[userId] || { referrals: 0, joinedDate: new Date().toLocaleDateString('en-US') };
  const botUsername = ctx.botInfo.username;
  const refLink = `https://t.me/${botUsername}?start=ref_${userId}`;
  
  const targetRefs = 5;
  const isUnlocked = userData.referrals >= targetRefs;
  const progressBar = getProgressBar(userData.referrals, targetRefs);
  const remaining = Math.max(0, targetRefs - userData.referrals);

  const caption = 
`⚡ <b>END JUTT REFER BOT</b> ⚡

Welcome <b>${ctx.from.first_name}</b>!

📊 <b><u>YOUR PROFILE DASHBOARD</u></b>
├ 👤 <b>User ID:</b> <code>${userId}</code>
├ 👥 <b>Referrals:</b> <b>${userData.referrals} / ${targetRefs}</b>
├ 📈 <b>Progress:</b> ${progressBar}
├ 🔓 <b>Status:</b> ${isUnlocked ? '<b>[ UNLOCKED ]</b>' : '<b>[ LOCKED ]</b>'}
└ 📅 <b>Registered:</b> ${userData.joinedDate}

${isUnlocked 
  ? '🎉 <b>Congratulations! You have unlocked your target link! Use the menu below to get it.</b>' 
  : `🎯 <i>Invite <b>${remaining}</b> more friend(s) to unlock your reward!</i>`}

🔗 <b>Your Referral Link:</b>
<code>${refLink}</code>

👑 <b>Owner:</b> @BazzHacker963`;

  ctx.replyWithPhoto(IMAGE_URL, {
    caption,
    parse_mode: 'HTML',
    ...mainMenuKeyboard
  });
}

// Button Listener: Check Status
bot.hears('📊 Check Status', async (ctx) => {
  const userId = ctx.from.id;
  const hasJoined = await isSubscribed(ctx, userId);

  if (!hasJoined) {
    return ctx.reply(`⚠️ Please join ${FORCE_CHANNEL} first!`);
  }

  const userData = users[userId] || { referrals: 0 };
  const targetRefs = 5;
  const remaining = Math.max(0, targetRefs - userData.referrals);

  if (userData.referrals >= targetRefs) {
    ctx.reply('🎉 <b>Status: UNLOCKED!</b>\n\nClick "🎁 Get Target Link" to access your link.', { parse_mode: 'HTML' });
  } else {
    ctx.reply(`📌 <b>Current Status:</b>\n\nReferrals: <b>${userData.referrals}/${targetRefs}</b>\nYou need <b>${remaining}</b> more referral(s) to unlock the link!`, { parse_mode: 'HTML' });
  }
});

// Button Listener: Share Link
bot.hears('🔗 Share Link', async (ctx) => {
  const userId = ctx.from.id;
  const botUsername = ctx.botInfo.username;
  const refLink = `https://t.me/${botUsername}?start=ref_${userId}`;

  ctx.reply(
    `🚀 <b>Share your link with friends to get referrals:</b>\n\n<code>${refLink}</code>`, 
    { parse_mode: 'HTML' }
  );
});

// Button Listener: Get Target Link
bot.hears('🎁 Get Target Link', async (ctx) => {
  const userId = ctx.from.id;
  const userData = users[userId] || { referrals: 0 };

  if (userData.referrals >= 5) {
    ctx.reply(`🔓 <b>ACCESS GRANTED!</b>\n\nHere is your unlocked target link:\n${UNLOCKED_LINK}`, { parse_mode: 'HTML' });
  } else {
    const remaining = 5 - userData.referrals;
    ctx.reply(`🔒 <b>LINK LOCKED!</b>\n\nYou need 5 referrals to unlock this link.\nYou currently have <b>${userData.referrals}/5</b> (Need <b>${remaining}</b> more).`, { parse_mode: 'HTML' });
  }
});

// Button Listener: Developer Info
bot.hears('👨‍💻 Developer', (ctx) => {
  ctx.reply(`👨‍💻 <b>Developer Info:</b>\n\nOwner / Developer: @BazzHacker963\nContact: https://t.me/BazzHacker963`, { parse_mode: 'HTML' });
});

// Admin Command: /broadcast
bot.command('broadcast', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply('❌ Unauthorized command.');
  }

  const broadcastMsg = ctx.message.text.split(' ').slice(1).join(' ');
  if (!broadcastMsg) {
    return ctx.reply('⚠️ Usage: <code>/broadcast Your message text here</code>', { parse_mode: 'HTML' });
  }

  const allUserIds = Object.keys(users);
  let count = 0;

  for (const id of allUserIds) {
    try {
      await ctx.telegram.sendMessage(id, broadcastMsg, { parse_mode: 'HTML' });
      count++;
    } catch (e) {
      console.error(`Failed to send message to ${id}`);
    }
  }

  ctx.reply(`📢 Broadcast successfully delivered to <b>${count}</b> users!`, { parse_mode: 'HTML' });
});

// Admin Command: /stats
bot.command('stats', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const totalUsers = Object.keys(users).length;
  ctx.reply(`📊 <b>Total Registered Users:</b> <code>${totalUsers}</code>`, { parse_mode: 'HTML' });
});

bot.launch().then(() => console.log('End JUTT Refer Bot is active!'));
