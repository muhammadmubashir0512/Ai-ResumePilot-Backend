import { aiClient } from "../clients/ai.client.js";

export const aiServices = async ({ prompt, instruction }) => {
  const response = await aiClient.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: instruction },
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0].message.content;
};
