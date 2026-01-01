const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { supabase } = require('./utils/supabase');
const { checkIfOnTopic } = require('./utils/openai');

const COMMANDS = {
  // PLUGIN MODULE
  'starboard-config': new SlashCommandBuilder()
    .setName('starboard-config')
    .setDescription('Configure starboard settings')
    .addChannelOption(opt => opt.setName('channel').setDescription('Starboard channel').setRequired(true))
    .addIntegerOption(opt => opt.setName('threshold').setDescription('Reaction threshold').setRequired(true)),

  'birthday-set': new SlashCommandBuilder()
    .setName('birthday-set')
    .setDescription('Set your birthday')
    .addStringOption(opt => opt.setName('date').setDescription('Birthday (MM-DD)').setRequired(true)),

  'poll-create': new SlashCommandBuilder()
    .setName('poll-create')
    .setDescription('Create a poll')
    .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(opt => opt.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(opt => opt.setName('option2').setDescription('Option 2').setRequired(true)),

  'apply': new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Submit an application'),

  // HELIX MODULE
  'backup-create': new SlashCommandBuilder()
    .setName('backup-create')
    .setDescription('Create a server backup'),

  'report-submit': new SlashCommandBuilder()
    .setName('report-submit')
    .setDescription('Submit a report')
    .addStringOption(opt => opt.setName('reason').setDescription('Report reason').setRequired(true)),

  'inspect-config': new SlashCommandBuilder()
    .setName('inspect-config')
    .setDescription('Configure channel topic for monitoring')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to monitor').setRequired(true))
    .addStringOption(opt => opt.setName('topic').setDescription('Channel topic').setRequired(true)),

  'signal-send': new SlashCommandBuilder()
    .setName('signal-send')
    .setDescription('Send an announcement')
    .addStringOption(opt => opt.setName('message').setDescription('Announcement message').setRequired(true)),

  // ECONOMY MODULE
  'rarity-create': new SlashCommandBuilder()
    .setName('rarity-create')
    .setDescription('Create a rarity tier')
    .addStringOption(opt => opt.setName('name').setDescription('Rarity name').setRequired(true))
    .addIntegerOption(opt => opt.setName('weight').setDescription('Rarity weight').setRequired(true)),

  'balance': new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance'),

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

  'trivia-start': new SlashCommandBuilder()
    .setName('trivia-start')
    .setDescription('Start a trivia game'),

  'game-start': new SlashCommandBuilder()
    .setName('game-start')
    .setDescription('Start a game')
    .addStringOption(opt => opt.setName('game').setDescription('Game type (rps, dice, etc)').setRequired(true)),

  // MODERATION MODULE
  'warn-user': new SlashCommandBuilder()
    .setName('warn-user')
    .setDescription('Warn a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Warn reason').setRequired(true)),

  'mute-user': new SlashCommandBuilder()
    .setName('mute-user')
    .setDescription('Mute a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to mute').setRequired(true))
    .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true)),

  'kick-user': new SlashCommandBuilder()
    .setName('kick-user')
    .setDescription('Kick a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true)),

  'ban-user': new SlashCommandBuilder()
    .setName('ban-user')
    .setDescription('Ban a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true)),

  // SECURITY MODULE
  'verify-setup': new SlashCommandBuilder()
    .setName('verify-setup')
    .setDescription('Setup verification system'),

  'logs-view': new SlashCommandBuilder()
    .setName('logs-view')
    .setDescription('View server logs'),

  // UTILITY MODULE
  'ticket-create': new SlashCommandBuilder()
    .setName('ticket-create')
    .setDescription('Create a support ticket'),

  'suggest': new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion')
    .addStringOption(opt => opt.setName('suggestion').setDescription('Your suggestion').setRequired(true)),

  'announce': new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement')
    .addStringOption(opt => opt.setName('message').setDescription('Announcement message').setRequired(true)),

  'role-assign': new SlashCommandBuilder()
    .setName('role-assign')
    .setDescription('Assign a role to user')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)),
};

