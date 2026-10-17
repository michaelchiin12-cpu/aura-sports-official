import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";

type TelegramUser = { id: number; first_name?: string; username?: string };
type TelegramChat = { id: number; type?: string };
type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
};
type TelegramUpdate = { update_id: number; message?: TelegramMessage };

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function parseIds(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(",").map((v) => v.trim()).filter(Boolean));
}

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) {
    // Do not log response bodies: they may contain provider details.
    throw new Error(`Telegram sendMessage failed with HTTP ${response.status}`);
  }
}

function helpText(): string {
  return [
    "🏸 Aura Sports Agent — tahap awal",
    "",
    "/help — panduan",
    "/status — status konfigurasi",
    "/task <instruksi> — analisis dan rencana perubahan",
    "",
    "Tahap awal ini belum mengubah kode, membuat PR, atau menjalankan deployment.",
    "Semua perubahan akan melalui branch/PR dan persetujuan sesuai tingkat risiko.",
  ].join("\n");
}

async function getTaskPlan(instruction: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "Agent belum aktif: OPENAI_API_KEY belum dikonfigurasi secara privat di Vercel.";
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{
            type: "input_text",
            text: [
              "Kamu adalah Aura Sports Project Agent. Buat rencana teknis ringkas dalam bahasa Indonesia.",
              "Klasifikasikan risiko sebagai RENDAH, MENENGAH, atau TINGGI.",
              "RENDAH: teks, dokumentasi, styling kecil tanpa mengubah perilaku penting.",
              "MENENGAH: perubahan logika, komponen, integrasi, atau banyak file.",
              "TINGGI: autentikasi, hak akses, secret, database, pembayaran, penghapusan data, atau Production.",
              "Jangan mengklaim sudah membaca repository atau menjalankan aksi apa pun.",
              "Jangan meminta atau mengeluarkan token, password, atau secret.",
              "Jangan memberikan persetujuan Production. Output hanya analisis dan rencana, bukan eksekusi.",
              "Jika instruksi ambigu, sebutkan pertanyaan yang perlu dijawab.",
            ].join("\n"),
          }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: instruction.slice(0, 6000) }],
        },
      ],
      max_output_tokens: 500,
    }),
  });
  if (!response.ok) {
    return "Saya belum dapat menganalisis instruksi saat ini. Periksa konfigurasi OpenAI API dan coba lagi.";
  }
  const data = await response.json() as {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const text = (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();
  return text || "Belum ada rencana yang dapat dibuat. Mohon perjelas instruksinya.";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const suppliedSecret = req.headers["x-telegram-bot-api-secret-token"];
  if (!expectedSecret || typeof suppliedSecret !== "string" || !safeEqual(suppliedSecret, expectedSecret)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let update: TelegramUpdate;
  try {
    update = typeof req.body === "string" ? JSON.parse(req.body) as TelegramUpdate : req.body as TelegramUpdate;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const message = update?.message;
  const user = message?.from;
  const text = message?.text?.trim();
  if (!message || !user || !text) return res.status(200).json({ ok: true });

  const ownerIds = parseIds(process.env.OWNER_TELEGRAM_IDS);
  const allowedChatIds = parseIds(process.env.ALLOWED_TELEGRAM_CHAT_IDS);
  const userId = String(user.id);
  const chatId = String(message.chat.id);

  // Fail closed until owner and allowed chat IDs are configured.
  if (!ownerIds.has(userId) || !allowedChatIds.has(chatId)) {
    return res.status(200).json({ ok: true });
  }

  try {
    if (/^\/(start|help)(?:@\w+)?(?:\s|$)/i.test(text)) {
      await sendTelegramMessage(message.chat.id, helpText());
    } else if (/^\/status(?:@\w+)?(?:\s|$)/i.test(text)) {
      const configured = Boolean(process.env.OPENAI_API_KEY && process.env.TELEGRAM_BOT_TOKEN);
      await sendTelegramMessage(
        message.chat.id,
        `Aura Sports Agent\nWebhook: aktif\nOpenAI: ${process.env.OPENAI_API_KEY ? "terkonfigurasi" : "belum dikonfigurasi"}\nMode: ${configured ? "analisis saja — belum ada aksi kode" : "setup belum lengkap"}\nProduction: selalu memerlukan persetujuan approver.`,
      );
    } else if (/^\/task(?:@\w+)?\s+/i.test(text)) {
      const instruction = text.replace(/^\/task(?:@\w+)?\s+/i, "").trim();
      if (!instruction) {
        await sendTelegramMessage(message.chat.id, "Format: /task <jelaskan perubahan yang diinginkan>");
      } else {
        const plan = await getTaskPlan(instruction);
        await sendTelegramMessage(message.chat.id, `📋 Rencana awal (belum dieksekusi)\n\n${plan}`);
      }
    } else {
      await sendTelegramMessage(message.chat.id, "Gunakan /help untuk melihat perintah yang tersedia.");
    }
  } catch {
    // Avoid logging message contents, provider responses, or credentials.
    return res.status(200).json({ ok: true, warning: "Message processing failed" });
  }

  return res.status(200).json({ ok: true });
}
