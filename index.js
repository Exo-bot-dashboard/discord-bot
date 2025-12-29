import express from "express";
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import { createClient } from "@supabase/supabase-js";

const {
  DISCORD_TOKEN,
  DISCORD_APP_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
} = process.env;

if (!DISCORD_TOKEN || !DISCORD_APP_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars. Set DISCORD_TOKEN, DISCORD_APP_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// --- tiny web server for uptime checks ---
const app = express();
app.get("/", (_req, res) => {
  res.status(200).send("OK - bot is running");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web server alive on port ${PORT}`));

// --- Supabase client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Discord client ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Example: simple /ping command
const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong! and shows if a module is enabled.")
    .toJSON()
];

// Register slash commands globally
async function registerCommands() {
  try {
    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
    await rest.put(
      Routes.applicationCommands(DISCORD_APP_ID),
      { body: commands }
    );
    console.log("Slash commands registered.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
}

// Helper: read guild features from Supabase
async function getGuildFeatures(guildId) {
  const { data, error } = await supabase
    .from("guild_features")
    .select("*")
    .eq("guild_id", guildId)
    .single();

  if (error) {
    console.error("Supabase guild_features error:", error.message);
    return null;
  }
  return data;
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  registerCommands();
});

// Handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    const guildId = interaction.guildId;

    const features = await getGuildFeatures(guildId);
    const engagementEnabled = features?.engagement_enabled ?? true; // adjust field name to match your DB

    await interaction.reply(
      `Pong! Engagement module is **${engagementEnabled ? "ENABLED" : "DISABLED"}** for this server.`
    );
  }
});

client.login(DISCORD_TOKEN);
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === "ping") {
      await interaction.reply("Pong! ✅ Bot received your command and is responding on time.");
    }
  } catch (error) {
    console.error("Error handling interaction:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "There was an error handling this command.", ephemeral: true });
    }
  }
});
