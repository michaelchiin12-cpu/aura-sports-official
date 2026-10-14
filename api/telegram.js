/**
 * AURA SPORT MANAGER — Telegram AI Command Center (Phase 1)
 * Analysis-only: no GitHub writes, deployments, or database mutations.
 */
const SYSTEM_PROMPT = [
  "Kamu adalah asisten teknis AURA SPORT MANAGER.",
  "Jawab dalam Bahasa Indonesia, jelas dan ringkas.",
  "Cakupan hanya proyek AURA SPORT MANAGER: GitHub, Vercel, Supabase.",
  "Pada fase ini hanya boleh menganalisis dan memberi rencana; tidak memiliki akses untuk mengeksekusi perubahan.",
  "Jangan pernah meminta atau menampilkan password, API key, token, atau secret.",
  "Untuk perubahan kode/database/deployment, jelaskan rencana, risiko, dan cara verifikasi; persetujuan eksplisit dibutuhkan sebelum eksekusi.",
  "Jangan menyatakan sudah memeriksa layanan eksternal atau melakukan tindakan jika belum benar-benar dilakukan."
].join("\n");

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
async function telegram(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum dikonfigurasi");
  const response = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error("Telegram API request gagal");
  return data;
}
async function reply(chatId, text, replyToMessageId) {
  return telegram("sendMessage", {
    chat_id: chatId, text: String(text || "Tidak ada jawaban.").slice(0, 3900),
    ...(replyToMessageId ? { reply_to_message_id: replyToMessageId, allow_sending_without_reply: true } : {})
  });
}
async function askOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "AI belum aktif. Admin perlu mengatur OPENAI_API_KEY di Vercel Environment Variables.";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: "Bearer " + key, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt.slice(0, 6000) }
      ]
    })
  });
  if (!response.ok) throw new Error("Permintaan ke layanan AI gagal");
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "AI tidak memberikan jawaban.";
}
module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return sendJson(res, 401, { ok: false, error: "Unauthorized" });
  }
  const message = req.body?.message || req.body?.edited_message;
  if (!message?.chat?.id || typeof message.text !== "string") return sendJson(res, 200, { ok: true, ignored: true });
  const allowed = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  const chatId = String(message.chat.id);
  if (!allowed.length || !allowed.includes(chatId)) return sendJson(res, 200, { ok: true, ignored: true });
  const text = message.text.trim();
  try {
    if (/^\/(start|help)(@\w+)?(?:\s|$)/i.test(text)) {
      await reply(chatId, [
        "AURA SPORT MANAGER — AI Command Center (fase 1)", "",
        "/help — daftar perintah", "/status — status konfigurasi dasar bot",
        "/ask <pertanyaan> — analisis AI dan rencana tindakan", "",
        "Fase ini hanya untuk analisis. Belum ada perubahan GitHub, deployment, atau penulisan database otomatis."
      ].join("\n"), message.message_id);
    } else if (/^\/status(?:@\w+)?\s*$/i.test(text)) {
      await reply(chatId, [
        "Status konfigurasi bot:",
        "• OpenAI API key: " + (process.env.OPENAI_API_KEY ? "terpasang" : "belum diatur"),
        "• Model: " + (process.env.OPENAI_MODEL || "gpt-4o-mini"),
        "• Mode: analisis saja; tindakan eksternal dinonaktifkan",
        "• Pemeriksaan live GitHub/Vercel/Supabase: belum diaktifkan"
      ].join("\n"), message.message_id);
    } else {
      const prompt = text.replace(/^\/ask(?:@\w+)?\s*/i, "").trim();
      if (!prompt || (/^\//.test(text) && !/^\/ask(?:@\w+)?(?:\s|$)/i.test(text))) {
        await reply(chatId, "Perintah belum dikenali. Gunakan /help.", message.message_id);
      } else {
        await reply(chatId, await askOpenAI(prompt), message.message_id);
      }
    }
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("telegram_command_failed", { message: error.message });
    try { await reply(chatId, "Perintah gagal diproses. Periksa konfigurasi bot dan log Vercel."); } catch (_) {}
    return sendJson(res, 200, { ok: true });
  }
};