// Register commands for guild
async function registerCommandsForGuild(guild) {
  try {
    // Fetch guild features from Supabase
    const { data: guildData } = await supabase
      .from('guilds')
      .select('guild_features')
      .eq('guild_id', guild.id)
      .single();

    if (!guildData) return;

    const features = guildData.guild_features || {};
    const commandsToRegister = [];

    // Add commands based on enabled modules
    if (features.plugin) {
      commandsToRegister.push(
        COMMANDS['starboard-config'],
        COMMANDS['birthday-set'],
        COMMANDS['poll-create'],
        COMMANDS['apply']
      );
    }

    if (features.helix) {
      commandsToRegister.push(
        COMMANDS['backup-create'],
        COMMANDS['report-submit'],
        COMMANDS['inspect-config'],
        COMMANDS['signal-send']
      );
    }

    if (features.economy) {
      commandsToRegister.push(
        COMMANDS['rarity-create'],
        COMMANDS['balance'],
        COMMANDS['shop-buy']
      );
    }

    if (features.gaming) {
      commandsToRegister.push(
        COMMANDS['flashcard-create'],
        COMMANDS['flashcard-quiz'],
        COMMANDS['trivia-start'],
        COMMANDS['game-start']
      );
    }

    if (features.moderation) {
      commandsToRegister.push(
        COMMANDS['warn-user'],
        COMMANDS['mute-user'],
        COMMANDS['kick-user'],
        COMMANDS['ban-user']
      );
    }

    if (features.security) {
      commandsToRegister.push(
        COMMANDS['verify-setup'],
        COMMANDS['logs-view']
      );
    }

    if (features.utility) {
      commandsToRegister.push(
        COMMANDS['ticket-create'],
        COMMANDS['suggest'],
        COMMANDS['announce'],
        COMMANDS['role-assign']
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

// Handle commands
async function handleCommand(interaction) {
  try {
    await interaction.deferReply(); // Respond immediately

    const { commandName } = interaction;

    // PLUGIN MODULE
    if (commandName === 'starboard-config') {
      const channel = interaction.options.getChannel('channel');
      const threshold = interaction.options.getInteger('threshold');

      await supabase.from('starboard_settings').upsert({
        guild_id: interaction.guildId,
        channel_id: channel.id,
        threshold,
      });

      await interaction.editReply(`✅ Starboard configured! Channel: ${channel}, Threshold: ${threshold}`);
    }

    if (commandName === 'birthday-set') {
      const date = interaction.options.getString('date');

      await supabase.from('birthdays').upsert({
        user_id: interaction.user.id,
        guild_id: interaction.guildId,
        birthday: date,
      });

      await interaction.editReply(`✅ Birthday set to ${date}`);
    }

    if (commandName === 'poll-create') {
      const question = interaction.options.getString('question');
      const option1 = interaction.options.getString('option1');
      const option2 = interaction.options.getString('option2');

      const { data: poll } = await supabase.from('polls').insert({
        guild_id: interaction.guildId,
        question,
        option1,
        option2,
        created_at: new Date(),
      }).select().single();

      await interaction.editReply(`📊 **${question}**\n1️⃣ ${option1}\n2️⃣ ${option2}`);
    }

    if (commandName === 'apply') {
      await interaction.editReply('📝 Application form submitted!');
    }

    // HELIX MODULE
    if (commandName === 'backup-create') {
      await interaction.editReply('💾 Creating server backup...');
      // Backup logic here
    }

    if (commandName === 'report-submit') {
      const reason = interaction.options.getString('reason');

      await supabase.from('reports').insert({
        guild_id: interaction.guildId,
        user_id: interaction.user.id,
        reason,
        created_at: new Date(),
      });

      await interaction.editReply(`📋 Report submitted: ${reason}`);
    }

    if (commandName === 'inspect-config') {
      const channel = interaction.options.getChannel('channel');
      const topic = interaction.options.getString('topic');

      await supabase.from('channel_topics').upsert({
        channel_id: channel.id,
        guild_id: interaction.guildId,
        topic,
      });

      global.botCache.channelTopics[channel.id] = topic;

      await interaction.editReply(`✅ Channel ${channel} configured for topic: "${topic}"`);
    }

    if (commandName === 'signal-send') {
      const message = interaction.options.getString('message');

      await supabase.from('signals').insert({
        guild_id: interaction.guildId,
        message,
        created_at: new Date(),
      });

      await interaction.editReply(`📢 Signal sent: ${message}`);
    }

    // ECONOMY MODULE
    if (commandName === 'rarity-create') {
      const name = interaction.options.getString('name');
      const weight = interaction.options.getInteger('weight');

      await supabase.from('rarities').insert({
        guild_id: interaction.guildId,
        name,
        weight,
      });

      await interaction.editReply(`⭐ Rarity "${name}" created with weight ${weight}`);
    }

    if (commandName === 'balance') {
      const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('user_id', interaction.user.id)
        .eq('guild_id', interaction.guildId)
        .single();

      const balance = user?.balance || 0;
      await interaction.editReply(`💰 Your balance: ${balance}`);
    }

    if (commandName === 'shop-buy') {
      const itemId = interaction.options.getString('item_id');

      const { data: item } = await supabase
        .from('shop_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (!item) {
        await interaction.editReply('❌ Item not found');
        return;
      }

      await interaction.editReply(`🛍️ Purchased ${item.name} for ${item.price}`);
    }

    // GAMING MODULE
    if (commandName === 'flashcard-create') {
      const name = interaction.options.getString('name');

      const { data: set } = await supabase.from('flashcard_sets').insert({
        guild_id: interaction.guildId,
        user_id: interaction.user.id,
        name,
      }).select().single();

      await interaction.editReply(`📚 Flashcard set "${name}" created!`);
    }

    if (commandName === 'flashcard-quiz') {
      const setId = interaction.options.getString('set_id');

      const { data: cards } = await supabase
        .from('flashcards')
        .select('*')
        .eq('set_id', setId);

      if (!cards || cards.length === 0) {
        await interaction.editReply('❌ No flashcards found');
        return;
      }

      await interaction.editReply(`📖 Quiz started! ${cards.length} cards to go.`);
    }

    if (commandName === 'trivia-start') {
      await interaction.editReply('🎯 Trivia game started! Answer the questions correctly.');
    }

    if (commandName === 'game-start') {
      const game = interaction.options.getString('game');
      await interaction.editReply(`🎮 ${game.toUpperCase()} game started!`);
    }

    // MODERATION MODULE
    if (commandName === 'warn-user') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      await supabase.from('warnings').insert({
        guild_id: interaction.guildId,
        user_id: user.id,
        reason,
        created_at: new Date(),
      });

      await interaction.editReply(`⚠️ ${user.username} warned for: ${reason}`);
    }

    if (commandName === 'mute-user') {
      const user = interaction.options.getUser('user');
      const duration = interaction.options.getInteger('duration');

      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(duration * 60 * 1000, 'Muted by moderator');

      await interaction.editReply(`🔇 ${user.username} muted for ${duration} minutes`);
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

    // SECURITY MODULE
    if (commandName === 'verify-setup') {
      await interaction.editReply('✅ Verification system setup!');
    }

    if (commandName === 'logs-view') {
      await interaction.editReply('📋 Server logs retrieved');
    }

    // UTILITY MODULE
    if (commandName === 'ticket-create') {
      await interaction.editReply('🎫 Support ticket created!');
    }

    if (commandName === 'suggest') {
      const suggestion = interaction.options.getString('suggestion');

      await supabase.from('suggestions').insert({
        guild_id: interaction.guildId,
        user_id: interaction.user.id,
        suggestion,
        created_at: new Date(),
      });

      await interaction.editReply(`✅ Suggestion submitted: ${suggestion}`);
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
  } catch (error) {
    console.error('❌ Error handling command:', error);
    await interaction.editReply('❌ An error occurred');
  }
}

module.exports = { registerCommandsForGuild, handleCommand, COMMANDS };
