import express from "express";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { createClient } from "@supabase/supabase-js";
const { setBotStatus } = require('./status');

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  setBotStatus(client);
});
const {
  DISCORD_TOKEN,
  DISCORD_APP_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  PORT,
} = process.env;

if (!DISCORD_TOKEN || !DISCORD_APP_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars. Set DISCORD_TOKEN, DISCORD_APP_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

// --- tiny web server for uptime checks ---
const app = express();
app.get("/", (_req, res) => {
  res.status(200).send("OK - bot is running");
});
const SERVER_PORT = PORT || 3000;
app.listen(SERVER_PORT, () =>
  console.log(`Web server alive on port ${SERVER_PORT}`)
);

// --- Supabase client (you can use this later) ---
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Discord client ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds], // add more intents later if needed
});

client.on("error", (err) => {
  console.error("Client error:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

// --- define commands (only /ping for now) ---
const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Simple ping to check if the bot is responding."),
].map((command) => command.toJSON());

// --- register commands ---
const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(DISCORD_APP_ID), {
      body: commands,
    });
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
}

// --- handle interactions ---
client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ping") {
      await interaction.reply("Pong! ✅");
    }
  } catch (err) {
    console.error("Error handling interaction:", err);
    if (interaction.deferred || interaction.replied) {
      try {
        await interaction.editReply("There was an error while executing this command.");
      } catch (_) {}
    } else {
      try {
        await interaction.reply({
          content: "There was an error while executing this command.",
          ephemeral: true,
        });
      } catch (_) {}
    }
  }
});

// --- when bot is ready ---
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
});

// --- login ---
client.login(DISCORD_TOKEN);
client.on("interactionCreate", async (interaction) => {
  console.log(
    "Interaction received:",
    interaction.type,
    interaction.isChatInputCommand() ? interaction.commandName : "non-chat-input"
  );

  try {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ping") {
      await interaction.reply("Pong! ✅");
    }
  } catch (err) {
    console.error("Error handling interaction:", err);
  }
});
