import { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "../lib/firebase";
import { doc, setDoc, onSnapshot, collection, getDoc, updateDoc } from "firebase/firestore";

export default function Home() {
  const [profile, setProfile] = useState(null);
  const [isHima, setIsHima] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("loading"); // loading / onboarding / main / settings
  const [showToast, setShowToast] = useState(null);
  const [visibleTo, setVisibleTo] = useState([]);

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

        // URLパラメータでグループIDを取得（招待リンク経由）
        const urlParams = new URLSearchParams(window.location.search);
        const inviteGroupId = urlParams.get("groupId");

        // Firestoreでユーザー情報を確認
        const userRef = doc(db, "users", userProfile.userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // 初回登録
          if (inviteGroupId) {
            // 招待リンク経由 → グループに自動参加してオンボーディング
            await setDoc(userRef, {
              userId: userProfile.userId,
              displayName: userProfile.displayName,
              pictureUrl: userProfile.pictureUrl,
              isHima: false,
              groupId: inviteGroupId,
              visibleTo: [],
              updatedAt: new Date(),
            });
            setStep("onboarding");
          } else {
            // 直接アクセス → 自分のuserIdをgroupIdにしてオンボーディング
            const newGroupId = userProfile.userId;
            await setDoc(userRef, {
              userId: userProfile.userId,
              displayName: userProfile.displayName,
              pictureUrl: userProfile.pictureUrl,
              isHima: false,
              groupId: newGroupId,
              visibleTo: [],
              updatedAt: new Date(),
            });
            setStep("onboarding");
          }
        } else {
          // 既存ユーザー → メイン画面へ
          const userData = userSnap.data();
          setIsHima(userData.isHima || false);
          setVisibleTo(userData.visibleTo || []);
          setStep("main");
        }

        // 自分の状態をリアルタイム監視
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setIsHima(data.isHima || false);
            setVisibleTo(data.visibleTo || []);
          }
        });

        // 同じグループのユーザーをリアルタイム監視
        onSnapshot(collection(db, "users"), (snapshot) => {
          const userList = snapshot.docs
            .map((d) => d.data())
            .filter((u) => {
              if (u.userId === userProfile.userId) return false;
              const userData = userSnap.exists() ? userSnap.data() : null;
              if (!userData) return false;
              return u.groupId === userData.groupId;
            });
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

  // オンボーディングで暇状態を設定
  const completeOnboarding = async (himaStatus) => {
    if (!profile) return;
    await updateDoc(doc(db, "users", profile.userId), {
      isHima: himaStatus,
      updatedAt: new Date(),
    });
    setIsHima(himaStatus);
    setStep("main");
    
    if (himaStatus) {
      setShowToast("ヒマ状態を公開しました。");
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  // 友達を招待（シェアターゲットピッカー）
  const inviteFriends = async () => {
    if (!profile) return;
    if (liff.isApiAvailable("shareTargetPicker")) {
      try {
        const userRef = doc(db, "users", profile.userId);
        const userSnap = await getDoc(userRef);
        const groupId = userSnap.data().groupId;

        await liff.shareTargetPicker([
          {
            type: "text",
            text: `🟢 ${profile.displayName}さんがイマヒマ。に招待しています！\n\n「今暇」を友達同士でシェアするアプリです。\n\n以下のURLから参加してください👇\nhttps://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}?groupId=${groupId}`,
          },
        ]);
        setShowToast("友達にイマヒマ。への招待を送りました。");
        setTimeout(() => setShowToast(null), 3000);
      } catch (error) {
        console.error("招待エラー:", error);
      }
    }
  };

  // 暇状態をOFFにする
  const turnOffHima = async () => {
    if (!profile) return;
    await updateDoc(doc(db, "users", profile.userId), {
      isHima: false,
      updatedAt: new Date(),
    });
    setIsHima(false);
  };

  // 公開範囲設定画面を開く
  const openSettings = () => {
    setStep("settings");
  };

  // 公開範囲を保存して暇状態をON
  const saveVisibleToAndTurnOn = async (selectedFriends) => {
    if (!profile) return;
    
    const userRef = doc(db, "users", profile.userId);
    const userSnap = await getDoc(userRef);
    const groupId = userSnap.data().groupId;
    
    await updateDoc(userRef, {
      visibleTo: selectedFriends,
      isHima: true,
      updatedAt: new Date(),
    });
    
    setVisibleTo(selectedFriends);
    setIsHima(true);
    
    // 通知を送る
    if (selectedFriends.length > 0) {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.userId,
          displayName: profile.displayName,
          groupId: groupId,
          visibleTo: selectedFriends,
        }),
      });
    }
    
    setStep("main");
    setShowToast("ヒマ状態を公開しました。");
    setTimeout(() => setShowToast(null), 3000);
  };
    
    setStep("main");
    setShowToast("ヒマ状態を公開しました。");
    setTimeout(() => setShowToast(null), 3000);
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-between p-6">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-bold text-black mb-4">
            イマヒマ。を<br />始めましょう！<br />あなたは今暇ですか？
          </h1>
          <div className="bg-gray-200 w-full max-w-md h-64 flex items-center justify-center text-gray-500 rounded-lg mb-8">
            claudeくんへの指示。このページの内容似合うイラスト適当についくっていれて！
          </div>
        </div>
        <div className="w-full max-w-md space-y-4">
          <button
            onClick={() => completeOnboarding(true)}
            className="w-full py-4 bg-gray-800 text-white text-lg font-bold rounded-lg"
          >
            イマヒマ。
          </button>
          <button
            onClick={() => completeOnboarding(false)}
            className="w-full py-4 bg-white border border-gray-300 text-gray-800 text-lg font-bold rounded-lg"
          >
            ヒマじゃない
          </button>
          <p className="text-sm text-gray-500 text-center">
            暇な状態は1時間たつと自動的に解除されます。
          </p>
        </div>
      </div>
    );
  }

  // 公開範囲設定画面
  if (step === "settings") {
    return <SettingsScreen friends={friends} visibleTo={visibleTo} onSave={saveVisibleToAndTurnOn} onBack={() => setStep("main")} />;
  }

  // メイン画面
  const himaFriends = friends.filter((f) => f.isHima && f.visibleTo?.includes(profile?.userId));
  const notHimaFriends = friends.filter((f) => !f.isHima || !f.visibleTo?.includes(profile?.userId));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {showToast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold text-green-600">イマヒマ。</h1>
        <button className="text-2xl">×</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">イマヒマ。な友達</h2>
          <button onClick={inviteFriends} className="text-sm flex items-center gap-1">
            友達を招待 🔍
          </button>
        </div>

        {/* ヒマな友達リスト */}
        {himaFriends.length === 0 ? (
          <p className="text-gray-400 text-center py-8">今ヒマな人はいません</p>
        ) : (
          <ul className="space-y-3 mb-8">
            {himaFriends.map((friend) => (
              <li key={friend.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={friend.pictureUrl}
                    alt={friend.displayName}
                    className="w-10 h-10 rounded-full"
                  />
                  <span>{friend.displayName}</span>
                </div>
                <button className="text-sm text-gray-600">トークする</button>
              </li>
            ))}
          </ul>
        )}

        {/* ヒマじゃない友達 */}
        <h3 className="text-lg font-bold mb-4">ヒマじゃない友達</h3>
        {notHimaFriends.length === 0 ? (
          <p className="text-gray-400 text-center py-4">友達がいません</p>
        ) : (
          <ul className="space-y-3">
            {notHimaFriends.map((friend) => (
              <li key={friend.userId} className="flex items-center gap-3">
                <img
                  src={friend.pictureUrl}
                  alt={friend.displayName}
                  className="w-10 h-10 rounded-full"
                />
                <span className="text-gray-600">{friend.displayName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bottom Card */}
      <div className="border-t p-6 bg-white">
        <div className="flex items-center gap-4 mb-4">
          {profile && (
            <img
              src={profile.pictureUrl}
              alt={profile.displayName}
              className="w-12 h-12 rounded-full"
            />
          )}
          <p className="text-sm text-gray-700">
            {isHima ? `${profile?.displayName}さんはイマヒマしています。` : `${profile?.displayName}さん！今の状況はどうですか？`}
          </p>
        </div>
        {isHima ? (
          <button
            onClick={turnOffHima}
            className="w-full py-3 bg-white border border-gray-300 text-gray-800 font-bold rounded-lg"
          >
            ヒマじゃなくなった
          </button>
        ) : (
          <button
            onClick={openSettings}
            className="w-full py-3 bg-gray-800 text-white font-bold rounded-lg"
          >
            イマヒマ。
          </button>
        )}
      </div>
    </div>
  );

// 公開範囲設定画面コンポーネント
function SettingsScreen({ friends, visibleTo, onSave, onBack }) {
  const [selected, setSelected] = useState(visibleTo);

  const toggleFriend = (userId) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center gap-4 p-4 border-b">
        <button onClick={onBack} className="text-2xl">←</button>
        <h1 className="text-xl font-bold">暇状態の公開範囲を設定</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {friends.length === 0 ? (
          <p className="text-gray-400 text-center py-8">友達がまだいません</p>
        ) : (
          <ul className="space-y-4">
            {friends.map((friend) => (
              <li key={friend.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={friend.pictureUrl}
                    alt={friend.displayName}
                    className="w-10 h-10 rounded-full"
                  />
                  <span>{friend.displayName}</span>
                </div>
                <label className="relative inline-block w-12 h-6">
                  <input
                    type="checkbox"
                    checked={selected.includes(friend.userId)}
                    onChange={() => toggleFriend(friend.userId)}
                    className="sr-only peer"
                  />
                  <div className="w-full h-full bg-gray-300 rounded-full peer-checked:bg-gray-800 transition-colors"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="p-4">
        <button
          onClick={() => onSave(selected)}
          className="w-full py-4 bg-gray-800 text-white font-bold rounded-lg"
        >
          暇状態を公開する
        </button>
      </div>
    </div>
  );
}