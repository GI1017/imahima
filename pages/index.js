import { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "../lib/firebase";
import { doc, setDoc, onSnapshot, collection, getDoc } from "firebase/firestore";

export default function Home() {
  const [profile, setProfile] = useState(null);
  const [isHima, setIsHima] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null); // グループID
  const [step, setStep] = useState("loading"); // loading / onboarding / main

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

        // Firestoreでこのユーザーの情報を確認
        const userRef = doc(db, "users", userProfile.userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists() || !userSnap.data().groupId) {
          // 初回 or グループ未設定 → オンボーディング
          setStep("onboarding");
          setLoading(false);
          return;
        }

        const groupId = userSnap.data().groupId;
        setGroup(groupId);
        setStep("main");

        // 自分の状態をリアルタイム監視
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setIsHima(docSnap.data().isHima || false);
          }
        });

        // 同じグループのユーザーをリアルタイム監視
        onSnapshot(collection(db, "users"), (snapshot) => {
          const userList = snapshot.docs
            .map((d) => d.data())
            .filter((u) => u.userId !== userProfile.userId && u.groupId === groupId);
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

  // 友達を招待する
  const inviteFriends = async () => {
    if (!profile) return;

    // グループIDを作成（自分のuserIdをベースに）
    const groupId = profile.userId;

    // 自分をFirestoreに登録
    await setDoc(doc(db, "users", profile.userId), {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      isHima: false,
      groupId: groupId,
      updatedAt: new Date(),
    });

    // Share Target Pickerで友達を選んで招待メッセージを送る
    if (liff.isApiAvailable("shareTargetPicker")) {
      await liff.shareTargetPicker([
        {
          type: "text",
          text: `🟢 ${profile.displayName} さんがイマヒマ。に招待しています！\n\n「今暇」を友達同士でシェアするアプリです。\n\n以下のURLから参加してください👇\nhttps://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}?groupId=${groupId}`,
        },
      ]);
    }

    setGroup(groupId);
    setStep("main");

    // グループのメンバーをリアルタイム監視
    onSnapshot(collection(db, "users"), (snapshot) => {
      const userList = snapshot.docs
        .map((d) => d.data())
        .filter((u) => u.userId !== profile.userId && u.groupId === groupId);
      setFriends(userList);
    });
  };

  // 暇ステータスの切り替え
  const toggleHima = async () => {
    if (!profile) return;
    const newStatus = !isHima;
    setIsHima(newStatus);
    await setDoc(doc(db, "users", profile.userId), {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      isHima: newStatus,
      groupId: group,
      updatedAt: new Date(),
    });
  };

  // ローディング画面
  if (loading || step === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500 text-lg">読み込み中...</p>
      </div>
    );
  }

  // オンボーディング画面
  if (step === "onboarding") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-green-600 mb-4">イマヒマ。</h1>
        <p className="text-gray-600 text-center mb-8">
          友達同士で「今暇」をシェアするアプリです。<br />
          一緒に使う友達を招待しましょう！
        </p>
        {profile && (
          <img
            src={profile.pictureUrl}
            alt="プロフィール"
            className="w-20 h-20 rounded-full mb-4"
          />
        )}
        <p className="text-gray-700 font-medium mb-8">{profile?.displayName}</p>
        <button
          onClick={inviteFriends}
          className="w-full max-w-sm py-4 bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-xl"
        >
          友達を招待する 👥
        </button>
      </div>
    );
  }

  // メイン画面
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
        <p className="text-gray-700 font-medium mb-4">{profile?.displayName}</p>
        <button
          onClick={toggleHima}
          className={`w-full py-4 rounded-xl text-white text-xl font-bold transition-all ${
            isHima ? "bg-green-500 hover:bg-green-600" : "bg-gray-300 hover:bg-gray-400"
          }`}
        >
          {isHima ? "🟢 今ヒマ！" : "⚫ ヒマじゃない"}
        </button>
      </div>

      {/* ヒマな人一覧 */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">
          今ヒマな人 ({himaFriends.length}人)
        </h2>
        {himaFriends.length === 0 ? (
          <p className="text-gray-400 text-center py-4">今ヒマな人はいません</p>
        ) : (
          <ul className="space-y-3">
            {himaFriends.map((friend) => (
              <li key={friend.userId} className="flex items-center gap-3">
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

      {/* 友達を追加招待するボタン */}
      <button
        onClick={inviteFriends}
        className="w-full py-3 bg-white border border-green-500 text-green-500 font-bold rounded-xl"
      >
        ＋ 友達を招待する
      </button>
    </div>
  );
}