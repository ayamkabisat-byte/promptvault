const includesAny = (text, words) => words.some((word) => text.includes(word));

export function fashionPoseHint(item = {}) {
  const text = `${item.title || ""} ${item.scene || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
  if (includesAny(text, ["aerobic", "fitness", "dance", "rave", "jumpstyle", "tecktonik", "shuffle", "disco"])) {
    return "Use an energetic, movement-ready fashion pose with asymmetry, a lively mid-step or dance-informed stance, and visible attitude. The body must still show the outfit clearly from head to toe; never use a stiff mannequin pose.";
  }
  if (includesAny(text, ["decora", "gyaru", "lolita", "visual kei", "fairy kei", "dolly kei", "oshare", "harajuku", "otome"])) {
    return "Use a lively fashion-editorial pose with personality, expressive hand placement, slight body angle, and styling attitude appropriate to this subculture. It should feel like a real fashion magazine character shoot, not a rigid catalog stance.";
  }
  if (includesAny(text, ["punk", "rock", "biker", "greaser", "yankii", "bosozoku", "goth", "avant-garde"])) {
    return "Use a relaxed, attitude-heavy fashion pose: a lean, slight slouch, hand-in-pocket stance, crossed-leg stance, or confident angled posture that suits the scene. Avoid symmetry and stiffness.";
  }
  if (includesAny(text, ["ivy", "preppy", "old money", "power dressing", "tailor", "classic"])) {
    return "Use a natural confident editorial pose—relaxed, poised and elegant, with subtle asymmetry and believable body language rather than a stiff standing mannequin.";
  }
  if (includesAny(text, ["streetwear", "workwear", "western", "cowboy", "hippie", "boho", "utility"])) {
    return "Use a candid street-style or lookbook pose with easy asymmetry, a natural weight shift, and scene-appropriate attitude. Keep all important garments visible.";
  }
  return "Use a natural fashion-editorial pose that matches the style, with a slight body angle, expressive but believable gesture, and clear outfit visibility. Avoid a stiff mannequin stance.";
}

export function fashionBackgroundHint(item = {}) {
  const text = `${item.title || ""} ${item.scene || ""} ${item.region || ""} ${item.country || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
  if (includesAny(text, ["harajuku", "decora", "gyaru", "lolita", "visual kei", "japan", "showa", "urahara"])) {
    return "Use a clean, minimal Japanese fashion-context background with only subtle cues—such as a softly simplified Harajuku/Tokyo street edge, storefront geometry, crosswalk fragment, station-sign shape, or muted urban facade. Keep the context faint and secondary so the infographic stays readable.";
  }
  if (includesAny(text, ["aerobic", "fitness"])) {
    return "Use a clean 1980s fitness-studio hint: a soft pastel geometric wall, minimal studio floor line, restrained neon shapes, or a faint exercise-studio cue. Keep it sparse and editorial, never a busy gym scene.";
  }
  if (includesAny(text, ["disco"])) {
    return "Use a clean retro nightlife hint with restrained disco geometry, soft reflective floor cues, or a faint light-panel motif. Keep the backdrop minimal and let the outfit dominate.";
  }
  if (includesAny(text, ["ivy", "preppy", "old money"])) {
    return "Use a clean East Coast academic or heritage backdrop with a subtle campus corridor, brick or stone facade, courtyard linework, or club-interior hint. Keep it soft, minimal and editorial.";
  }
  if (includesAny(text, ["western", "cowboy"])) {
    return "Use a minimal western context: a faint ranch fence, desert horizon, weathered wall, or open-road cue. Keep it clean and understated, not a cinematic landscape.";
  }
  if (includesAny(text, ["workwear", "biker", "greaser", "rock", "punk", "streetwear"])) {
    return "Use a restrained urban/workshop/street hint such as a simple wall edge, pavement line, garage texture, poster fragment, or railing. Keep the environment quiet and secondary.";
  }
  if (includesAny(text, ["hippie", "boho"])) {
    return "Use a soft minimal natural or vintage-bohemian context with a faint warm wall, plant silhouette, textile shape, or sunlit outdoor hint. Do not clutter the composition.";
  }
  return "Use a clean minimal editorial background with only a few subtle contextual cues related to the style. The environment must support the fashion identity without becoming visually busy.";
}

function shortList(value = "", limit = 6) {
  return String(value).split(",").map((part) => part.trim()).filter(Boolean).slice(0, limit).join(", ");
}

export function buildFashionInfographicPrompt(item = {}) {
  // Fashion Prompt room now exposes the transformation prompt as its primary usable prompt.
  // The infographic prompt remains stored in Supabase for future INFOGRAPHIC media/tab use.
  if (item.prompt_img2img && item.prompt_img2img !== "__AUTO__") return item.prompt_img2img;
  if (item.prompt_infographic && item.prompt_infographic !== "__AUTO__") return item.prompt_infographic;

  const title = item.title || "Fashion Style";
  const country = item.country || item.region || "Fashion culture";
  const scene = item.scene || "Fashion style";
  const era = item.era || "Contemporary";

  return `Use the uploaded image as the strict SUBJECT reference.

Create a polished fashion infographic / style breakdown poster for the fashion style: "${title}".

REGION / CONTEXT
${country} • ${scene} • ${era}

CORE GOAL
Preserve the subject's recognizable identity, face, age impression, body type, skin tone, and overall presence, but redesign the wardrobe, styling, hair treatment, grooming/makeup, accessories, and fashion attitude so the result clearly embodies ${title}.

IMPORTANT FORMAT
This must be a clean FASHION INFOGRAPHIC, not merely a portrait or a collage.

LAYOUT
- Place a clear, stylish title at the top: "${title}"
- Add a smaller subtitle below: "${country} • ${scene} • ${era}"
- Show one full-body main character prominently in the center
- Keep the entire outfit visible from head to toe
- Place 6 to 10 fashion callout panels split across the left and right sides
- Use a mix of small isolated item illustrations and detail close-ups
- Add short labels and concise 2–6 word descriptions
- Use thin arrows, pointer lines, or subtle diagram markers where useful
- Maintain generous negative space and a balanced editorial hierarchy

CHARACTER RENDERING
Render the main figure in a polished semi-realistic anime fashion-editorial style:
- recognizable human identity
- refined anime-inspired facial rendering
- believable adult proportions
- clean clothing folds and construction
- clear material distinction
- elegant fashion-magazine finish
- not chibi
- not hyper-realistic photography
- not flat mascot art

POSE
${fashionPoseHint(item)}

STYLE DNA
${item.visual_dna || "Translate the fashion style faithfully and specifically."}

SILHOUETTE
${item.silhouette || "Preserve the defining silhouette of the fashion style."}

CORE WARDROBE
${shortList(item.wardrobe)}

HAIR
${item.hair || "Use style-appropriate hair treatment."}

MAKEUP / GROOMING
${item.makeup || "Use style-appropriate grooming."}

ACCESSORIES
${shortList(item.accessories)}

COLOR PALETTE
${item.palette || "Use a palette authentic to the style."}

INFOGRAPHIC BREAKDOWN
Choose the most defining 6–10 elements from hairstyle, outerwear, top, bottom, footwear, bag, jewelry, makeup/grooming, signature accessory, silhouette, and color palette. The side items should teach the viewer why this look belongs to ${title}; do not fill the sides with random fashion objects.

BACKGROUND
${fashionBackgroundHint(item)}
The background must remain clean, minimal, low-contrast, and visually quieter than the central character and callouts.

DESIGN LANGUAGE
Use neat fashion-editorial typography and a refined visual grid. Labels must be short and readable. Allow the style itself to influence small decorative accents, but never let decoration overpower the infographic.

AVOID / FAILURE MODES
${item.avoid_notes || "Avoid generic styling that loses the specific fashion identity."}
Do not use a stiff mannequin pose.
Do not crowd the background.
Do not hide important garments or footwear.
Do not create a generic character illustration without explanatory callouts.
No watermark. No mockup. No unrelated text. No unrelated busy scene.

FINAL RESULT
A polished semi-realistic anime fashion infographic sheet with a strong title at the top, one expressive full-body central figure styled convincingly as ${title}, and informative fashion breakdowns on both sides.`;
}
