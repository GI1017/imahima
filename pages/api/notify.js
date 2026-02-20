import { db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId, displayName, groupId, visibleTo } = req.body;

  try {
    // 公開範囲に設定された友達全員に通知を送る
    for (const friendDocId of visibleTo) {
      // FirestoreからfriendDocIdのドキュメントを取得
      const friendRef = doc(db, "users", friendDocId);
      const friendSnap = await getDoc(friendRef);
      
      if (!friendSnap.exists()) {
        console.error(`ユーザーが見つかりません: ${friendDocId}`);
        continue;
      }
      
      const friendData = friendSnap.data();
      const friendUserId = friendData.userId; // 実際のLINE userId

      const message = {
        to: friendUserId,
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
        console.error(`通知送信失敗 (${friendUserId}):`, await response.text());
      } else {
        console.log(`通知送信成功 (${friendUserId})`);
      }
    }

    res.status(200).json({ message: "通知を送りました" });
  } catch (error) {
    console.error("通知エラー:", error);
    res.status(500).json({ message: "通知に失敗しました" });
  }
}