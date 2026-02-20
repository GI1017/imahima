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
          const newGroupId = inviteGroupId || userProfile.userId;
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
      setShowToast("暇状態を公開しました。");
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
          groupId,
          visibleTo: selectedFriends,
        }),
      });
    }

    setStep("main");
    setShowToast("暇状態を公開しました。");
    setTimeout(() => setShowToast(null), 3000);
  };

  // --- Loading ---
  if (loading || step === "loading") {
    return (
      <div style={s.loadingScreen}>
        <p style={s.loadingText}>読み込み中...</p>
      </div>
    );
  }

  // --- Onboarding (03-01) ---
  if (step === "onboarding") {
    return (
      <div style={s.onboardingScreen}>
        <div style={s.onboardingTitleArea}>
          <p style={s.onboardingTitle}>
            イマヒマ。を<br />始めましょう！<br />あなたは今暇ですか？
          </p>
        </div>

        {/* イラスト: 残り高さをすべて使いフッターに合わせてフレキシブル */}
        <div style={s.onboardingIllustArea}>
          <img
            src="/images/onboarding-bears.svg"
            alt="イマヒマ。イラスト"
            style={s.onboardingIllust}
          />
        </div>

        {/* フッター固定 */}
        <div style={s.onboardingFooter}>
          <button onClick={() => completeOnboarding(true)} style={s.onboardingBtnPrimary}>
            イマヒマ。
          </button>
          <button onClick={() => completeOnboarding(false)} style={s.onboardingBtnOutline}>
            ヒマじゃない
          </button>
          <p style={s.onboardingNote}>暇な状態は1時間たつと自動的に解除されます。</p>
        </div>
      </div>
    );
  }

  // --- Settings (07-01) ---
  if (step === "settings") {
    return (
      <SettingsScreen
        friends={friends}
        visibleTo={visibleTo}
        onSave={saveVisibleToAndTurnOn}
        onBack={() => setStep("main")}
      />
    );
  }

  // --- Main (05-01) ---
  const himaFriends = friends.filter(
    (f) => f.isHima && f.visibleTo?.includes(profile?.userId)
  );
  const notHimaFriends = friends.filter(
    (f) => !f.isHima || !f.visibleTo?.includes(profile?.userId)
  );

  return (
    <div style={s.mainScreen}>
      {showToast && <Toast message={showToast} />}

      {/* ヘッダー: 上部固定 */}
      <div style={s.mainHeader}>
        <div style={s.navBtn} />
        <img src="/images/logo.svg" alt="イマヒマ。" style={s.logoImg} />
        <button style={s.navBtn}>
          <img src="/icons/close.svg" alt="閉じる" style={s.iconImg} />
        </button>
      </div>

      {/* ヘッダー高さ分スペーサー */}
      <div style={s.mainHeaderSpacer} />
      <div style={s.mainDivider} />

      {/* リスト: フッターにかぶらないようpaddingBottom確保 */}
      <div style={s.mainList}>
        <div style={s.friendSection}>
          <p style={s.sectionLabel}>イマヒマ。な友達</p>
          {himaFriends.length === 0 ? (
            <p style={s.emptyText}>今ヒマな人はいません</p>
          ) : (
            himaFriends.map((friend) => (
              <FriendRow key={friend.userId} friend={friend} actionLabel="トークする" onAction={() => {}} />
            ))
          )}
        </div>

        <div style={s.friendSection}>
          <p style={s.sectionLabel}>ヒマじゃない友達</p>
          {notHimaFriends.length === 0 ? (
            <p style={s.emptyText}>ヒマじゃない友達がいません</p>
          ) : (
            notHimaFriends.map((friend) => (
              <FriendRow key={friend.userId} friend={friend} />
            ))
          )}
        </div>

        <button onClick={inviteFriends} style={s.inviteBtn}>
          <span style={s.inviteBtnText}>友達を招待する</span>
          <img src="/icons/person_search.svg" alt="" style={s.iconImg} />
        </button>
      </div>

      {/* フッター: 下部固定・フロート */}
      <div style={s.footer}>
        <div style={s.footerMe}>
          {/* アバターのみ（user name表示削除） */}
          {profile && (
            <img src={profile.pictureUrl} alt={profile.displayName} style={s.footerAvatar} />
          )}
          {/* テキスト: 右揃え */}
          <div style={s.footerMeText}>
            {isHima ? (
              <p style={s.footerMeTextLine}>{profile?.displayName}さんはイマヒマ。しています。</p>
            ) : (
              <>
                <p style={s.footerMeTextLine}>{profile?.displayName}さん！</p>
                <p style={s.footerMeTextLine}>今の状況はどうですか？</p>
              </>
            )}
          </div>
          {/* マスコット */}
          <div style={s.footerMascotCircle}>
            <img
              src={isHima ? "/images/mascot-bear-hima.svg" : "/images/mascot-bear-nothima.svg"}
              alt="マスコット"
              style={s.footerMascotImg}
            />
          </div>
        </div>

        {isHima ? (
          <button onClick={turnOffHima} style={s.footerBtnWhite}>
            <span style={s.footerBtnDefaultText}>ヒマじゃなくなった</span>
          </button>
        ) : (
          <button onClick={() => setStep("settings")} style={s.footerBtnWhite}>
            <span style={s.footerBtnGreenText}>イマヒマ。</span>
          </button>
        )}
      </div>
    </div>
  );
}

