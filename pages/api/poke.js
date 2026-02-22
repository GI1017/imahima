/* ────────────────────────────────────────────
   LINE Messaging API ヘルパー
   ──────────────────────────────────────────── */
const LINE_API_BASE = 'https://api.line.me/v2/bot/message';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

async function pushMessage(to, messages) {
  if (!CHANNEL_ACCESS_TOKEN) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN is not set');
    return { ok: false, reason: 'no_token' };
  }

  const res = await fetch(`${LINE_API_BASE}/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to, messages }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`LINE push failed (${res.status}):`, body);
    return { ok: false, reason: 'push_failed', status: res.status, body };
  }

  return { ok: true };
}

/* ════════════════════════════════════════════
   API ハンドラー
   POST /api/poke
   Body: { fromDisplayName, toUserId }
   ════════════════════════════════════════════ */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fromDisplayName, toUserId } = req.body;

    if (!fromDisplayName || !toUserId) {
      return res.status(400).json({ error: 'fromDisplayName and toUserId are required' });
    }

    const result = await pushMessage(toUserId, [
      {
        type: 'text',
        text: `${fromDisplayName}さんがあなたに声をかけています！`,
      },
    ]);

    if (!result.ok) {
      return res.status(502).json({
        error: 'Push notification failed',
        reason: result.reason,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('poke API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}