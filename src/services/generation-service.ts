import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCategoryByCardDate } from "./category-service";
import { generateKnowledgePack } from "./content-service";
import { buildImagePrompt } from "./image-prompt-service";
import { generateCardImage } from "./image-service";
import { uploadCardImage } from "./storage-service";

export async function generateDailyCard(cardDate: string) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("knowledge_cards")
    .select("*")
    .eq("card_date", cardDate)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: job, error: jobError } = await supabaseAdmin
    .from("generation_jobs")
    .insert({ job_date: cardDate, job_type: "daily_card", status: "running" })
    .select("*")
    .single();

  if (jobError) {
    throw new Error(`Generation job already exists or failed to create: ${jobError.message}`);
  }

  try {
    const category = getCategoryByCardDate(cardDate);
    const { data: recentCards, error: recentError } = await supabaseAdmin
      .from("knowledge_cards")
      .select("title")
      .order("card_date", { ascending: false })
      .limit(30);

    if (recentError) throw recentError;

    const recentTitles = recentCards?.map((item) => item.title) ?? [];
    const knowledgePack = await generateKnowledgePack({ cardDate, category, recentTitles });
    const imagePrompt = buildImagePrompt(knowledgePack);

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("knowledge_cards")
      .insert({
        title: knowledgePack.title,
        subtitle: knowledgePack.subtitle,
        category: knowledgePack.category,
        sub_category: knowledgePack.subCategory,
        difficulty: knowledgePack.difficulty,
        card_date: cardDate,
        summary: knowledgePack.summary,
        keywords: knowledgePack.keywords.map((x) => x.term),
        content_json: knowledgePack,
        image_prompt: imagePrompt,
        image_url: "",
        generation_status: "content_generated",
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    const imageBuffer = await generateCardImage(imagePrompt);
    const uploaded = await uploadCardImage({ cardDate, cardId: inserted.id, imageBuffer });

    const { data: completed, error: updateError } = await supabaseAdmin
      .from("knowledge_cards")
      .update({
        image_url: uploaded.imageUrl,
        image_storage_path: uploaded.storagePath,
        generation_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", inserted.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    await supabaseAdmin
      .from("generation_jobs")
      .update({ status: "completed", card_id: completed.id, finished_at: new Date().toISOString() })
      .eq("id", job.id);

    return completed;
  } catch (error: any) {
    await supabaseAdmin
      .from("generation_jobs")
      .update({ status: "failed", error_message: error.message, finished_at: new Date().toISOString() })
      .eq("id", job.id);

    await supabaseAdmin
      .from("knowledge_cards")
      .update({ generation_status: "failed", error_message: error.message, updated_at: new Date().toISOString() })
      .eq("card_date", cardDate);

    throw error;
  }
}

export async function regenerateCardImage(cardId: string) {
  const { data: card, error } = await supabaseAdmin
    .from("knowledge_cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (error) throw error;
  if (!card.image_prompt) throw new Error("Card has no image_prompt");

  const imageBuffer = await generateCardImage(card.image_prompt);
  const uploaded = await uploadCardImage({ cardDate: card.card_date, cardId: card.id, imageBuffer });

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("knowledge_cards")
    .update({
      image_url: uploaded.imageUrl,
      image_storage_path: uploaded.storagePath,
      generation_status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardId)
    .select("*")
    .single();

  if (updateError) throw updateError;
  return updated;
}
