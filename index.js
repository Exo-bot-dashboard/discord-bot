import express from "express";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { createClient } from "@supabase/supabase-js";

const {
  DISCORD_TOKEN,
  DISCORD_APP_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
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

// --- Supabase client (not used yet, but fine to keep) ---
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Discord client ---
const client = new Client({
  client.on("error", function(err) {
  console.error("CLIENT ERROR:", err);
});

client.on("shardError", (err) => {
  console.error("SHARD ERROR:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

  intents: [GatewayIntentBits.Guilds],
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

// --- ready event ---
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
});

// --- interaction handler ---
client.on("interactionCreate", async (interaction) => {
  console.log("RAW INTERACTION:", {
    type: interaction.type,
    id: interaction.id,
    commandName: interaction.commandName,
  });

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    try {
      await interaction.reply("Pong! ✅ Bot is alive and responding.");
      console.log("Replied to /ping");
    } catch (error) {
      console.error("Error replying to /ping:", error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "There was an error handling this command.",
            ephemeral: true,
          });
        }
      } catch (err2) {
        console.error("Error sending fallback reply:", err2);
      }
    }
  }
});

// --- login ---
client.login(DISCORD_TOKEN);
