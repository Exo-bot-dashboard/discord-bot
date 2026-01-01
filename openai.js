const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function checkIfOnTopic(messageContent, topic) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a content moderator. Determine if a message is about the specified topic. Answer only "yes" or "no".',
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
    console.error('❌ Error checking topic:', error);
    return true; // Default to on-topic if API fails
  }
}

module.exports = { checkIfOnTopic };