// --- Settings (07-01) ---
function SettingsScreen({ friends, visibleTo, onSave, onBack }) {
  const [selected, setSelected] = useState(visibleTo);

  const toggleFriend = (userId) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div style={s.settingsScreen}>
      {/* ヘッダー: 上部固定 */}
      <div style={s.settingsHeader}>
        <button onClick={onBack} style={s.navBtn}>
          <img src="/icons/arrow_back_ios_new.svg" alt="戻る" style={s.iconImgGreen} />
        </button>
        <img src="/images/logo.svg" alt="イマヒマ。" style={s.logoImg} />
        <div style={s.navBtn} />
      </div>

      <div style={s.settingsHeaderSpacer} />

      <div style={s.settingsTitleArea}>
        <p style={s.settingsTitle}>暇状態の公開範囲を設定</p>
      </div>

      <div style={s.settingsList}>
        {friends.length === 0 ? (
          <p style={s.emptyText}>友達がまだいません</p>
        ) : (
          friends.map((friend) => (
            <div key={friend.userId} style={s.settingsRow}>
              <img src={friend.pictureUrl} alt={friend.displayName} style={s.friendAvatar} />
              <span style={s.friendName}>{friend.displayName}</span>
              <button
                onClick={() => toggleFriend(friend.userId)}
                style={{
                  ...s.toggle,
                  backgroundColor: selected.includes(friend.userId) ? "#22c55e" : "#71717a",
                }}
              >
                <div
                  style={{
                    ...s.toggleThumb,
                    transform: selected.includes(friend.userId) ? "translateX(20px)" : "translateX(2px)",
                  }}
                />
              </button>
            </div>
          ))
        )}
      </div>

      {/* フッター: 下部固定 */}
      <div style={s.settingsFooter}>
        <button onClick={() => onSave(selected)} style={s.greenBtn}>
          <span style={s.greenBtnText}>暇状態を公開する</span>
        </button>
      </div>
    </div>
  );
}

// --- Sub Components ---
function FriendRow({ friend, actionLabel, onAction }) {
  return (
    <div style={s.friendRow}>
      <img src={friend.pictureUrl} alt={friend.displayName} style={s.friendAvatar} />
      <span style={s.friendName}>{friend.displayName}</span>
      {actionLabel && (
        <button onClick={onAction} style={s.friendActionBtn}>{actionLabel}</button>
      )}
    </div>
  );
}

