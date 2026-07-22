const { Telegraf, Markup } = require('telegraf');

// ================= CONFIGURATION =================
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const ADMIN_ID = 123456789; // Your numeric Telegram User ID
const FORCE_CHANNEL = '@yourchannelusername'; // Must start with @ (Add bot as admin to this channel!)
const IMAGE_URL = 'https://i.imgur.com/example.jpg'; // Your photo direct link
const LOCKED_LINK = 'https://t.me/yourchannelusername';
const UNLOCKED_LINK = 'https://t.me/your_secret_unlocked_link';
const DEV_USERNAME = '@BazzHacker963';
// =================================================

const bot = new Telegraf(BOT_TOKEN);

// Database in memory (For production, use a persistent database like MongoDB or SQLite)
const users = {}; 

// Helper: Check Force Join
async function isSubscribed(ctx, userId) {
  try {
    const member = await ctx.telegram.getChatMember(FORCE_CHANNEL, userId);
    return ['creator', 'administrator', 'member'].includes(member.status);
  } catch (err) {
    console.error('Force join check error:', err);
    return false;
  }
}

// Ensure user exists in memory
function initUser(id, referrerId = null) {
  if (!users[id]) {
    users[id] = {
      referrals: 0,
      referredBy: referrerId,
      joinedDate: new Date().toLocaleDateString('en-US')
    };
    if (referrerId && users[referrerId]) {
      users[referrerId].referrals += 1;
    }
  }
}

// /start Command
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const startPayload = ctx.payload; // Contains ref code if available
  const referrerId = startPayload.startsWith('ref_') ? parseInt(startPayload.replace('ref_', '')) : null;

  if (referrerId && referrerId !== userId) {
    initUser(userId, referrerId);
  } else {
    initUser(userId);
  }

  // Check Force Join
  const hasJoined = await isSubscribed(ctx, userId);
  if (!hasJoined) {
    const forceJoinKeyboard = Markup.inlineKeyboard([
      [Markup.button.url('📢 Join Channel', `https://t.me/${FORCE_CHANNEL.replace('@', '')}`)],
      [Markup.button.callback('✅ Joined / Verify', 'check_subscription')]
    ]);

    return ctx.replyWithPhoto(IMAGE_URL, {
      caption: `⚠️ **Access Denied!**\n\nYou must join our channel ${FORCE_CHANNEL} to use **End JUTT refer bot**.`,
      parse_mode: 'Markdown',
      ...forceJoinKeyboard
    });
  }

  sendDashboard(ctx);
});

// Subscription Check Callback
bot.action('check_subscription', async (ctx) => {
  const userId = ctx.from.id;
  const hasJoined = await isSubscribed(ctx, userId);

  if (hasJoined) {
    await ctx.answerCbQuery('✅ Verified!');
    sendDashboard(ctx);
  } else {
    await ctx.answerCbQuery('❌ You have not joined the channel yet!', { show_alert: true });
  }
});

// Dashboard Function
function sendDashboard(ctx) {
  const userId = ctx.from.id;
  const userData = users[userId] || { referrals: 0, joinedDate: new Date().toLocaleDateString('en-US') };
  const botUsername = ctx.botInfo.username;
  const refLink = `https://t.me/${botUsername}?start=ref_${userId}`;
  
  const isUnlocked = userData.referrals >= 5;
  const progressPercent = Math.min((userData.referrals / 5) * 100, 100);
  const progressBar = '█'.repeat(Math.floor(progressPercent / 10)) + '░'.repeat(10 - Math.floor(progressPercent / 10));

  const caption = 
`🚀 **END JUTT REFER BOT** 🚀

✨ Welcome ${ctx.from.first_name}!

📊 **Your Status:**
├ 📌 Referrals: ${userData.referrals}/5
├ 🔒 Status: ${isUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
├ 📈 Progress: ${progressBar} ${progressPercent}%
└ 📅 Joined: ${userData.joinedDate}

🔗 **Your Referral Link:**
\`${refLink}\`

💡 Share this link with friends to earn rewards!
🎯 Get 5 referrals to UNLOCK!

👑 Owner: ${BazzHacker963}`;

  const mainKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📊 Check Status', 'check_status'), Markup.button.callback('🔗 Share Link', 'share_link')],
    [Markup.button.url('👨‍💻 Developer', `https://t.me/${DEV_USERNAME.replace('@BazzHacker963', '')}`)],
    [Markup.button.url('🎁 Get Target Link', isUnlocked ? UNLOCKED_LINK : LOCKED_LINK)]
  ]);

  ctx.replyWithPhoto(IMAGE_URL, {
    caption,
    parse_mode: 'Markdown',
    ...mainKeyboard
  });
}

// Inline Button Handlers
bot.action('check_status', (ctx) => {
  const userId = ctx.from.id;
  const refs = users[userId] ? users[userId].referrals : 0;
  ctx.answerCbQuery(`You currently have ${refs}/5 referrals.`, { show_alert: true });
});

bot.action('share_link', (ctx) => {
  const userId = ctx.from.id;
  const botUsername = ctx.botInfo.username;
  const refLink = `https://t.me/${botUsername}?start=ref_${userId}`;
  ctx.reply(`Here is your referral link:\n\`${refLink}\``, { parse_mode: 'Markdown' });
  ctx.answerCbQuery();
});

// Admin Broadcast Command
bot.command('broadcast', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply('❌ You are not authorized to use this command.');
  }

  const broadcastMsg = ctx.message.text.split(' ').slice(1).join(' ');
  if (!broadcastMsg) {
    return ctx.reply('Usage: `/broadcast Your message here`', { parse_mode: 'Markdown' });
  }

  const allUserIds = Object.keys(users);
  let count = 0;

  for (const id of allUserIds) {
    try {
      await ctx.telegram.sendMessage(id, broadcastMsg);
      count++;
    } catch (e) {
      console.error(`Failed to send to ${id}`);
    }
  }

  ctx.reply(`📢 Broadcast sent to ${count} users.`);
});

bot.launch().then(() => console.log('Bot is running...'));
