import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

/* ────────────────────────────────────────────
   Firebase Admin 初期化
   ──────────────────────────────────────────── */
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

/* ────────────────────────────────────────────
   LINE Messaging API ヘルパー
   ──────────────────────────────────────────── */
const LINE_API_BASE = 'https://api.line.me/v2/bot/message';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

async function pushMessage(to, messages) {
  if (!CHANNEL_ACCESS_TOKEN) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN is not set');
    return false;
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
  }

  return res.ok;
}

/* ────────────────────────────────────────────
   通知用 Flex Message 生成
   ──────────────────────────────────────────── */
function buildHimaNotification(displayName, liffId) {
  const liffUrl = `https://liff.line.me/${liffId}`;
  return {
    type: 'flex',
    altText: `${displayName}さんはイマヒマしてます！`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `${displayName}さんはイマヒマしてます！`,
            weight: 'bold',
            size: 'md',
            wrap: true,
            color: '#22c55e',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'イマヒマ。を開く',
              uri: liffUrl,
            },
            style: 'primary',
            color: '#22c55e',
          },
        ],
      },
    },
  };
}

/* ════════════════════════════════════════════
   API ハンドラー
   POST /api/notify
   Body: { userId, displayName, isHima, visibleFriendIds }
   ════════════════════════════════════════════ */
export default async function handler(req, res) {
  /* ── メソッドチェック ── */
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, displayName, isHima, visibleFriendIds } = req.body;

    if (!userId || typeof isHima !== 'boolean') {
      return res.status(400).json({ error: 'userId and isHima are required' });
    }

    /* ── 1. Firestore: ユーザーの暇状態を更新 ── */
    const userRef = db.collection('users').doc(userId);
    const now = Timestamp.now();
    const oneHourLater = Timestamp.fromMillis(now.toMillis() + 60 * 60 * 1000);

    await userRef.update({
      isHima,
      himaExpiresAt: isHima ? oneHourLater : null,
    });

    /* ── 2. Firestore: 友達の公開範囲を更新 ── */
    if (Array.isArray(visibleFriendIds)) {
      const friendsRef = userRef.collection('friends');
      const friendsSnap = await friendsRef.get();

      const batch = db.batch();
      friendsSnap.forEach((friendDoc) => {
        batch.update(friendDoc.ref, {
          isVisible: visibleFriendIds.includes(friendDoc.id),
        });
      });
      await batch.commit();
    }

    /* ── 3. LINE Push: 自分のトークルームに通知 ── */
    if (isHima) {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      const name = displayName || 'ユーザー';

      // デバッグ: 送信先とメッセージ形式をログ出力
      console.log(`[DEBUG] Self push to userId: "${userId}"`);
      console.log(`[DEBUG] LIFF ID: "${liffId}"`);

      // まずシンプルなテキストメッセージで確認
      const selfResult = await pushMessage(userId, [
        { type: 'text', text: `${name}さんはイマヒマしてます！` },
      ]);
      console.log(`[DEBUG] Self push result: ${selfResult}`);

      /* ── 4. LINE Push: 公開対象の友達に通知 ── */
      if (Array.isArray(visibleFriendIds) && visibleFriendIds.length > 0) {
        const notification = buildHimaNotification(name, liffId);

        const pushPromises = visibleFriendIds.map((friendId) =>
          pushMessage(friendId, [notification])
        );

        const results = await Promise.allSettled(pushPromises);
        const failedCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)).length;

        if (failedCount > 0) {
          console.warn(`${failedCount}/${visibleFriendIds.length} friend push messages failed`);
        }
      }
    }

    return res.status(200).json({
      success: true,
      isHima,
      notifiedSelf: isHima,
      notifiedFriends: isHima ? (visibleFriendIds?.length ?? 0) : 0,
    });
  } catch (err) {
    console.error('notify API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
