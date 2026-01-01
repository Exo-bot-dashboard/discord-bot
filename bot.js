const { Client, GatewayIntentBits } = require('discord.js');
const { supabase } = require('./utils/supabase');
const { registerCommandsForGuild, handleCommand } = require('./commands');
const { setupEventListeners } = require('./events');
const cron = require('node-cron');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
  ],
});

// Initialize global cache
global.botCache = {
  modules: {},
  userCurrency: {},
  channelTopics: {},
  warnings: {},
  spamTracking: {},
  enabledEvents: {},
};

// ============================================
// BOT READY EVENT - INSTANT RESPONSE
// ============================================
client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  client.user.setActivity('Exo Dashboard', { type: 'PLAYING' });
  console.log('✅ Bot is ready!');

  // Load everything in background (DETACHED - NOT AWAITED)
  loadBotDataInBackground();
});

// ============================================
// BACKGROUND INITIALIZATION (NON-BLOCKING)
// ============================================
async function loadBotDataInBackground() {
  try {
    console.log('📡 Starting background initialization...');

    // Load all guilds
    for (const guild of client.guilds.cache.values()) {
      try {
        // Register commands (fire and forget)
        registerCommandsForGuild(guild).catch(err => 
          console.error(`❌ Command registration error for ${guild.name}:`, err.message)
        );
      } catch (error) {
        console.error(`❌ Error processing guild ${guild.name}:`, error.message);
      }
    }

    // Setup event listeners
    setupEventListeners(client);

    // Subscribe to real-time updates
    subscribeToModuleChanges();
    subscribeToChannelTopicChanges();
    subscribeToCustomCommandChanges();
    subscribeToWorkflowChanges();

    // Start scheduled tasks
    startScheduledTasks();

    console.log('✅ Background initialization complete');
  } catch (error) {
    console.error('❌ Background initialization error:', error);
  }
}

// ============================================
// GUILD CREATE EVENT
// ============================================
client.on('guildCreate', async (guild) => {
  console.log(`📍 Joined guild: ${guild.name}`);
  
  // Register commands in background (fire and forget)
  registerCommandsForGuild(guild).catch(err => 
    console.error(`❌ Command registration error for ${guild.name}:`, err.message)
  );
});

// ============================================
// INTERACTION CREATE EVENT - INSTANT RESPONSE
// ============================================
client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    await handleCommand(interaction);
  }
});

// ============================================
// SETUP EVENT LISTENERS
// ============================================
setupEventListeners(client);

// ============================================
// REAL-TIME SUBSCRIPTIONS (NON-BLOCKING)
// ============================================
function subscribeToModuleChanges() {
  try {
    supabase
      .channel('modules-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guild_features' },
        (payload) => {
          console.log('📡 Module change detected:', payload.new.guild_id);
          const guild = client.guilds.cache.get(payload.new.guild_id);
          if (guild) {
            // Fire and forget
            registerCommandsForGuild(guild).catch(err => 
              console.error('Command registration error:', err.message)
            );
          }
        }
      )
      .subscribe();
  } catch (error) {
    console.error('❌ Module subscription error:', error);
  }
}

function subscribeToChannelTopicChanges() {
  try {
    supabase
      .channel('channel-topics-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_topics' },
        (payload) => {
          console.log('📡 Channel topic change detected:', payload.new.channel_id);
          global.botCache.channelTopics[payload.new.channel_id] = payload.new.topic;
        }
      )
      .subscribe();
  } catch (error) {
    console.error('❌ Channel topic subscription error:', error);
  }
}

function subscribeToCustomCommandChanges() {
  try {
    supabase
      .channel('custom-commands-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'custom_commands' },
        (payload) => {
          console.log('📡 Custom command change detected:', payload.new.name);
          const guild = client.guilds.cache.get(payload.new.guild_id);
          if (guild) {
            registerCommandsForGuild(guild).catch(err => 
              console.error('Command registration error:', err.message)
            );
          }
        }
      )
      .subscribe();
  } catch (error) {
    console.error('❌ Custom command subscription error:', error);
  }
}

function subscribeToWorkflowChanges() {
  try {
    supabase
      .channel('workflows-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workflows' },
        (payload) => {
          console.log('📡 Workflow change detected:', payload.new.id);
          const guild = client.guilds.cache.get(payload.new.guild_id);
          if (guild) {
            registerCommandsForGuild(guild).catch(err => 
              console.error('Command registration error:', err.message)
            );
          }
        }
      )
      .subscribe();
  } catch (error) {
    console.error('❌ Workflow subscription error:', error);
  }
}

// ============================================
// SCHEDULED TASKS (NON-BLOCKING)
// ============================================
function startScheduledTasks() {
  try {
    // Birthday reminder - runs daily at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('🎂 Checking for birthdays...');
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: birthdays } = await supabase
          .from('birthdays')
          .select('*')
          .like('birthday', `%${today.slice(5)}`);

        if (birthdays && birthdays.length > 0) {
          for (const birthday of birthdays) {
            try {
              const guild = client.guilds.cache.get(birthday.guild_id);
              if (guild) {
                const user = await client.users.fetch(birthday.user_id);
                const channel = guild.channels.cache.find(ch => ch.name === 'announcements');
                if (channel) {
                  await channel.send(`🎂 Happy Birthday ${user.username}! 🎉`);
                }
              }
            } catch (error) {
              console.error('❌ Birthday announcement error:', error.message);
            }
          }
        }
      } catch (error) {
        console.error('❌ Birthday check error:', error.message);
      }
    });

    // Cleanup old logs - runs daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Cleaning up old logs...');
      
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from('audit_log_entries')
          .delete()
          .lt('created_at', thirtyDaysAgo);
        
        console.log('✅ Old logs cleaned up');
      } catch (error) {
        console.error('❌ Log cleanup error:', error.message);
      }
    });

    console.log('✅ Scheduled tasks started');
  } catch (error) {
    console.error('❌ Scheduled tasks error:', error);
  }
}

// ============================================
// ERROR HANDLING
// ============================================
client.on('error', error => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('❌ Uncaught exception:', error);
});

// ============================================
// LOGIN - FIRST AND ONLY BLOCKING OPERATION
// ============================================
client.login(process.env.DISCORD_TOKEN);
    
