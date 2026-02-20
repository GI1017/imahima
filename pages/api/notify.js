import { db } from "../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId, displayName, groupId, visibleTo } = req.body;

  try {
    // 公開範囲に設定された友達全員に通知を送る
    for (const friendId of visibleTo) {
      const message = {
        to: friendId,
        messages: [
          {
            type: "text",
            text: `🟢 ${displayName}さんが今ヒマになりました！`,
          },
        ],
      };

      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error(`通知送信失敗 (${friendId}):`, await response.text());
      }
    }

    res.status(200).json({ message: "通知を送りました" });
  } catch (error) {
    console.error("通知エラー:", error);
    res.status(500).json({ message: "通知に失敗しました" });
  }
}