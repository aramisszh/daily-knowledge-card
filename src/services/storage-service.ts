import { supabaseAdmin } from "@/lib/supabase-admin";

export async function uploadCardImage(params: {
  cardDate: string;
  cardId: string;
  imageBuffer: Buffer;
}) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "knowledge-cards";
  const path = `${params.cardDate}/${params.cardId}.png`;

  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, params.imageBuffer, {
    contentType: "image/png",
    upsert: true,
    cacheControl: "3600",
  });

  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return { imageUrl: data.publicUrl, storagePath: path };
}
