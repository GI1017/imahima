export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { displayName } = req.body;

  try {
    // Firestoreから全ユーザーのuserIdを取得して通知を送る
    const message = {
      to: req.body.userId,
      messages: [
        {
          type: "text",
          text: `🟢 ${displayName} さんが今ヒマになりました！`,
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
      throw new Error("LINE API error");
    }

    res.status(200).json({ message: "通知を送りました" });
  } catch (error) {
    console.error("通知エラー:", error);
    res.status(500).json({ message: "通知に失敗しました" });
  }
}