function Toast({ message }) {
  return (
    <div style={s.toastWrapper}>
      <div style={s.toast}>
        <p style={s.toastText}>{message}</p>
      </div>
    </div>
  );
}

// --- Design Tokens ---
const font = {
  fontFamily: "'Noto Sans JP', sans-serif",
  fontSize: "16px",
  lineHeight: "1.75",
  letterSpacing: "0.48px",
};

const HEADER_HEIGHT = 84;   // padding 20px × 2 + icon 44px
const FOOTER_HEIGHT = 190;  // フッターの概算高さ

const s = {
  // Loading
  loadingScreen: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#fafafa" },
  loadingText: { ...font, color: "#71717a" },

  // Onboarding
  onboardingScreen: { height: "100vh", backgroundColor: "#22c55e", display: "flex", flexDirection: "column", overflow: "hidden" },
  onboardingTitleArea: { padding: "16px", flexShrink: 0 },
  onboardingTitle: {
    fontFamily: "'Noto Sans JP', sans-serif", fontSize: "40px", fontWeight: "600",
    lineHeight: "1.5", letterSpacing: "0.6px", color: "#ffffff", margin: 0,
  },
  onboardingIllustArea: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", overflow: "hidden", minHeight: 0 },
  onboardingIllust: { width: "100%", height: "100%", objectFit: "contain", maxWidth: "320px" },
  onboardingFooter: { flexShrink: 0, padding: "16px", display: "flex", flexDirection: "column", gap: "16px" },
  onboardingBtnPrimary: {
    width: "100%", backgroundColor: "#ffffff", border: "none", borderRadius: "8px", padding: "10px 16px",
    fontFamily: "'Noto Sans JP', sans-serif", fontSize: "16px", fontWeight: "500", lineHeight: "1.75",
    letterSpacing: "0.48px", color: "#16a34a", textAlign: "center", cursor: "pointer",
  },
  onboardingBtnOutline: {
    width: "100%", backgroundColor: "transparent", border: "2px solid #fafafa", borderRadius: "8px", padding: "10px 16px",
    fontFamily: "'Noto Sans JP', sans-serif", fontSize: "16px", fontWeight: "500", lineHeight: "1.75",
    letterSpacing: "0.48px", color: "#ffffff", textAlign: "center", cursor: "pointer",
  },
  onboardingNote: { ...font, color: "#ffffff", margin: 0 },

  // Main
  mainScreen: { height: "100vh", backgroundColor: "#ffffff", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" },
  mainHeader: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 16px", backgroundColor: "#ffffff",
  },
  mainHeaderSpacer: { height: HEADER_HEIGHT, flexShrink: 0 },
  mainDivider: { height: "1px", backgroundColor: "#d4d4d8", flexShrink: 0 },
  mainList: {
    flex: 1, overflowY: "auto", padding: "16px",
    paddingBottom: `${FOOTER_HEIGHT + 16}px`,
    display: "flex", flexDirection: "column", gap: "32px",
  },

  logoImg: { height: "38px", width: "auto" }, // 48 × 0.8 = 38.4
  navBtn: { width: "40px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", background: "none", border: "none", cursor: "pointer", flexShrink: 0 },
  iconImg: { width: "24px", height: "24px" },
  iconImgGreen: { width: "24px", height: "24px", filter: "invert(48%) sepia(79%) saturate(476%) hue-rotate(86deg) brightness(118%) contrast(119%)" },

  friendSection: { display: "flex", flexDirection: "column", gap: "8px" },
  sectionLabel: { ...font, fontWeight: "500", color: "#71717a", margin: 0 },
  emptyText: { ...font, color: "#71717a", textAlign: "center", margin: 0, padding: "8px 0" },
  friendRow: { display: "flex", alignItems: "center", gap: "8px", height: "54px", padding: "8px" },
  friendAvatar: { width: "40px", height: "40px", borderRadius: "9999px", objectFit: "cover", flexShrink: 0 },
  friendName: { ...font, color: "#27272a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  friendActionBtn: { ...font, color: "#27272a", background: "none", border: "none", cursor: "pointer", padding: "10px 16px", flexShrink: 0 },

  inviteBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 32px 10px 16px", border: "2px solid #d4d4d8", borderRadius: "8px", backgroundColor: "#ffffff", cursor: "pointer" },
  inviteBtnText: { ...font, fontWeight: "500", color: "#27272a" },

  // Toast: 1行表示
  toastWrapper: { position: "fixed", top: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 50 },
  toast: { backgroundColor: "#dcfce7", borderRadius: "8px", padding: "8px 12px", boxShadow: "0px 0px 32px 0px rgba(0,0,0,0.25)", whiteSpace: "nowrap" },
  toastText: { ...font, color: "#15803d", textAlign: "center", margin: 0, whiteSpace: "nowrap" },

  // Footer: 下部固定・フロート
  footer: {
    position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: "#22c55e", borderTopLeftRadius: "24px", borderTopRightRadius: "24px",
    boxShadow: "0px 0px 24px 0px rgba(0,0,0,0.25)", padding: "24px 16px",
    display: "flex", flexDirection: "column", gap: "16px", alignItems: "center",
  },
  footerMe: { display: "flex", alignItems: "center", gap: "8px", padding: "8px", width: "100%" },
  footerAvatar: { width: "40px", height: "40px", borderRadius: "9999px", objectFit: "cover", flexShrink: 0 },
  // テキスト: flex:1で右に寄せる
  footerMeText: { display: "flex", flexDirection: "column", flex: 1, alignItems: "flex-end" },
  footerMeTextLine: { ...font, color: "#ffffff", margin: 0, whiteSpace: "nowrap" },
  footerMascotCircle: { width: "81px", height: "81px", borderRadius: "9999px", backgroundColor: "#e4e4e7", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  footerMascotImg: { width: "100%", height: "100%", objectFit: "cover" },
  footerBtnWhite: { width: "100%", backgroundColor: "#ffffff", border: "none", borderRadius: "8px", padding: "10px 16px", cursor: "pointer", textAlign: "center" },
  footerBtnDefaultText: { ...font, fontWeight: "500", color: "#27272a" },
  footerBtnGreenText: { ...font, fontWeight: "500", color: "#16a34a" },

  // Settings
  settingsScreen: { height: "100vh", backgroundColor: "#ffffff", display: "flex", flexDirection: "column", overflow: "hidden" },
  settingsHeader: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 16px", backgroundColor: "#ffffff",
  },
  settingsHeaderSpacer: { height: HEADER_HEIGHT, flexShrink: 0 },
  settingsTitleArea: { padding: "16px", flexShrink: 0 },
  settingsTitle: {
    fontFamily: "'Noto Sans JP', sans-serif",
    fontSize: "24px", // 40px → 24px
    fontWeight: "600", lineHeight: "1.5", letterSpacing: "0.6px", color: "#27272a", margin: 0,
  },
  settingsList: { flex: 1, overflowY: "auto", padding: "16px", paddingBottom: "100px", borderTop: "2px solid #d4d4d8", display: "flex", flexDirection: "column" },
  settingsRow: { display: "flex", alignItems: "center", gap: "8px", height: "54px", padding: "8px" },
  toggle: { position: "relative", width: "52px", height: "32px", borderRadius: "9999px", border: "none", cursor: "pointer", flexShrink: 0, transition: "background-color 0.2s", padding: "2px 4px" },
  toggleThumb: { position: "absolute", top: "4px", width: "24px", height: "24px", borderRadius: "9999px", backgroundColor: "#ffffff", transition: "transform 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" },
  settingsFooter: { position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "16px", backgroundColor: "#ffffff" },
  greenBtn: { width: "100%", backgroundColor: "#22c55e", border: "none", borderRadius: "8px", padding: "10px 16px", cursor: "pointer", textAlign: "center" },
  greenBtnText: { ...font, fontWeight: "500", color: "#fafafa" },
};