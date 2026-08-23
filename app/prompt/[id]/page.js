import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PromptDetail from "@/components/PromptDetail";

async function getPrompt(id) {
  const { data, error } = await supabase.from("prompts").select("*").eq("id", id).single();
  if (error || !data) return null;
  if (data.status === "draft") return null;
  return data;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const prompt = await getPrompt(id);
  if (!prompt) return { title: "Prompt not found · PromptVault" };
  return {
    title: `${prompt.title} · PromptVault`,
    description: String(prompt.description || "").slice(0, 155),
    openGraph: {
      title: prompt.title,
      description: String(prompt.description || "").slice(0, 155),
      images: prompt.image_url ? [prompt.image_url] : [],
    },
  };
}

export default async function PromptPage({ params }) {
  const { id } = await params;
  const prompt = await getPrompt(id);
  if (!prompt) notFound();
  return <PromptDetail item={prompt} />;
}
