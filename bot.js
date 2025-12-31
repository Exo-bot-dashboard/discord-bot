require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const express = require('express');

// Initialize clients
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory cache
const cache = {
  modules: {},
  settings: {},
  warnings: {},
  rarities: {},
  shopItems: {},
};

// Express server for health check
const app = express();
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});
app.listen(process.env.PORT || 3000, () => {
  console.log(`Health check server running on port ${process.env.PORT || 3000}`);
});

// ============================================
// BOT READY EVENT
// ============================================
client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  client.user.setActivity('Exo Dashboard', { type: 'PLAYING' });

  // Load modules and settings from Supabase
  await loadModulesFromSupabase();
  await registerCommands();
  
  // Subscribe to real-time updates
  subscribeToModuleChanges();
  subscribeToSettingsChanges();
});

// ============================================
// LOAD MODULES FROM SUPABASE
// ============================================
async function loadModulesFromSupabase() {
  try {
    const { data: modules, error } = await supabase
      .from('modules')
      .select('*');

    if (error) throw error;

    modules.forEach(mod => {
      cache.modules[mod.id] = mod.enabled;
    });

    console.log('✅ Modules loaded from Supabase');
  } catch (error) {
    console.error('❌ Error loading modules:', error);
  }
}

// ============================================
// REGISTER DISCORD COMMANDS
// ============================================
async function registerCommands() {
  try {
    const commands = [];

    // Plugin Module Commands
    if (cache.modules.plugin) {
      commands.push({
        name: 'poll',
        description: 'Create a poll',
        options: [
          { name: 'question', description: 'Poll question', type: 3, required: true },
          { name: 'option1', description: 'Option 1', type: 3, required: true },
          { name: 'option2', description: 'Option 2', type: 3, required: true },
        ],
      });
      commands.push({
        name: 'apply',
        description: 'Submit an application',
      });
    }

    // Helix Module Commands
    if (cache.modules.helix) {
      commands.push({
        name: 'backup',
        description: 'Create a server backup',
      });
      commands.push({
        name: 'report',
        description: 'Submit a report',
        options: [
          { name: 'reason', description: 'Report reason', type: 3, required: true },
        ],
      });
      commands.push({
        name: 'signal',
        description: 'Send a signal/announcement',
        options: [
          { name: 'message', description: 'Signal message', type: 3, required: true },
        ],
      });
    }

    // Economy Module Commands
    if (cache.modules.economy) {
      commands.push({
        name: 'balance',
        description: 'Check your balance',
      });
      commands.push({
        name: 'buy',
        description: 'Buy an item from the shop',
        options: [
          { name: 'item_id', description: 'Item ID', type: 3, required: true },
        ],
      });
      commands.push({
        name: 'rarityinfo',
        description: 'Get rarity information',
        options: [
          { name: 'rarity_id', description: 'Rarity ID', type: 3, required: true },
        ],
      });
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
      body: commands,
    });

    console.log(`✅ Registered ${commands.length} commands`);
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}

// ============================================
// SUBSCRIBE TO MODULE CHANGES (REAL-TIME)
// ============================================
function subscribeToModuleChanges() {
  supabase
    .channel('modules-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'modules' },
      async (payload) => {
        console.log('📡 Module change detected:', payload);
        cache.modules[payload.new.id] = payload.new.enabled;
        await registerCommands(); // Re-register commands
      }
    )
    .subscribe();
}

// ============================================
// SUBSCRIBE TO SETTINGS CHANGES (REAL-TIME)
// ============================================
function subscribeToSettingsChanges() {
  supabase
    .channel('settings-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'module_settings' },
      (payload) => {
        console.log('📡 Settings change detected:', payload);
        cache.settings[payload.new.module_id] = payload.new;
      }
    )
    .subscribe();
}

