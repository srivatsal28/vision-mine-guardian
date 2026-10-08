import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const analyzeComplaint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { analyzeWithAI } = await import("@/server/ai.server");
    const { data: c, error } = await context.supabase
      .from("complaints")
      .select("id,title,description,location")
      .eq("id", data.id)
      .single();
    if (error || !c) throw new Error("Complaint not found.");
    const analysis = await analyzeWithAI(c);
    const { error: upErr } = await context.supabase
      .from("complaints")
      .update({ analysis: analysis as never, severity: analysis.severity, category: analysis.category, status: "analysed" })
      .eq("id", c.id);
    if (upErr) throw new Error(upErr.message);
    return analysis;
  });

export const askRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { question: string }) => {
    const q = String(d.question ?? "").trim();
    if (q.length < 3 || q.length > 1000) throw new Error("Please write a question (3–1000 characters).");
    return { question: q };
  })
  .handler(async ({ data }) => {
    const { askRulesAI } = await import("@/server/ai.server");
    return askRulesAI(data.question);
  });

export const analyzeSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { image: string; notes?: string; location?: string }) => {
    const image = String(d.image ?? "");
    if (!/^data:image\/(png|jpe?g|webp|gif);base64,/.test(image)) throw new Error("Please upload a PNG, JPG or WEBP image.");
    if (image.length > 8_000_000) throw new Error("Image is too large (max about 5 MB).");
    return { image, notes: String(d.notes ?? "").slice(0, 1000), location: String(d.location ?? "").slice(0, 200) };
  })
  .handler(async ({ data }) => {
    const { analyzeSnapshotAI } = await import("@/server/ai.server");
    return analyzeSnapshotAI(data);
  });
