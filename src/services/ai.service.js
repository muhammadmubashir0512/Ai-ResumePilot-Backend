import { aiClient } from "../clients/ai.client.js";

export const aiServices = async ({ prompt, instruction }) => {
  const response = await aiClient.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    config: {
      systemInstruction: instruction,
    },
  });

  return response.text;
};
