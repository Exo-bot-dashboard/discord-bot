// status.js
const { ActivityType } = require('discord.js');

function setBotStatus(client) {
  client.user.setPresence({
    activities: [
      {
        name: '🔌 exo-bot.co.uk | Configure on dashboard',
        type: ActivityType.Watching,
      },
    ],
    status: 'online', // options: 'online', 'idle', 'dnd', 'invisible'
  });
}

module.exports = { setBotStatus };
