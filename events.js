const { checkIfOnTopic } = require('./utils/openai');
const { supabase } = require('./utils/supabase');
const { handleCommand } = require('./commands');

function setupEventListeners(client) {
  // Interaction create (slash commands)
  client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
      await handleCommand(interaction);
    }
  });

  // Message create (Inspect module - off-topic detection)
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    try {
      const topic = global.botCache.channelTopics[message.channelId];
      if (!topic) return; // Channel not monitored

      // Check if on-topic (non-blocking)
      checkIfOnTopic(message.content, topic).then(async (isOnTopic) => {
        if (!isOnTopic) {
          const warningKey = `${message.authorId}-${message.channelId}`;
          global.botCache.warnings[warningKey] = (global.botCache.warnings[warningKey] || 0) + 1;

          await supabase.from('warnings').insert({
            user_id: message.authorId,
            channel_id: message.channelId,
            message_content: message.content,
            created_at: new Date(),
          });

          const warningCount = global.botCache.warnings[warningKey];
          await message.reply(`⚠️ Off-topic message! (Warning ${warningCount}/3)`);

          if (warningCount >= 3) {
            await message.member.timeout(60000, 'Off-topic warnings exceeded');
            await message.reply(`🔇 You have been muted for 1 minute.`);
          }
        }
      });
    } catch (error) {
      console.error('❌ Error in messageCreate:', error);
    }
  });

  // Reaction add (Starboard)
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;

    try {
      const { data: starboard } = await supabase
        .from('starboard_settings')
        .select('*')
        .eq('guild_id', reaction.message.guildId)
        .single();

      if (!starboard) return;

      if (reaction.count >= starboard.threshold) {
        const starboardChannel = reaction.message.guild.channels.cache.get(starboard.channel_id);
        if (starboardChannel) {
          await starboardChannel.send(`⭐ **${reaction.message.author.username}**: ${reaction.message.content}`);
        }
      }
    } catch (error) {
      console.error('❌ Error in reactionAdd:', error);
    }
  });

  // Guild member add (Verification)
  client.on('guildMemberAdd', async (member) => {
    try {
      const { data: verifySettings } = await supabase
        .from('verification_settings')
        .select('*')
        .eq('guild_id', member.guild.id)
        .single();

      if (verifySettings) {
        const verifyChannel = member.guild.channels.cache.get(verifySettings.channel_id);
        if (verifyChannel) {
          await verifyChannel.send(`👋 Welcome ${member.user.username}! Please verify to access the server.`);
        }
      }
    } catch (error) {
      console.error('❌ Error in guildMemberAdd:', error);
    }
  });
}

module.exports = { setupEventListeners };
