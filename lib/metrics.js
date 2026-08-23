import { supabase } from "./supabase";

export async function trackSiteVisit(visitorId) {
  if (!visitorId) return null;
  try {
    const { data, error } = await supabase.rpc("track_site_visit", { visitor_key: visitorId });
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getPublicStats() {
  try {
    const { data, error } = await supabase.rpc("get_public_stats");
    if (error || !data) return { total_views: 0, unique_visitors: 0 };
    const row = Array.isArray(data) ? data[0] : data;
    return {
      total_views: Number(row?.total_views || 0),
      unique_visitors: Number(row?.unique_visitors || 0),
    };
  } catch {
    return { total_views: 0, unique_visitors: 0 };
  }
}

export async function incrementPromptMetric(promptId, metric) {
  if (!promptId || !["view", "copy", "favorite", "unfavorite"].includes(metric)) return null;
  try {
    const { data, error } = await supabase.rpc("increment_prompt_metric", {
      prompt_id_input: promptId,
      metric_input: metric,
    });
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