// ============================================
// MESSAGE CREATE EVENT (INSPECT MODULE)
// ============================================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  try {
    // Check if Inspect module is enabled
    if (!cache.modules.helix) return;

    // Get channel topic from Supabase
    const { data: channelConfig } = await supabase
      .from('inspect_channels')
      .select('topic')
      .eq('channel_id', message.channelId)
      .single();

    if (!channelConfig) return; // Channel not monitored

    // Use OpenAI to detect off-topic
    const isOnTopic = await checkIfOnTopic(message.content, channelConfig.topic);

    if (!isOnTopic) {
      // Increment warning count
      const warningKey = `${message.authorId}-${message.channelId}`;
      cache.warnings[warningKey] = (cache.warnings[warningKey] || 0) + 1;

      // Save warning to Supabase
      await supabase.from('warnings').insert({
        user_id: message.authorId,
        channel_id: message.channelId,
        message_content: message.content,
        created_at: new Date(),
      });

      // Warn user
      const warningCount = cache.warnings[warningKey];
      await message.reply(`⚠️ Off-topic message! (Warning ${warningCount}/3)`);

      // Mute after 3 warnings
      if (warningCount >= 3) {
        await message.member.timeout(60000, 'Off-topic warnings exceeded');
        await message.reply(`🔇 You have been muted for 1 minute.`);
      }
    }
  } catch (error) {
    console.error('❌ Error in messageCreate:', error);
  }
});

// ============================================
// CHECK IF MESSAGE IS ON-TOPIC (OPENAI)
// ============================================
async function checkIfOnTopic(messageContent, topic) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a content moderator. Determine if a message is about the specified topic. Answer only "yes" or "no".`,
        },
        {
          role: 'user',
          content: `Topic: "${topic}"\n\nMessage: "${messageContent}"\n\nIs this message about the topic?`,
        },
      ],
      max_tokens: 10,
    });

    const answer = response.choices[0].message.content.toLowerCase().trim();
    return answer.includes('yes');
  } catch (error) {
    console.error('❌ Error checking topic with OpenAI:', error);
    return true; // Default to on-topic if API fails
  }
}

// ============================================
// INTERACTION CREATE EVENT (SLASH COMMANDS)
// ============================================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  try {
    const { commandName } = interaction;

    // Plugin Module Commands
    if (commandName === 'poll') {
      const question = interaction.options.getString('question');
      const option1 = interaction.options.getString('option1');
      const option2 = interaction.options.getString('option2');

      await interaction.reply(`📊 **${question}**\n1️⃣ ${option1}\n2️⃣ ${option2}`);

      // Save poll to Supabase
      await supabase.from('polls').insert({
        guild_id: interaction.guildId,
        question,
        option1,
        option2,
        created_at: new Date(),
      });
    }

    if (commandName === 'apply') {
      await interaction.reply('📝 Application form submitted!');
      // Handle application logic
    }

    // Helix Module Commands
    if (commandName === 'backup') {
      await interaction.reply('💾 Creating server backup...');
      // Handle backup logic
    }

    if (commandName === 'report') {
      const reason = interaction.options.getString('reason');
      await interaction.reply(`📋 Report submitted: ${reason}`);
      // Save report to Supabase
    }

    if (commandName === 'signal') {
      const message = interaction.options.getString('message');
      await interaction.reply(`📢 Signal sent: ${message}`);
      // Broadcast signal
    }

    // Economy Module Commands
    if (commandName === 'balance') {
      const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('user_id', interaction.user.id)
        .single();

      const balance = user?.balance || 0;
      await interaction.reply(`💰 Your balance: ${balance}`);
    }

    if (commandName === 'buy') {
      const itemId = interaction.options.getString('item_id');
      await interaction.reply(`🛍️ Purchasing item ${itemId}...`);
      // Handle purchase logic
    }

    if (commandName === 'rarityinfo') {
      const rarityId = interaction.options.getString('rarity_id');
      const { data: rarity } = await supabase
        .from('rarities')
        .select('*')
        .eq('id', rarityId)
        .single();

      if (rarity) {
        await interaction.reply(`⭐ **${rarity.name}** - Weight: ${rarity.weight}`);
      } else {
        await interaction.reply('❌ Rarity not found');
      }
    }
  } catch (error) {
    console.error('❌ Error in interactionCreate:', error);
    await interaction.reply('❌ An error occurred');
  }
});

// ============================================
// LOGIN TO DISCORD
// ============================================
client.login(process.env.DISCORD_TOKEN);
