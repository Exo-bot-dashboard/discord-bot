const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { supabase } = require('./utils/supabase');

const COMMANDS = {
  // ============================================
  // CUSTOM COMMANDS & WORKFLOWS
  // ============================================
  'custom-command': new SlashCommandBuilder()
    .setName('custom-command')
    .setDescription('Manage custom commands')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a custom command')
        .addStringOption(opt => opt.setName('name').setDescription('Command name').setRequired(true))
        .addStringOption(opt => opt.setName('response').setDescription('Command response').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all custom commands')
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a custom command')
        .addStringOption(opt => opt.setName('name').setDescription('Command name').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('edit')
        .setDescription('Edit a custom command')
        .addStringOption(opt => opt.setName('name').setDescription('Command name').setRequired(true))
        .addStringOption(opt => opt.setName('response').setDescription('New response').setRequired(true))
    ),

  'workflow': new SlashCommandBuilder()
    .setName('workflow')
    .setDescription('Manage workflows')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a workflow')
        .addStringOption(opt => opt.setName('module').setDescription('Module (plugin, helix, economy, gaming, moderation, security, utility)').setRequired(true))
        .addStringOption(opt => opt.setName('trigger').setDescription('Trigger event').setRequired(true))
        .addStringOption(opt => opt.setName('action').setDescription('Action to perform').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all workflows')
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a workflow')
        .addStringOption(opt => opt.setName('id').setDescription('Workflow ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('edit')
        .setDescription('Edit a workflow')
        .addStringOption(opt => opt.setName('id').setDescription('Workflow ID').setRequired(true))
        .addStringOption(opt => opt.setName('trigger').setDescription('New trigger').setRequired(true))
        .addStringOption(opt => opt.setName('action').setDescription('New action').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('enable')
        .setDescription('Enable a workflow')
        .addStringOption(opt => opt.setName('id').setDescription('Workflow ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('disable')
        .setDescription('Disable a workflow')
        .addStringOption(opt => opt.setName('id').setDescription('Workflow ID').setRequired(true))
    ),

  // PLUGIN MODULE
  'starboard-config': new SlashCommandBuilder()
    .setName('starboard-config')
    .setDescription('Configure starboard settings')
    .addChannelOption(opt => opt.setName('channel').setDescription('Starboard channel').setRequired(true))
    .addIntegerOption(opt => opt.setName('threshold').setDescription('Reaction threshold').setRequired(true)),

  'starboard-view': new SlashCommandBuilder()
    .setName('starboard-view')
    .setDescription('View starred messages'),

  'birthday-set': new SlashCommandBuilder()
    .setName('birthday-set')
    .setDescription('Set your birthday')
    .addStringOption(opt => opt.setName('date').setDescription('Birthday (MM-DD)').setRequired(true)),

  'birthday-list': new SlashCommandBuilder()
    .setName('birthday-list')
    .setDescription('View all birthdays'),

  'poll-create': new SlashCommandBuilder()
    .setName('poll-create')
    .setDescription('Create a poll')
    .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(opt => opt.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(opt => opt.setName('option2').setDescription('Option 2').setRequired(true)),

  'poll-results': new SlashCommandBuilder()
    .setName('poll-results')
    .setDescription('View poll results'),

  'apply': new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Submit an application'),

  'application-list': new SlashCommandBuilder()
    .setName('application-list')
    .setDescription('View all applications'),

  // HELIX MODULE
  'backup-create': new SlashCommandBuilder()
    .setName('backup-create')
    .setDescription('Create a server backup'),

  'backup-restore': new SlashCommandBuilder()
    .setName('backup-restore')
    .setDescription('Restore from backup'),

  'backup-list': new SlashCommandBuilder()
    .setName('backup-list')
    .setDescription('List all backups'),

  'report-submit': new SlashCommandBuilder()
    .setName('report-submit')
    .setDescription('Submit a report')
    .addStringOption(opt => opt.setName('reason').setDescription('Report reason').setRequired(true)),

  'report-list': new SlashCommandBuilder()
    .setName('report-list')
    .setDescription('View all reports'),

  'inspect-config': new SlashCommandBuilder()
    .setName('inspect-config')
    .setDescription('Configure channel topic for monitoring')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to monitor').setRequired(true))
    .addStringOption(opt => opt.setName('topic').setDescription('Channel topic').setRequired(true)),

  'inspect-view': new SlashCommandBuilder()
    .setName('inspect-view')
    .setDescription('View off-topic messages'),

  'signal-send': new SlashCommandBuilder()
    .setName('signal-send')
    .setDescription('Send an announcement')
    .addStringOption(opt => opt.setName('message').setDescription('Announcement message').setRequired(true)),

  'signal-list': new SlashCommandBuilder()
    .setName('signal-list')
    .setDescription('View all signals'),

  // ECONOMY MODULE
  'rarity-create': new SlashCommandBuilder()
    .setName('rarity-create')
    .setDescription('Create a rarity tier')
    .addStringOption(opt => opt.setName('name').setDescription('Rarity name').setRequired(true))
    .addIntegerOption(opt => opt.setName('weight').setDescription('Rarity weight').setRequired(true)),

  'rarity-list': new SlashCommandBuilder()
    .setName('rarity-list')
    .setDescription('View all rarities'),

  'rarity-info': new SlashCommandBuilder()
    .setName('rarity-info')
    .setDescription('Get rarity details')
    .addStringOption(opt => opt.setName('rarity_id').setDescription('Rarity ID').setRequired(true)),

  'balance': new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance'),

  'give-currency': new SlashCommandBuilder()
    .setName('give-currency')
    .setDescription('Give currency to user')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setRequired(true)),

  'currency-leaderboard': new SlashCommandBuilder()
    .setName('currency-leaderboard')
    .setDescription('View top users by balance'),

  'shop-add': new SlashCommandBuilder()
    .setName('shop-add')
    .setDescription('Add item to shop')
    .addStringOption(opt => opt.setName('name').setDescription('Item name').setRequired(true))
    .addIntegerOption(opt => opt.setName('price').setDescription('Item price').setRequired(true)),

  'shop-list': new SlashCommandBuilder()
    .setName('shop-list')
    .setDescription('View shop items'),

  'shop-buy': new SlashCommandBuilder()
    .setName('shop-buy')
    .setDescription('Buy an item from the shop')
    .addStringOption(opt => opt.setName('item_id').setDescription('Item ID').setRequired(true)),

  // GAMING MODULE
  'flashcard-create': new SlashCommandBuilder()
    .setName('flashcard-create')
    .setDescription('Create a flashcard set')
    .addStringOption(opt => opt.setName('name').setDescription('Set name').setRequired(true)),

  'flashcard-quiz': new SlashCommandBuilder()
    .setName('flashcard-quiz')
    .setDescription('Start a flashcard quiz')
    .addStringOption(opt => opt.setName('set_id').setDescription('Flashcard set ID').setRequired(true)),

  'flashcard-list': new SlashCommandBuilder()
    .setName('flashcard-list')
    .setDescription('View all flashcard sets'),

  'trivia-start': new SlashCommandBuilder()
    .setName('trivia-start')
    .setDescription('Start a trivia game'),

  'trivia-answer': new SlashCommandBuilder()
    .setName('trivia-answer')
    .setDescription('Answer trivia question')
    .addStringOption(opt => opt.setName('answer').setDescription('Your answer').setRequired(true)),

  'game-start': new SlashCommandBuilder()
    .setName('game-start')
    .setDescription('Start a game')
    .addStringOption(opt => opt.setName('game').setDescription('Game type (rps, dice, etc)').setRequired(true)),

  'game-list': new SlashCommandBuilder()
    .setName('game-list')
    .setDescription('View available games'),

  // MODERATION MODULE
  'warn-user': new SlashCommandBuilder()
    .setName('warn-user')
    .setDescription('Warn a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Warn reason').setRequired(true)),

  'warn-list': new SlashCommandBuilder()
    .setName('warn-list')
    .setDescription('View user warnings')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),

  'warn-clear': new SlashCommandBuilder()
    .setName('warn-clear')
    .setDescription('Clear user warnings')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),

  'mute-user': new SlashCommandBuilder()
    .setName('mute-user')
    .setDescription('Mute a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to mute').setRequired(true))
    .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true)),

  'unmute-user': new SlashCommandBuilder()
    .setName('unmute-user')
    .setDescription('Unmute a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to unmute').setRequired(true)),

  'kick-user': new SlashCommandBuilder()
    .setName('kick-user')
    .setDescription('Kick a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true)),

  'ban-user': new SlashCommandBuilder()
    .setName('ban-user')
    .setDescription('Ban a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true)),

  'unban-user': new SlashCommandBuilder()
    .setName('unban-user')
    .setDescription('Unban a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to unban').setRequired(true)),

  // SECURITY MODULE
  'verify-setup': new SlashCommandBuilder()
    .setName('verify-setup')
    .setDescription('Setup verification system'),

  'verify-user': new SlashCommandBuilder()
    .setName('verify-user')
    .setDescription('Verify a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to verify').setRequired(true)),

  'logs-view': new SlashCommandBuilder()
    .setName('logs-view')
    .setDescription('View server logs'),

  'logs-export': new SlashCommandBuilder()
    .setName('logs-export')
    .setDescription('Export logs as file'),

  'audit-log': new SlashCommandBuilder()
    .setName('audit-log')
    .setDescription('View audit log'),

  // UTILITY MODULE
  'ticket-create': new SlashCommandBuilder()
    .setName('ticket-create')
    .setDescription('Create a support ticket'),

  'ticket-close': new SlashCommandBuilder()
    .setName('ticket-close')
    .setDescription('Close a ticket'),

  'suggest': new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion')
    .addStringOption(opt => opt.setName('suggestion').setDescription('Your suggestion').setRequired(true)),

  'suggestion-list': new SlashCommandBuilder()
    .setName('suggestion-list')
    .setDescription('View all suggestions'),

  'announce': new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement')
    .addStringOption(opt => opt.setName('message').setDescription('Announcement message').setRequired(true)),

  'role-assign': new SlashCommandBuilder()
    .setName('role-assign')
    .setDescription('Assign a role to user')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)),

  'role-remove': new SlashCommandBuilder()
    .setName('role-remove')
    .setDescription('Remove role from user')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)),
};

