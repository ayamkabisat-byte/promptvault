const PHRASE_RULES = [
  ["photorealistic", ["photorealistic", "photo realistic", "ultra realistic", "realistic photo"]],
  ["cinematic", ["cinematic", "movie still", "film still"]],
  ["portrait", ["portrait", "headshot", "close up", "close-up"]],
  ["selfie", ["selfie", "front camera", "mirror selfie"]],
  ["fashion", ["fashion", "editorial", "runway", "streetwear"]],
  ["studio", ["studio lighting", "photo studio", "studio portrait"]],
  ["natural light", ["natural light", "daylight", "window light"]],
  ["soft lighting", ["soft light", "soft lighting", "diffused light"]],
  ["dramatic lighting", ["dramatic light", "dramatic lighting", "chiaroscuro"]],
  ["golden hour", ["golden hour", "sunset light", "sunrise light"]],
  ["flash photography", ["flash photography", "direct flash", "camera flash"]],
  ["bokeh", ["bokeh", "shallow depth of field", "depth of field"]],
  ["wide angle", ["wide angle", "wide-angle", "ultrawide"]],
  ["macro", ["macro photography", "macro lens", "macro shot"]],
  ["watercolor", ["watercolor", "watercolour"]],
  ["flat vector", ["flat vector", "flat illustration", "flat design"]],
  ["vector", ["vector illustration", "vector art", "svg style"]],
  ["anime", ["anime", "manga"]],
  ["cartoon", ["cartoon", "comic style", "comic art"]],
  ["3d", ["3d render", "3d illustration", "three dimensional"]],
  ["isometric", ["isometric"]],
  ["minimalist", ["minimalist", "minimalism", "minimal"]],
  ["retro", ["retro", "vintage", "nostalgic"]],
  ["cyberpunk", ["cyberpunk", "futuristic neon", "neon city"]],
  ["line art", ["line art", "outline illustration", "monoline"]],
  ["geometric", ["geometric", "bauhaus", "abstract geometry"]],
  ["poster", ["poster", "key visual"]],
  ["logo", ["logo", "logomark", "brand mark"]],
  ["branding", ["branding", "brand identity", "visual identity"]],
  ["typography", ["typography", "lettering", "type design"]],
  ["packaging", ["packaging", "package design"]],
  ["icon", ["icon set", "icons", "pictogram"]],
  ["pattern", ["pattern", "seamless", "repeat pattern"]],
  ["background", ["background", "backdrop", "wallpaper"]],
  ["halloween", ["halloween", "spooky", "pumpkin", "witch"]],
  ["diwali", ["diwali", "deepavali", "diya", "rangoli"]],
  ["christmas", ["christmas", "xmas", "santa", "ornament"]],
  ["winter", ["winter", "snow", "snowy"]],
  ["autumn", ["autumn", "fall season", "fall leaves"]],
  ["back to school", ["back to school", "school supplies", "classroom"]],
  ["food", ["food photography", "food styling", "culinary"]],
  ["travel", ["travel", "vacation", "tourism", "destination"]],
  ["couple", ["couple", "romantic", "two people"]],
  ["group", ["group photo", "group portrait", "friends"]],
  ["man", ["man portrait", "male portrait", "young man"]],
  ["woman", ["woman portrait", "female portrait", "young woman"]],
];

const STOPWORDS = new Set([
  "with","from","into","over","under","that","this","these","those","their","there","where","which","while","when","what","your","using","use","used","very","more","most","some","such","than","then","them","they","have","has","having","will","would","could","should","about","around","through","between","inside","outside","against","without","within","image","photo","picture","scene","style","high","quality","detailed","details","beautiful","background","create","generate","showing","featuring","make","like","look","looks","looking","shot","view","angle","composition","color","colors","lighting","light","subject","person","people","wearing","wears","front","back","left","right","center","centre","realistic","illustration","graphic","design","prompt","untuk","dengan","yang","dari","pada","atau","dan","sebuah","seperti","agar","lebih","dalam","tanpa","buat","membuat"
]);

function clean(value = "") {
  return String(value).toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function pushUnique(list, value) {
  const tag = clean(value);
  if (!tag || tag.length < 2 || list.includes(tag)) return;
  list.push(tag);
}

export function generateAutoTags(form = {}, limit = 16) {
  const title = clean(form.title);
  const description = clean(form.description);
  const category = clean(form.category);
  const medium = clean(form.medium);
  const model = clean(form.model);
  const haystack = `${title} ${description} ${category}`;
  const tags = [];

  pushUnique(tags, category);
  pushUnique(tags, medium);

  if (model.includes("nano banana")) pushUnique(tags, "nano banana");
  else if (model.includes("midjourney")) pushUnique(tags, "midjourney");
  else if (model.includes("gpt")) pushUnique(tags, "gpt image");
  else if (model && model !== "ai") pushUnique(tags, model);

  for (const [tag, needles] of PHRASE_RULES) {
    if (needles.some((needle) => haystack.includes(needle))) pushUnique(tags, tag);
    if (tags.length >= limit) return tags.slice(0, limit);
  }

  const words = haystack.split(/\s+/).filter((word) =>
    word.length >= 4 &&
    !STOPWORDS.has(word) &&
    !/^\d+$/.test(word)
  );

  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);

  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([word]) => word);

  for (const word of ranked) {
    pushUnique(tags, word);
    if (tags.length >= limit) break;
  }

  return tags.slice(0, limit);
}
