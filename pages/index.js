import { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "../lib/firebase";
import { doc, setDoc, onSnapshot, collection } from "firebase/firestore";

export default function Home() {
  const [profile, setProfile] = useState(null);
  const [isHima, setIsHima] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const userProfile = await liff.getProfile();
        setProfile(userProfile);

        // Firestoreでこのユーザーの状態をリアルタイム監視
        const userRef = doc(db, "users", userProfile.userId);
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setIsHima(docSnap.data().isHima || false);
          }
        });

        // 全ユーザーの状態をリアルタイム監視
        onSnapshot(collection(db, "users"), (snapshot) => {
          const userList = snapshot.docs
            .map((d) => d.data())
            .filter((u) => u.userId !== userProfile.userId);
          setFriends(userList);
        });

        setLoading(false);
      } catch (error) {
        console.error("LIFF初期化エラー:", error);
        setLoading(false);
      }
    };
    initLiff();
  }, []);

  const toggleHima = async () => {
    if (!profile) return;
    const newStatus = !isHima;
    setIsHima(newStatus);

    // Firestoreに保存
    await setDoc(doc(db, "users", profile.userId), {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      isHima: newStatus,
      updatedAt: new Date(),
    });

    // 暇になったらLINE通知を送る
    if (newStatus) {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.userId,
          displayName: profile.displayName,
        }),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500 text-lg">読み込み中...</p>
      </div>
    );
  }

  const himaFriends = friends.filter((f) => f.isHima);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-center text-green-600 mb-8">
        イマヒマ。
      </h1>

      {/* 自分のステータス */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6 text-center">
        {profile && (
          <img
            src={profile.pictureUrl}
            alt="プロフィール"
            className="w-16 h-16 rounded-full mx-auto mb-3"
          />
        )}
        <p className="text-gray-700 font-medium mb-4">
          {profile?.displayName}
        </p>
        <button
          onClick={toggleHima}
          className={`w-full py-4 rounded-xl text-white text-xl font-bold transition-all ${
            isHima
              ? "bg-green-500 hover:bg-green-600"
              : "bg-gray-300 hover:bg-gray-400"
          }`}
        >
          {isHima ? "🟢 今ヒマ！" : "⚫ ヒマじゃない"}
        </button>
      </div>

      {/* ヒマな人一覧 */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">
          今ヒマな人 ({himaFriends.length}人)
        </h2>
        {himaFriends.length === 0 ? (
          <p className="text-gray-400 text-center py-4">
            今ヒマな人はいません
          </p>
        ) : (
          <ul className="space-y-3">
            {himaFriends.map((friend) => (
              <li
                key={friend.userId}
                className="flex items-center gap-3"
              >
                <img
                  src={friend.pictureUrl}
                  alt={friend.displayName}
                  className="w-10 h-10 rounded-full"
                />
                <span className="text-gray-700">{friend.displayName}</span>
                <span className="ml-auto text-green-500 font-bold">ヒマ</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}