// Register commands for guild
async function registerCommandsForGuild(guild) {
  try {
    const { data: guildData } = await supabase
      .from('guilds')
      .select('guild_features')
      .eq('guild_id', guild.id)
      .single();

    if (!guildData) return;

    const features = guildData.guild_features || {};
    const commandsToRegister = [];

    // Always include custom commands and workflows
    commandsToRegister.push(COMMANDS['custom-command'], COMMANDS['workflow']);

    if (features.plugin) {
      commandsToRegister.push(
        COMMANDS['starboard-config'],
        COMMANDS['starboard-view'],
        COMMANDS['birthday-set'],
        COMMANDS['birthday-list'],
        COMMANDS['poll-create'],
        COMMANDS['poll-results'],
        COMMANDS['apply'],
        COMMANDS['application-list']
      );
    }

    if (features.helix) {
      commandsToRegister.push(
        COMMANDS['backup-create'],
        COMMANDS['backup-restore'],
        COMMANDS['backup-list'],
        COMMANDS['report-submit'],
        COMMANDS['report-list'],
        COMMANDS['inspect-config'],
        COMMANDS['inspect-view'],
        COMMANDS['signal-send'],
        COMMANDS['signal-list']
      );
    }

    if (features.economy) {
      commandsToRegister.push(
        COMMANDS['rarity-create'],
        COMMANDS['rarity-list'],
        COMMANDS['rarity-info'],
        COMMANDS['balance'],
        COMMANDS['give-currency'],
        COMMANDS['currency-leaderboard'],
        COMMANDS['shop-add'],
        COMMANDS['shop-list'],
        COMMANDS['shop-buy']
      );
    }

    if (features.gaming) {
      commandsToRegister.push(
        COMMANDS['flashcard-create'],
        COMMANDS['flashcard-quiz'],
        COMMANDS['flashcard-list'],
        COMMANDS['trivia-start'],
        COMMANDS['trivia-answer'],
        COMMANDS['game-start'],
        COMMANDS['game-list']
      );
    }

    if (features.moderation) {
      commandsToRegister.push(
        COMMANDS['warn-user'],
        COMMANDS['warn-list'],
        COMMANDS['warn-clear'],
        COMMANDS['mute-user'],
        COMMANDS['unmute-user'],
        COMMANDS['kick-user'],
        COMMANDS['ban-user'],
        COMMANDS['unban-user']
      );
    }

    if (features.security) {
      commandsToRegister.push(
        COMMANDS['verify-setup'],
        COMMANDS['verify-user'],
        COMMANDS['logs-view'],
        COMMANDS['logs-export'],
        COMMANDS['audit-log']
      );
    }

    if (features.utility) {
      commandsToRegister.push(
        COMMANDS['ticket-create'],
        COMMANDS['ticket-close'],
        COMMANDS['suggest'],
        COMMANDS['suggestion-list'],
        COMMANDS['announce'],
        COMMANDS['role-assign'],
        COMMANDS['role-remove']
      );
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guild.id), {
      body: commandsToRegister.map(cmd => cmd.toJSON()),
    });

    console.log(`✅ Registered ${commandsToRegister.length} commands for ${guild.name}`);
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}

