const { supabase } = require('./utils/supabase');
const { checkIfOnTopic } = require('./utils/openai');
const { handleCommand } = require('./commands');

const PROFANITY_LIST = ['badword1', 'badword2', 'badword3', 'spam', 'abuse'];

function setupEventListeners(client) {
  // ============================================
  // INTERACTION CREATE (Slash Commands, Buttons, etc)
  // ============================================
  client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
      await handleCommand(interaction);
    }

    // Handle buttons
    if (interaction.isButton()) {
      try {
        const buttonId = interaction.customId;

        if (buttonId === 'verify-button') {
          const { data: verifySettings } = await supabase
            .from('verification_settings')
            .select('verified_role_id')
            .eq('guild_id', interaction.guildId)
            .single();

          if (verifySettings) {
            const role = interaction.guild.roles.cache.get(verifySettings.verified_role_id);
            if (role) {
              await interaction.member.roles.add(role);
              await interaction.reply({ content: '✅ You have been verified!', ephemeral: true });
            }
          }
        }

        if (buttonId === 'create-ticket') {
          const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: 0,
            permissionOverwrites: [
              {
                id: interaction.guildId,
                deny: ['ViewChannel'],
              },
              {
                id: interaction.user.id,
                allow: ['ViewChannel', 'SendMessages'],
              },
            ],
          });

          await interaction.reply({ content: `✅ Ticket created: ${ticketChannel}`, ephemeral: true });

          supabase.from('tickets').insert({
            guild_id: interaction.guildId,
            user_id: interaction.user.id,
            channel_id: ticketChannel.id,
            created_at: new Date(),
          }).catch(err => console.error('❌ Ticket error:', err));
        }
      } catch (error) {
        console.error('❌ Error handling button:', error);
      }
    }

    // Handle select menus
    if (interaction.isStringSelectMenu()) {
      try {
        const selectId = interaction.customId;

        if (selectId === 'game-select') {
          const game = interaction.values[0];
          await interaction.reply(`🎮 Starting ${game}...`);
        }
      } catch (error) {
        console.error('❌ Error handling select menu:', error);
      }
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      try {
        const modalId = interaction.customId;

        if (modalId === 'application-form') {
          const answers = interaction.fields.getTextInputValue('answers');

          await interaction.reply('✅ Application submitted!');

          supabase.from('applications').insert({
            guild_id: interaction.guildId,
            user_id: interaction.user.id,
            answers,
            created_at: new Date(),
          }).catch(err => console.error('❌ Application error:', err));
        }
      } catch (error) {
        console.error('❌ Error handling modal:', error);
      }
    }
  });

  // ============================================
  // MESSAGE CREATE (Inspect, Auto-Mod, Currency, Logging)
  // ============================================
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    try {
      const guildModules = global.botCache.modules[message.guildId] || {};

      // HELIX: Inspect module - off-topic detection (NON-BLOCKING)
      if (guildModules.helix) {
        const topic = global.botCache.channelTopics[message.channelId];
        if (topic) {
          checkIfOnTopic(message.content, topic)
            .then(async (isOnTopic) => {
              if (!isOnTopic) {
                const warningKey = `${message.authorId}-${message.channelId}`;
                global.botCache.warnings[warningKey] = (global.botCache.warnings[warningKey] || 0) + 1;

                supabase.from('warnings').insert({
                  user_id: message.authorId,
                  channel_id: message.channelId,
                  message_content: message.content,
                  warning_type: 'off-topic',
                  created_at: new Date(),
                }).catch(err => console.error('❌ Warning error:', err));

                const warningCount = global.botCache.warnings[warningKey];
                await message.reply(`⚠️ Off-topic message! (Warning ${warningCount}/3)`);

                if (warningCount >= 3) {
                  await message.member.timeout(60000, 'Off-topic warnings exceeded');
                }
              }
            })
            .catch(err => console.error('❌ Inspect error:', err));
        }
      }

      // MODERATION: Auto-Mod (FAST - no await)
      if (guildModules.moderation) {
        // Spam detection
        const spamKey = `${message.authorId}-${message.guildId}`;
        const now = Date.now();
        if (!global.botCache.spamTracking[spamKey]) {
          global.botCache.spamTracking[spamKey] = [];
        }

        global.botCache.spamTracking[spamKey].push(now);
        global.botCache.spamTracking[spamKey] = global.botCache.spamTracking[spamKey].filter(
          t => now - t < 60000
        );

        if (global.botCache.spamTracking[spamKey].length > 5) {
          await message.delete();
          await message.author.send('⚠️ You are sending messages too fast!');
          return;
        }

        // Profanity filter
        const hasProfanity = PROFANITY_LIST.some(word => message.content.toLowerCase().includes(word));
        if (hasProfanity) {
          await message.delete();
          await message.reply('⚠️ Your message contains inappropriate language!');

          supabase.from('warnings').insert({
            user_id: message.authorId,
            guild_id: message.guildId,
            warning_type: 'profanity',
            created_at: new Date(),
          }).catch(err => console.error('❌ Profanity error:', err));
          return;
        }

        // Caps lock abuse
        const capsCount = (message.content.match(/[A-Z]/g) || []).length;
        const capsPercentage = (capsCount / message.content.length) * 100;
        if (capsPercentage > 70 && message.content.length > 10) {
          await message.delete();
          await message.reply('⚠️ Please avoid excessive caps lock!');
          return;
        }

        // Mention spam
        if (message.mentions.size > 5) {
          await message.delete();
          await message.reply('⚠️ Please avoid mention spam!');
          return;
        }
      }

      // ECONOMY: Award currency (NON-BLOCKING)
      if (guildModules.economy) {
        const currencyKey = `${message.authorId}-currency-cooldown`;
        const lastAward = global.botCache.userCurrency[currencyKey] || 0;

        if (Date.now() - lastAward > 60000) {
          supabase.from('user_currency').upsert({
            user_id: message.authorId,
            guild_id: message.guildId,
            balance: (global.botCache.userCurrency[message.authorId] || 0) + 1,
          }).catch(err => console.error('❌ Currency error:', err));

          global.botCache.userCurrency[currencyKey] = Date.now();
        }
      }

      // SECURITY: Log messages (NON-BLOCKING)
      if (guildModules.security) {
        supabase.from('audit_log_entries').insert({
          guild_id: message.guildId,
          user_id: message.authorId,
          action_type: 'message_create',
          target_id: message.id,
          details: {
            content: message.content,
            channel_id: message.channelId,
          },
          created_at: new Date(),
        }).catch(err => console.error('❌ Audit error:', err));
      }
    } catch (error) {
      console.error('❌ Error in messageCreate:', error);
    }
  });

  // ============================================
  // MESSAGE DELETE (Logging)
  // ============================================
  client.on('messageDelete', async (message) => {
    if (message.author?.bot) return;

    try {
      const guildModules = global.botCache.modules[message.guildId] || {};

      if (guildModules.security) {
        supabase.from('audit_log_entries').insert({
          guild_id: message.guildId,
          user_id: message.author?.id,
          action_type: 'message_delete',
          target_id: message.id,
          details: {
            content: message.content,
            channel_id: message.channelId,
            author: message.author?.username,
          },
          created_at: new Date(),
        }).catch(err => console.error('❌ Delete audit error:', err));
      }
    } catch (error) {
      console.error('❌ Error in messageDelete:', error);
    }
  });

  // ============================================
  // MESSAGE UPDATE (Logging)
  // ============================================
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (newMessage.author?.bot) return;

    try {
      const guildModules = global.botCache.modules[newMessage.guildId] || {};

      if (guildModules.security) {
        supabase.from('audit_log_entries').insert({
          guild_id: newMessage.guildId,
          user_id: newMessage.author?.id,
          action_type: 'message_update',
          target_id: newMessage.id,
          details: {
            old_content: oldMessage.content,
            new_content: newMessage.content,
            channel_id: newMessage.channelId,
          },
          created_at: new Date(),
        }).catch(err => console.error('❌ Update audit error:', err));
      }
    } catch (error) {
      console.error('❌ Error in messageUpdate:', error);
    }
  });

  // ============================================
  // MESSAGE REACTION ADD (Starboard, Polls, Verification)
  // ============================================
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;

    try {
      const guildModules = global.botCache.modules[reaction.message.guildId] || {};

      // PLUGIN: Starboard
      if (guildModules.plugin) {
        const { data: starboard } = await supabase
          .from('starboard_settings')
          .select('*')
          .eq('guild_id', reaction.message.guildId)
          .single();

        if (starboard && reaction.emoji.name === '⭐') {
          if (reaction.count >= starboard.threshold) {
            const starboardChannel = reaction.message.guild.channels.cache.get(starboard.channel_id);
            if (starboardChannel) {
              starboardChannel.send(
                `⭐ **${reaction.message.author.username}**: ${reaction.message.content}\n[Jump to message](${reaction.message.url})`
              ).catch(err => console.error('❌ Starboard send error:', err));
            }
          }
        }
      }

      // PLUGIN: Polls
      if (guildModules.plugin) {
        const { data: poll } = await supabase
          .from('polls')
          .select('*')
          .eq('message_id', reaction.message.id)
          .single();

        if (poll) {
          const option = reaction.emoji.name === '1️⃣' ? 'option1' : reaction.emoji.name === '2️⃣' ? 'option2' : null;
          if (option) {
            supabase.from('poll_votes').insert({
              poll_id: poll.id,
              user_id: user.id,
              option,
            }).catch(err => console.error('❌ Poll vote error:', err));
          }
        }
      }

      // SECURITY: Verification
      if (guildModules.security && reaction.emoji.name === '✅') {
        const { data: verifySettings } = await supabase
          .from('verification_settings')
          .select('verified_role_id')
          .eq('guild_id', reaction.message.guildId)
          .single();

        if (verifySettings) {
          const member = await reaction.message.guild.members.fetch(user.id);
          const role = reaction.message.guild.roles.cache.get(verifySettings.verified_role_id);
          if (role) {
            await member.roles.add(role);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in messageReactionAdd:', error);
    }
  });

  // ============================================
  // MESSAGE REACTION REMOVE (Starboard, Polls)
  // ============================================
  client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;

    try {
      const guildModules = global.botCache.modules[reaction.message.guildId] || {};

      if (guildModules.plugin) {
        const { data: poll } = await supabase
          .from('polls')
          .select('*')
          .eq('message_id', reaction.message.id)
          .single();

        if (poll) {
          const option = reaction.emoji.name === '1️⃣' ? 'option1' : reaction.emoji.name === '2️⃣' ? 'option2' : null;
          if (option) {
            supabase.from('poll_votes').delete().eq('poll_id', poll.id).eq('user_id', user.id).eq('option', option)
              .catch(err => console.error('❌ Poll vote remove error:', err));
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in messageReactionRemove:', error);
    }
  });

  // ============================================
  // GUILD MEMBER ADD (Verification, Logging, Auto-role)
  // ============================================
  client.on('guildMemberAdd', async (member) => {
    try {
      const guildModules = global.botCache.modules[member.guild.id] || {};

      // SECURITY: Verification
      if (guildModules.security) {
        const { data: verifySettings } = await supabase
          .from('verification_settings')
          .select('*')
          .eq('guild_id', member.guild.id)
          .single();

        if (verifySettings) {
          const verifyChannel = member.guild.channels.cache.get(verifySettings.channel_id);
          if (verifyChannel) {
            verifyChannel.send(
              `👋 Welcome ${member.user.username}! React with ✅ to verify and access the server.`
            ).catch(err => console.error('❌ Verify message error:', err));
          }
        }
      }

      // SECURITY: Logging
      if (guildModules.security) {
        supabase.from('audit_log_entries').insert({
          guild_id: member.guild.id,
          user_id: member.id,
          action_type: 'member_join',
          target_id: member.id,
          details: {
            username: member.user.username,
            account_created: member.user.createdAt,
          },
          created_at: new Date(),
        }).catch(err => console.error('❌ Member join audit error:', err));
      }

      // UTILITY: Auto-assign roles
      if (guildModules.utility) {
        const { data: autoRoles } = await supabase
          .from('auto_roles')
          .select('role_id')
          .eq('guild_id', member.guild.id);

        if (autoRoles) {
          for (const autoRole of autoRoles) {
            const role = member.guild.roles.cache.get(autoRole.role_id);
            if (role) {
              await member.roles.add(role);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in guildMemberAdd:', error);
    }
  });

  // ============================================
  // GUILD MEMBER REMOVE (Logging)
  // ============================================
  client.on('guildMemberRemove', async (member) => {
    try {
      const guildModules = global.botCache.modules[member.guild.id] || {};

      if (guildModules.security) {
        supabase.from('audit_log_entries').insert({
          guild_id: member.guild.id,
          user_id: member.id,
          action_type: 'member_leave',
          target_id: member.id,
          details: {
            username: member.user.username,
          },
          created_at: new Date(),
        }).catch(err => console.error('❌ Member leave audit error:', err));
      }
    } catch (error) {
      console.error('❌ Error in guildMemberRemove:', error);
    }
  });

  // ============================================
  // GUILD MEMBER UPDATE (Logging role/nickname changes)
  // ============================================
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
      const guildModules = global.botCache.modules[newMember.guild.id] || {};

      if (guildModules.security) {
        const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

        if (addedRoles.size > 0 || removedRoles.size > 0) {
          supabase.from('audit_log_entries').insert({
            guild_id: newMember.guild.id,
            user_id: newMember.id,
            action_type: 'member_role_update',
            target_id: newMember.id,
            details: {
              added_roles: addedRoles.map(r => r.name),
              removed_roles: removedRoles.map(r => r.name),
            },
            created_at: new Date(),
          }).catch(err => console.error('❌ Role update audit error:', err));
        }

        if (oldMember.nickname !== newMember.nickname) {
          supabase.from('audit_log_entries').insert({
            guild_id: newMember.guild.id,
            user_id: newMember.id,
            action_type: 'member_nickname_update',
            target_id: newMember.id,
            details: {
              old_nickname: oldMember.nickname,
              new_nickname: newMember.nickname,
            },
            created_at: new Date(),
          }).catch(err => console.error('❌ Nickname update audit error:', err));
        }
      }
    } catch (error) {
      console.error('❌ Error in guildMemberUpdate:', error);
    }
  });

  // ============================================
  // VOICE STATE UPDATE (Logging voice activity)
  // ============================================
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      const guildModules = global.botCache.modules[newState.guild.id] || {};

      if (guildModules.security) {
        if (!oldState.channel && newState.channel) {
          supabase.from('audit_log_entries').insert({
            guild_id: newState.guild.id,
            user_id: newState.member.id,
            action_type: 'voice_join',
            target_id: newState.channelId,
            details: {
              channel_name: newState.channel.name,
            },
            created_at: new Date(),
          }).catch(err => console.error('❌ Voice join audit error:', err));
        } else if (oldState.channel && !newState.channel) {
          supabase.from('audit_log_entries').insert({
            guild_id: newState.guild.id,
            user_id: newState.member.id,
            action_type: 'voice_leave',
            target_id: oldState.channelId,
            details: {
              channel_name: oldState.channel.name,
            },
            created_at: new Date(),
          }).catch(err => console.error('❌ Voice leave audit error:', err));
        }
      }
    } catch (error) {
      console.error('❌ Error in voiceStateUpdate:', error);
    }
  });

  // ============================================
  // CHANNEL CREATE (Logging)
  // ============================================
  client.on('channelCreate', async (channel) => {
    try {
      const guildModules = global.botCache.modules[channel.guild.id] || {};

      if (guildModules.security) {
        supabase.from('audit_log_entries').insert({
          guild_id: channel.guild.id,
          action_type: 'channel_create',
          target_id: channel.id,
          details: {
            channel_name: channel.name,
            channel_type: channel.type,
          },
          created_at: new Date(),
        }).catch(err => console.error('❌ Channel create audit error:', err));
      }
    } catch (error) {
      console.error('❌ Error in channelCreate:', error);
    }
  });

  // ============================================
  // CHANNEL DELETE (Logging)
  // ============================================
  client.on('channelDelete', async (channel) => {
    try {
      const guildModules = global.botCache.modules[channel.guild.id] || {};

      if (guildModules.security) {
        supabase.from('audit_log_entries').insert({
          guild_id: channel.guild.id,
          action_type: 'channel_delete',
          target_id: channel.id,
          details: {
            channel_name: channel.name,
            channel_type: channel.type,
          },
          created_at: new Date(),
        }).catch(err => console.error('❌ Channel delete audit error:', err));
      }
    } catch (error) {
      console.error('❌ Error in channelDelete:', error);
    }
  });

  // ============================================
  // ROLE CREATE (Logging)
  // ============================================
  client.on('roleCreate', async (role) => {
    try {
      const guildModules = global.botCache.modules[role.guild.id] || {};

      if (guildModules.security) {
        supabase.from('audit_log_entries').insert({
          guild_id: role.guild.id,
          action_type: 'role_create',
          target_id: role.id,
          details: {
            role_name: role.name,
            role_color: role.color,
          },
          created_at: new Date(),
        }).catch(err => console.error('❌ Role create audit error:', err));
      }
    } catch (error) {
      console.error('❌ Error in roleCreate:', error);
    }
  });

  // ============================================
  // ROLE DELETE (Logging)
  // ============================================
  client.on('roleDelete', async (role) => {
    try {
      const guildModules = global.botCache.modules[role.guild.id] || {};

      if (guildModules.security) {
        supabase.from('audit_log_entries').insert({
          guild_id: role.guild.id,
          action_type: 'role_delete',
          target_id: role.id,
          details: {
            role_name: role.name,
          },
          created_at: new Date(),
        }).catch(err => console.error('❌ Role delete audit error:', err));
      }
    } catch (error) {
      console.error('❌ Error in roleDelete:', error);
    }
  });

  // ============================================
  // GUILD BAN ADD (Logging)
  // ============================================
  client.on('guildBanAdd', async (ban) => {
    try {
      const guildModules = global.botCache.modules[ban.guild.id] || {};

      if (guildModules.security) {
        supabase.from('audit_log_entries').insert({
          guild_id: ban.guild.id,
          user_id: ban.user.id,
          action_type: 'member_ban',
          target_id: ban.user.id,
          details: {
            username: ban.user.username,
            reason: ban.reason,
          },
          created_at: new Date(),
        }).catch(err => console.error('❌ Ban audit error:', err));
      }
    } catch (error) {
      console.error('❌ Error in guildBanAdd:', error);
    }
  });

  // ============================================
  // GUILD BAN REMOVE (Logging)
  // ============================================
  client.on('guildBanRemove', async (ban) => {
    try {
      const guildModules = global.botCache.modules[ban.guild.id] || {};

      if (guildModules.security) {
        supabase.from('audit_log_entries').insert({
          guild_id: ban.guild.id,
          user_id: ban.user.id,
          action_type: 'member_unban',
          target_id: ban.user.id,
          details: {
            username: ban.user.username,
          },
          created_at: new Date(),
        }).catch(err => console.error('❌ Unban audit error:', err));
      }
    } catch (error) {
      console.error('❌ Error in guildBanRemove:', error);
    }
  });
}

// Register events for specific module
function registerEventsForModule(moduleName, enabled, guildId) {
  if (!global.botCache.enabledEvents[guildId]) {
    global.botCache.enabledEvents[guildId] = {};
  }
  global.botCache.enabledEvents[guildId][moduleName] = enabled;
  console.log(`📡 ${enabled ? '✅' : '❌'} ${moduleName} events for guild ${guildId}`);
}

module.exports = { setupEventListeners, registerEventsForModule };

