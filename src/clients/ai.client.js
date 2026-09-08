import Groq from "groq-sdk";

export const aiClient = new Groq({
  apiKey: process.env.GROK_API_KEY,
});