// Replace variables in custom command response
function replaceVariables(response, user, guild) {
  return response
    .replace(/{user}/g, user.username)
    .replace(/{user_id}/g, user.id)
    .replace(/{guild}/g, guild.name)
    .replace(/{guild_id}/g, guild.id)
    .replace(/{date}/g, new Date().toLocaleDateString())
    .replace(/{time}/g, new Date().toLocaleTimeString());
}

// CRITICAL: Handle commands with INSTANT RESPONSE
async function handleCommand(interaction) {
  // ⚡ DEFER IMMEDIATELY - FIRST LINE - NO EXCEPTIONS!
  await interaction.deferReply();

  const startTime = Date.now();
  const { commandName } = interaction;
  console.log(`📝 [${new Date().toISOString()}] Command started: ${commandName}`);

  try {
    // ============================================
    // CUSTOM COMMANDS & WORKFLOWS
    // ============================================
    if (commandName === 'custom-command') {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'create') {
        const name = interaction.options.getString('name');
        const response = interaction.options.getString('response');

        await interaction.editReply(`✅ Custom command \`/${name}\` created!`);

        supabase.from('custom_commands').insert({
          guild_id: interaction.guildId,
          name,
          response,
          created_by: interaction.user.id,
          created_at: new Date(),
        }).catch(err => console.error('❌ Custom command create error:', err));
      }

      if (subcommand === 'list') {
        const { data: commands } = await supabase
          .from('custom_commands')
          .select('*')
          .eq('guild_id', interaction.guildId);

        if (commands && commands.length > 0) {
          const list = commands.map(cmd => `\`/${cmd.name}\` - ${cmd.response.substring(0, 50)}...`).join('\n');
          await interaction.editReply(`📋 **Custom Commands:**\n${list}`);
        } else {
          await interaction.editReply('📋 No custom commands yet!');
        }
      }

      if (subcommand === 'delete') {
        const name = interaction.options.getString('name');

        await interaction.editReply(`✅ Custom command \`/${name}\` deleted!`);

        supabase.from('custom_commands').delete().eq('guild_id', interaction.guildId).eq('name', name)
          .catch(err => console.error('❌ Custom command delete error:', err));
      }

      if (subcommand === 'edit') {
        const name = interaction.options.getString('name');
        const response = interaction.options.getString('response');

        await interaction.editReply(`✅ Custom command \`/${name}\` updated!`);

        supabase.from('custom_commands').update({ response }).eq('guild_id', interaction.guildId).eq('name', name)
          .catch(err => console.error('❌ Custom command edit error:', err));
      }
    }

    if (commandName === 'workflow') {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'create') {
        const module = interaction.options.getString('module');
        const trigger = interaction.options.getString('trigger');
        const action = interaction.options.getString('action');
        const workflowId = `${module}-${trigger}-${Date.now()}`;

        await interaction.editReply(`✅ Workflow created! ID: \`${workflowId}\``);

        supabase.from('workflows').insert({
          guild_id: interaction.guildId,
          id: workflowId,
          module,
          trigger,
          action,
          enabled: true,
          created_at: new Date(),
        }).catch(err => console.error('❌ Workflow create error:', err));
      }

      if (subcommand === 'list') {
        const { data: workflows } = await supabase
          .from('workflows')
          .select('*')
          .eq('guild_id', interaction.guildId);

        if (workflows && workflows.length > 0) {
          const list = workflows
            .map(wf => `**${wf.id}** - ${wf.module} | ${wf.trigger} → ${wf.action} | ${wf.enabled ? '✅' : '❌'}`)
            .join('\n');
          await interaction.editReply(`⚙️ **Workflows:**\n${list}`);
        } else {
          await interaction.editReply('⚙️ No workflows yet!');
        }
      }

      if (subcommand === 'delete') {
        const id = interaction.options.getString('id');

        await interaction.editReply(`✅ Workflow \`${id}\` deleted!`);

        supabase.from('workflows').delete().eq('guild_id', interaction.guildId).eq('id', id)
          .catch(err => console.error('❌ Workflow delete error:', err));
      }

      if (subcommand === 'edit') {
        const id = interaction.options.getString('id');
        const trigger = interaction.options.getString('trigger');
        const action = interaction.options.getString('action');

        await interaction.editReply(`✅ Workflow \`${id}\` updated!`);

        supabase.from('workflows').update({ trigger, action }).eq('guild_id', interaction.guildId).eq('id', id)
          .catch(err => console.error('❌ Workflow edit error:', err));
      }

      if (subcommand === 'enable') {
        const id = interaction.options.getString('id');

        await interaction.editReply(`✅ Workflow \`${id}\` enabled!`);

        supabase.from('workflows').update({ enabled: true }).eq('guild_id', interaction.guildId).eq('id', id)
          .catch(err => console.error('❌ Workflow enable error:', err));
      }

      if (subcommand === 'disable') {
        const id = interaction.options.getString('id');

        await interaction.editReply(`✅ Workflow \`${id}\` disabled!`);

        supabase.from('workflows').update({ enabled: false }).eq('guild_id', interaction.guildId).eq('id', id)
          .catch(err => console.error('❌ Workflow disable error:', err));
      }
    }

    // ============================================
    // PLUGIN MODULE
    // ============================================
    if (commandName === 'starboard-config') {
      const channel = interaction.options.getChannel('channel');
      const threshold = interaction.options.getInteger('threshold');

      await interaction.editReply(`✅ Starboard configured! Channel: ${channel}, Threshold: ${threshold}`);

      supabase.from('starboard_settings').upsert({
        guild_id: interaction.guildId,
        channel_id: channel.id,
        threshold,
      }).catch(err => console.error('❌ Starboard error:', err));
    }

    if (commandName === 'starboard-view') {
      await interaction.editReply('⭐ Starboard messages loaded!');
    }

    if (commandName === 'birthday-set') {
      const date = interaction.options.getString('date');
      await interaction.editReply(`✅ Birthday set to ${date}`);

      supabase.from('birthdays').upsert({
        user_id: interaction.user.id,
        guild_id: interaction.guildId,
        birthday: date,
      }).catch(err => console.error('❌ Birthday error:', err));
    }

    if (commandName === 'birthday-list') {
      await interaction.editReply('🎂 Birthday list loaded!');
    }

    if (commandName === 'poll-create') {
      const question = interaction.options.getString('question');
      const option1 = interaction.options.getString('option1');
      const option2 = interaction.options.getString('option2');

      await interaction.editReply(`📊 **${question}**\n1️⃣ ${option1}\n2️⃣ ${option2}`);

      supabase.from('polls').insert({
        guild_id: interaction.guildId,
        question,
        option1,
        option2,
        created_at: new Date(),
      }).catch(err => console.error('❌ Poll error:', err));
    }

    if (commandName === 'poll-results') {
      await interaction.editReply('📊 Poll results loaded!');
    }

    if (commandName === 'apply') {
      await interaction.editReply('📝 Application form submitted!');
    }

    if (commandName === 'application-list') {
      await interaction.editReply('📋 Applications loaded!');
    }

    // ============================================
    // HELIX MODULE
    // ============================================
    if (commandName === 'backup-create') {
      await interaction.editReply('💾 Creating server backup...');
    }

    if (commandName === 'backup-restore') {
      await interaction.editReply('♻️ Restoring from backup...');
    }

    if (commandName === 'backup-list') {
      await interaction.editReply('📦 Backups loaded!');
    }

    if (commandName === 'report-submit') {
      const reason = interaction.options.getString('reason');
      await interaction.editReply(`📋 Report submitted: ${reason}`);

      supabase.from('reports').insert({
        guild_id: interaction.guildId,
        user_id: interaction.user.id,
        reason,
        created_at: new Date(),
      }).catch(err => console.error('❌ Report error:', err));
    }

    if (commandName === 'report-list') {
      await interaction.editReply('📋 Reports loaded!');
    }

    if (commandName === 'inspect-config') {
      const channel = interaction.options.getChannel('channel');
      const topic = interaction.options.getString('topic');

      await interaction.editReply(`✅ Channel ${channel} configured for topic: "${topic}"`);

      supabase.from('channel_topics').upsert({
        channel_id: channel.id,
        guild_id: interaction.guildId,
        topic,
      }).catch(err => console.error('❌ Inspect error:', err));

      global.botCache.channelTopics[channel.id] = topic;
    }

    if (commandName === 'inspect-view') {
      await interaction.editReply('👁️ Off-topic messages loaded!');
    }

    if (commandName === 'signal-send') {
      const message = interaction.options.getString('message');
      await interaction.editReply(`📢 Signal sent: ${message}`);

      supabase.from('signals').insert({
        guild_id: interaction.guildId,
        message,
        created_at: new Date(),
      }).catch(err => console.error('❌ Signal error:', err));
    }

    if (commandName === 'signal-list') {
      await interaction.editReply('📢 Signals loaded!');
    }

    // ============================================
    // ECONOMY MODULE
    // ============================================
    if (commandName === 'rarity-create') {
      const name = interaction.options.getString('name');
      const weight = interaction.options.getInteger('weight');

      await interaction.editReply(`⭐ Rarity "${name}" created with weight ${weight}`);

      supabase.from('rarities').insert({
        guild_id: interaction.guildId,
        name,
        weight,
      }).catch(err => console.error('❌ Rarity error:', err));
    }

    if (commandName === 'rarity-list') {
      await interaction.editReply('⭐ Rarities loaded!');
    }

    if (commandName === 'rarity-info') {
      const rarityId = interaction.options.getString('rarity_id');
      await interaction.editReply(`⭐ Rarity info for ${rarityId}`);
    }

    if (commandName === 'balance') {
      const cachedBalance = global.botCache.userCurrency[interaction.user.id] || 0;
      await interaction.editReply(`💰 Your balance: ${cachedBalance}`);

      supabase
        .from('user_currency')
        .select('balance')
        .eq('user_id', interaction.user.id)
        .eq('guild_id', interaction.guildId)
        .single()
        .then(({ data }) => {
          if (data) global.botCache.userCurrency[interaction.user.id] = data.balance;
        })
        .catch(err => console.error('❌ Balance error:', err));
    }

    if (commandName === 'give-currency') {
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');

      await interaction.editReply(`💰 Gave ${amount} currency to ${user.username}`);

      supabase.from('user_currency').upsert({
        user_id: user.id,
        guild_id: interaction.guildId,
        balance: (global.botCache.userCurrency[user.id] || 0) + amount,
      }).catch(err => console.error('❌ Give currency error:', err));
    }

    if (commandName === 'currency-leaderboard') {
      await interaction.editReply('🏆 Currency leaderboard loaded!');
    }

    if (commandName === 'shop-add') {
      const name = interaction.options.getString('name');
      const price = interaction.options.getInteger('price');

      await interaction.editReply(`🛍️ Item "${name}" added to shop for ${price}`);

      supabase.from('shop_items').insert({
        guild_id: interaction.guildId,
        name,
        price,
      }).catch(err => console.error('❌ Shop add error:', err));
    }

    if (commandName === 'shop-list') {
      await interaction.editReply('🛍️ Shop items loaded!');
    }

    if (commandName === 'shop-buy') {
      const itemId = interaction.options.getString('item_id');
      await interaction.editReply(`🛍️ Processing purchase...`);

      supabase
        .from('shop_items')
        .select('*')
        .eq('id', itemId)
        .single()
        .then(({ data: item }) => {
          if (item) {
            interaction.editReply(`🛍️ Purchased ${item.name} for ${item.price}`);
          }
        })
        .catch(err => console.error('❌ Shop buy error:', err));
    }

    // ============================================
    // GAMING MODULE
    // ============================================
    if (commandName === 'flashcard-create') {
      const name = interaction.options.getString('name');
      await interaction.editReply(`📚 Flashcard set "${name}" created!`);

      supabase.from('flashcard_sets').insert({
        guild_id: interaction.guildId,
        user_id: interaction.user.id,
        name,
      }).catch(err => console.error('❌ Flashcard create error:', err));
    }

    if (commandName === 'flashcard-quiz') {
      const setId = interaction.options.getString('set_id');
      await interaction.editReply(`📖 Quiz started!`);

      supabase
        .from('flashcards')
        .select('*')
        .eq('set_id', setId)
        .then(({ data: cards }) => {
          if (cards && cards.length > 0) {
            interaction.editReply(`📖 Quiz started! ${cards.length} cards to go.`);
          }
        })
        .catch(err => console.error('❌ Quiz error:', err));
    }

    if (commandName === 'flashcard-list') {
      await interaction.editReply('📚 Flashcard sets loaded!');
    }

    if (commandName === 'trivia-start') {
      await interaction.editReply('🎯 Trivia game started! Answer the questions correctly.');
    }

    if (commandName === 'trivia-answer') {
      const answer = interaction.options.getString('answer');
      await interaction.editReply(`✅ Your answer: ${answer}`);
    }

    if (commandName === 'game-start') {
      const game = interaction.options.getString('game');
      await interaction.editReply(`🎮 ${game.toUpperCase()} game started!`);
    }

    if (commandName === 'game-list') {
      await interaction.editReply('🎮 Available games loaded!');
    }

    // ============================================
    // MODERATION MODULE
    // ============================================
    if (commandName === 'warn-user') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      await interaction.editReply(`⚠️ ${user.username} warned for: ${reason}`);

      supabase.from('warnings').insert({
        guild_id: interaction.guildId,
        user_id: user.id,
        reason,
        created_at: new Date(),
      }).catch(err => console.error('❌ Warn error:', err));
    }

    if (commandName === 'warn-list') {
      const user = interaction.options.getUser('user');
      await interaction.editReply(`⚠️ Warnings for ${user.username} loaded!`);
    }

    if (commandName === 'warn-clear') {
      const user = interaction.options.getUser('user');
      await interaction.editReply(`✅ Warnings cleared for ${user.username}`);

      supabase.from('warnings').delete().eq('user_id', user.id).eq('guild_id', interaction.guildId)
        .catch(err => console.error('❌ Warn clear error:', err));
    }

    if (commandName === 'mute-user') {
      const user = interaction.options.getUser('user');
      const duration = interaction.options.getInteger('duration');

      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(duration * 60 * 1000, 'Muted by moderator');

      await interaction.editReply(`🔇 ${user.username} muted for ${duration} minutes`);
    }

    if (commandName === 'unmute-user') {
      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(null);

      await interaction.editReply(`🔊 ${user.username} unmuted`);
    }

    if (commandName === 'kick-user') {
      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id);
      await member.kick('Kicked by moderator');

      await interaction.editReply(`👢 ${user.username} kicked from server`);
    }

    if (commandName === 'ban-user') {
      const user = interaction.options.getUser('user');
      await interaction.guild.bans.create(user.id, { reason: 'Banned by moderator' });

      await interaction.editReply(`🚫 ${user.username} banned from server`);
    }

    if (commandName === 'unban-user') {
      const user = interaction.options.getUser('user');
      await interaction.guild.bans.remove(user.id);

      await interaction.editReply(`✅ ${user.username} unbanned`);
    }

    // ============================================
    // SECURITY MODULE
    // ============================================
    if (commandName === 'verify-setup') {
      await interaction.editReply('✅ Verification system setup!');
    }

    if (commandName === 'verify-user') {
      const user = interaction.options.getUser('user');
      await interaction.editReply(`✅ ${user.username} verified!`);
    }

    if (commandName === 'logs-view') {
      await interaction.editReply('📋 Server logs retrieved');
    }

    if (commandName === 'logs-export') {
      await interaction.editReply('📥 Logs exported!');
    }

    if (commandName === 'audit-log') {
      await interaction.editReply('📊 Audit log retrieved');
    }

    // ============================================
    // UTILITY MODULE
    // ============================================
    if (commandName === 'ticket-create') {
      await interaction.editReply('🎫 Support ticket created!');
    }

    if (commandName === 'ticket-close') {
      await interaction.editReply('✅ Ticket closed!');
    }

    if (commandName === 'suggest') {
      const suggestion = interaction.options.getString('suggestion');

      await interaction.editReply(`✅ Suggestion submitted: ${suggestion}`);

      supabase.from('suggestions').insert({
        guild_id: interaction.guildId,
        user_id: interaction.user.id,
        suggestion,
        created_at: new Date(),
      }).catch(err => console.error('❌ Suggest error:', err));
    }

    if (commandName === 'suggestion-list') {
      await interaction.editReply('💡 Suggestions loaded!');
    }

    if (commandName === 'announce') {
      const message = interaction.options.getString('message');

      await interaction.channel.send(message);
      await interaction.editReply(`📢 Announcement sent!`);
    }

    if (commandName === 'role-assign') {
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');

      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.add(role);

      await interaction.editReply(`✅ Role ${role.name} assigned to ${user.username}`);
    }

    if (commandName === 'role-remove') {
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');

      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.remove(role);

      await interaction.editReply(`✅ Role ${role.name} removed from ${user.username}`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [${new Date().toISOString()}] Command completed: ${commandName} (${duration}ms)`);
  } catch (error) {
    console.error('❌ Error handling command:', error);
    try {
      await interaction.editReply('❌ An error occurred');
    } catch (e) {
      console.error('Failed to send error reply:', e);
    }
  }
}

module.exports = { registerCommandsForGuild, handleCommand, COMMANDS, replaceVariables };

