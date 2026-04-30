import { getOpenAIClient } from "@/lib/openai";

export async function generateCardImage(prompt: string) {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

  const result = await getOpenAIClient().images.generate({
    model,
    prompt,
    size: "1024x1536",
    quality: "medium",
    response_format: "b64_json",
  } as any);

  const base64 = result.data?.[0]?.b64_json;
  if (!base64) throw new Error("Image generation returned no image data");

  return Buffer.from(base64, "base64");
}
