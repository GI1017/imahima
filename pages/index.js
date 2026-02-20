import { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "../lib/firebase";
import { doc, setDoc, onSnapshot, collection, getDoc, updateDoc } from "firebase/firestore";

export default function Home() {
  const [profile, setProfile] = useState(null);
  const [isHima, setIsHima] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("loading");
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

        const urlParams = new URLSearchParams(window.location.search);
        const inviteGroupId = urlParams.get("groupId");

        const userRef = doc(db, "users", userProfile.userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          if (inviteGroupId) {
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
          const userData = userSnap.data();
          setIsHima(userData.isHima || false);
          setVisibleTo(userData.visibleTo || []);
          setStep("main");
        }

        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setIsHima(data.isHima || false);
            setVisibleTo(data.visibleTo || []);
          }
        });

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

  const turnOffHima = async () => {
    if (!profile) return;
    await updateDoc(doc(db, "users", profile.userId), {
      isHima: false,
      updatedAt: new Date(),
    });
    setIsHima(false);
  };

  const openSettings = () => {
    setStep("settings");
  };

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
    setShowToast("暇状態を公開しました。");
    setTimeout(() => setShowToast(null), 3000);
  };

  if (loading || step === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500 text-lg">読み込み中...</p>
      </div>
    );
  }

  if (step === "onboarding") {
    return (
      <div className="min-h-screen bg-[#00C300] flex flex-col items-center justify-between p-6 text-white">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-bold mb-12">
            イマヒマ。を<br />始めましょう！<br />あなたは今暇ですか？
          </h1>
          <div className="relative w-full max-w-md h-64 mb-12">
            <svg viewBox="0 0 300 200" className="w-full h-full">
              {/* シロクマ1 */}
              <ellipse cx="220" cy="80" rx="60" ry="45" fill="white" />
              <ellipse cx="200" cy="75" rx="3" ry="3" fill="black" />
              <ellipse cx="210" cy="78" rx="2" ry="1" fill="black" />
              <path d="M 205 82 Q 210 85 215 82" stroke="black" strokeWidth="1.5" fill="none" />
              <ellipse cx="185" cy="65" rx="12" ry="15" fill="white" />
              <ellipse cx="235" cy="65" rx="12" ry="15" fill="white" />
              
              {/* シロクマ2 */}
              <ellipse cx="100" cy="130" rx="70" ry="50" fill="white" />
              <ellipse cx="75" cy="125" rx="3" ry="3" fill="black" />
              <ellipse cx="90" cy="128" rx="2" ry="1" fill="black" />
              <path d="M 80 132 Q 85 135 90 132" stroke="black" strokeWidth="1.5" fill="none" />
              <ellipse cx="55" cy="115" rx="15" ry="18" fill="white" />
              <ellipse cx="115" cy="115" rx="15" ry="18" fill="white" />
              
              {/* 雪の結晶 */}
              <g transform="translate(50, 50)">
                <line x1="0" y1="-10" x2="0" y2="10" stroke="white" strokeWidth="2" />
                <line x1="-10" y1="0" x2="10" y2="0" stroke="white" strokeWidth="2" />
                <line x1="-7" y1="-7" x2="7" y2="7" stroke="white" strokeWidth="2" />
                <line x1="-7" y1="7" x2="7" y2="-7" stroke="white" strokeWidth="2" />
              </g>
              <g transform="translate(180, 150)">
                <line x1="0" y1="-8" x2="0" y2="8" stroke="white" strokeWidth="2" />
                <line x1="-8" y1="0" x2="8" y2="0" stroke="white" strokeWidth="2" />
                <line x1="-6" y1="-6" x2="6" y2="6" stroke="white" strokeWidth="2" />
                <line x1="-6" y1="6" x2="6" y2="-6" stroke="white" strokeWidth="2" />
              </g>
              <g transform="translate(260, 120)">
                <line x1="0" y1="-6" x2="0" y2="6" stroke="white" strokeWidth="1.5" />
                <line x1="-6" y1="0" x2="6" y2="0" stroke="white" strokeWidth="1.5" />
                <line x1="-4" y1="-4" x2="4" y2="4" stroke="white" strokeWidth="1.5" />
                <line x1="-4" y1="4" x2="4" y2="-4" stroke="white" strokeWidth="1.5" />
              </g>
            </svg>
          </div>
        </div>
        <div className="w-full max-w-md space-y-4">
          <button
            onClick={() => completeOnboarding(true)}
            className="w-full py-4 bg-white text-[#00C300] text-lg font-bold rounded-lg"
          >
            イマヒマ。
          </button>
          <button
            onClick={() => completeOnboarding(false)}
            className="w-full py-4 bg-transparent border-2 border-white text-white text-lg font-bold rounded-lg"
          >
            ヒマじゃない
          </button>
          <p className="text-sm text-white text-center opacity-90">
            暇な状態は1時間たつと自動的に解除されます。
          </p>
        </div>
      </div>
    );
  }

  if (step === "settings") {
    return <SettingsScreen friends={friends} visibleTo={visibleTo} onSave={saveVisibleToAndTurnOn} onBack={() => setStep("main")} />;
  }

  const himaFriends = friends.filter((f) => f.isHima && f.visibleTo?.includes(profile?.userId));
  const notHimaFriends = friends.filter((f) => !f.isHima || !f.visibleTo?.includes(profile?.userId));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-[#00C300] text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {showToast}
        </div>
      )}

      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-3xl font-bold text-[#00C300]">イマヒマ。</h1>
        <button className="text-2xl text-gray-400">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-normal text-gray-700">イマヒマ。な友達</h2>
        </div>

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
                  <span className="text-gray-900">{friend.displayName}</span>
                </div>
                <button className="text-sm text-blue-500">トークする</button>
              </li>
            ))}
          </ul>
        )}

        <h3 className="text-base font-normal text-gray-700 mb-4">ヒマじゃない友達</h3>
        {notHimaFriends.length === 0 ? (
          <p className="text-gray-400 text-center py-4">ヒマじゃない友達がいません</p>
        ) : (
          <ul className="space-y-3 mb-8">
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

        <button
          onClick={inviteFriends}
          className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg mb-4"
        >
          友達を招待する 👥
        </button>
      </div>

      <div className="bg-[#00C300] rounded-t-3xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {profile && (
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <img
                  src={profile.pictureUrl}
                  alt={profile.displayName}
                  className="w-10 h-10 rounded-full"
                />
              </div>
            )}
            <div>
              <p className="text-sm">{profile?.displayName}さん！</p>
              <p className="text-xs opacity-90">
                {isHima ? "イマヒマ。しています。" : "今の状況はどうですか？"}
              </p>
            </div>
          </div>
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <div className="text-2xl">🐻</div>
          </div>
        </div>
        {isHima ? (
          <button
            onClick={turnOffHima}
            className="w-full py-3 bg-white text-gray-700 font-bold rounded-lg"
          >
            ヒマじゃなくなった
          </button>
        ) : (
          <button
            onClick={openSettings}
            className="w-full py-3 bg-white text-[#00C300] font-bold rounded-lg"
          >
            イマヒマ。
          </button>
        )}
      </div>
    </div>
  );
}

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
        <button onClick={onBack} className="text-2xl text-[#00C300]">←</button>
        <h1 className="text-xl font-bold text-gray-900">暇状態の公開範囲を設定</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {friends.length === 0 ? (
          <p className="text-gray-400 text-center py-8">友達がまだいません</p>
        ) : (
          <ul className="space-y-4">
            {friends.map((friend) => (
              <li key={friend.userId} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <img
                    src={friend.pictureUrl}
                    alt={friend.displayName}
                    className="w-10 h-10 rounded-full"
                  />
                  <span className="text-gray-900">{friend.displayName}</span>
                </div>
                <button
                  onClick={() => toggleFriend(friend.userId)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    selected.includes(friend.userId) ? "bg-[#00C300]" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      selected.includes(friend.userId) ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="p-4">
        <button
          onClick={() => onSave(selected)}
          className="w-full py-4 bg-[#00C300] text-white font-bold rounded-lg"
        >
          暇状態を公開する
        </button>
      </div>
    </div>
  );
}