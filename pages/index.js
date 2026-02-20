import { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "../lib/firebase";
import { doc, setDoc, onSnapshot, collection, getDoc, updateDoc } from "firebase/firestore";
import Image from "next/image";

// --- Design Tokens (Figmaより) ---
// primary: #22c55e
// text/default: #27272a
// text/tertiary: #71717a
// text/onprimary: #fafafa (白背景上の緑文字: #16a34a)
// border/strong: #d4d4d8
// fill/success bg: #dcfce7, text: #15803d
// font: Noto Sans JP
// radius/button: 8px
// radius/footer: 24px top

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

  // --- Loading ---
  if (loading || step === "loading") {
    return (
      <div style={styles.loadingScreen}>
        <p style={styles.loadingText}>読み込み中...</p>
      </div>
    );
  }

  // --- Onboarding (03-01) ---
  if (step === "onboarding") {
    return (
      <div style={styles.onboardingScreen}>
        {/* Title */}
        <div style={styles.onboardingTitleArea}>
          <p style={styles.onboardingTitle}>
            イマヒマ。を<br />始めましょう！<br />あなたは今暇ですか？
          </p>
        </div>

        {/* Illustration */}
        <div style={styles.onboardingIllustArea}>
          <img
            src="/images/onboarding-bears.svg"
            alt="イマヒマ。イラスト"
            style={styles.onboardingIllust}
          />
        </div>

        {/* Footer buttons */}
        <div style={styles.onboardingFooter}>
          <button
            onClick={() => completeOnboarding(true)}
            style={styles.onboardingBtnPrimary}
          >
            イマヒマ。
          </button>
          <button
            onClick={() => completeOnboarding(false)}
            style={styles.onboardingBtnOutline}
          >
            ヒマじゃない
          </button>
          <p style={styles.onboardingNote}>
            暇な状態は1時間たつと自動的に解除されます。
          </p>
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

  // --- Main (05-01 / 05-02 / 05-03) ---
  const himaFriends = friends.filter(
    (f) => f.isHima && f.visibleTo?.includes(profile?.userId)
  );
  const notHimaFriends = friends.filter(
    (f) => !f.isHima || !f.visibleTo?.includes(profile?.userId)
  );

  return (
    <div style={styles.mainScreen}>
      {/* Toast */}
      {showToast && <Toast message={showToast} />}

      {/* Header */}
      <div style={styles.mainHeader}>
        {/* 左: closeボタン（スペース確保） */}
        <div style={styles.navBtn} />
        {/* ロゴ */}
        <img
          src="/images/logo.svg"
          alt="イマヒマ。"
          style={styles.logoImg}
        />
        {/* 右: closeボタン */}
        <button style={styles.navBtn}>
          <img src="/icons/close.svg" alt="閉じる" style={styles.iconImg} />
        </button>
      </div>

      <div style={styles.mainDivider} />

      {/* List */}
      <div style={styles.mainList}>
        {/* イマヒマな友達 */}
        <div style={styles.friendSection}>
          <p style={styles.sectionLabel}>イマヒマ。な友達</p>
          {himaFriends.length === 0 ? (
            <p style={styles.emptyText}>今ヒマな人はいません</p>
          ) : (
            himaFriends.map((friend) => (
              <FriendRow
                key={friend.userId}
                friend={friend}
                actionLabel="トークする"
                onAction={() => {}}
              />
            ))
          )}
        </div>

        {/* ヒマじゃない友達 */}
        <div style={styles.friendSection}>
          <p style={styles.sectionLabel}>ヒマじゃない友達</p>
          {notHimaFriends.length === 0 ? (
            <p style={styles.emptyText}>ヒマじゃない友達がいません</p>
          ) : (
            notHimaFriends.map((friend) => (
              <FriendRow key={friend.userId} friend={friend} />
            ))
          )}
        </div>

        {/* 友達を招待する */}
        <button onClick={inviteFriends} style={styles.inviteBtn}>
          <span style={styles.inviteBtnText}>友達を招待する</span>
          <img src="/icons/person_search.svg" alt="" style={styles.iconImg} />
        </button>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerMe}>
          {/* 自分のアバター＋名前 */}
          <div style={styles.footerMeInfo}>
            {profile && (
              <>
                <img
                  src={profile.pictureUrl}
                  alt={profile.displayName}
                  style={styles.footerAvatar}
                />
                <p style={styles.footerAvatarName}>{profile.displayName}</p>
              </>
            )}
          </div>
          {/* テキスト */}
          <div style={styles.footerMeText}>
            <p style={styles.footerMeTextLine}>{profile?.displayName}さん！</p>
            <p style={styles.footerMeTextLine}>
              {isHima ? "イマヒマ。しています。" : "今の状況はどうですか？"}
            </p>
          </div>
          {/* マスコット */}
          <div style={styles.footerMascotCircle}>
            <img
              src={isHima ? "/images/mascot-bear-hima.svg" : "/images/mascot-bear-nothima.svg"}
              alt="マスコット"
              style={styles.footerMascotImg}
            />
          </div>
        </div>

        {isHima ? (
          <button onClick={turnOffHima} style={styles.footerBtnWhite}>
            <span style={styles.footerBtnWhiteText}>ヒマじゃなくなった</span>
          </button>
        ) : (
          <button onClick={openSettings} style={styles.footerBtnWhite}>
            <span style={styles.footerBtnGreenText}>イマヒマ。</span>
          </button>
        )}
      </div>
    </div>
  );
}

// --- Settings Screen (07-01) ---
function SettingsScreen({ friends, visibleTo, onSave, onBack }) {
  const [selected, setSelected] = useState(visibleTo);

  const toggleFriend = (userId) => {
    setSelected((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div style={styles.settingsScreen}>
      {/* Header */}
      <div style={styles.settingsHeader}>
        <button onClick={onBack} style={styles.navBtn}>
          <img src="/icons/arrow_back_ios_new.svg" alt="戻る" style={styles.iconImgGreen} />
        </button>
        <img src="/images/logo.svg" alt="イマヒマ。" style={styles.logoImg} />
        <div style={styles.navBtn} />
      </div>

      {/* Title */}
      <div style={styles.settingsTitleArea}>
        <p style={styles.settingsTitle}>暇状態の公開範囲を設定</p>
      </div>

      {/* List */}
      <div style={styles.settingsList}>
        {friends.length === 0 ? (
          <p style={styles.emptyText}>友達がまだいません</p>
        ) : (
          friends.map((friend) => (
            <div key={friend.userId} style={styles.settingsRow}>
              <img
                src={friend.pictureUrl}
                alt={friend.displayName}
                style={styles.friendAvatar}
              />
              <span style={styles.friendName}>{friend.displayName}</span>
              {/* Toggle Switch */}
              <button
                onClick={() => toggleFriend(friend.userId)}
                style={{
                  ...styles.toggle,
                  backgroundColor: selected.includes(friend.userId)
                    ? "#22c55e"
                    : "#71717a",
                }}
              >
                <div
                  style={{
                    ...styles.toggleThumb,
                    transform: selected.includes(friend.userId)
                      ? "translateX(20px)"
                      : "translateX(2px)",
                  }}
                />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer button */}
      <div style={styles.settingsFooter}>
        <button onClick={() => onSave(selected)} style={styles.greenBtn}>
          <span style={styles.greenBtnText}>暇状態を公開する</span>
        </button>
      </div>
    </div>
  );
}

// --- Sub Components ---
function FriendRow({ friend, actionLabel, onAction }) {
  return (
    <div style={styles.friendRow}>
      <img
        src={friend.pictureUrl}
        alt={friend.displayName}
        style={styles.friendAvatar}
      />
      <span style={styles.friendName}>{friend.displayName}</span>
      {actionLabel && (
        <button onClick={onAction} style={styles.friendActionBtn}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function Toast({ message }) {
  return (
    <div style={styles.toastWrapper}>
      <div style={styles.toast}>
        <p style={styles.toastText}>{message}</p>
      </div>
    </div>
  );
}

// --- Styles ---
const fontBase = {
  fontFamily: "'Noto Sans JP', sans-serif",
  fontSize: "16px",
  lineHeight: "1.75",
  letterSpacing: "0.48px",
};

const styles = {
  // Loading
  loadingScreen: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#fafafa",
  },
  loadingText: {
    ...fontBase,
    color: "#71717a",
  },

  // Onboarding (03-01)
  onboardingScreen: {
    minHeight: "100vh",
    backgroundColor: "#22c55e",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "8px",
  },
  onboardingTitleArea: {
    padding: "16px",
  },
  onboardingTitle: {
    fontFamily: "'Noto Sans JP', sans-serif",
    fontSize: "40px",
    fontWeight: "600",
    lineHeight: "1.5",
    letterSpacing: "0.6px",
    color: "#ffffff",
    whiteSpace: "pre-wrap",
    margin: 0,
  },
  onboardingIllustArea: {
    padding: "16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  onboardingIllust: {
    width: "320px",
    height: "320px",
    objectFit: "contain",
  },
  onboardingFooter: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    alignItems: "center",
  },
  onboardingBtnPrimary: {
    width: "100%",
    backgroundColor: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    fontFamily: "'Noto Sans JP', sans-serif",
    fontSize: "16px",
    fontWeight: "500",
    lineHeight: "1.75",
    letterSpacing: "0.48px",
    color: "#16a34a",
    textAlign: "center",
    cursor: "pointer",
  },
  onboardingBtnOutline: {
    width: "100%",
    backgroundColor: "transparent",
    border: "2px solid #fafafa",
    borderRadius: "8px",
    padding: "10px 16px",
    fontFamily: "'Noto Sans JP', sans-serif",
    fontSize: "16px",
    fontWeight: "500",
    lineHeight: "1.75",
    letterSpacing: "0.48px",
    color: "#ffffff",
    textAlign: "center",
    cursor: "pointer",
  },
  onboardingNote: {
    ...fontBase,
    color: "#ffffff",
    margin: 0,
    width: "100%",
  },

  // Main (05-01)
  mainScreen: {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  mainHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 16px",
  },
  mainDivider: {
    height: "1px",
    backgroundColor: "#d4d4d8",
    margin: "0",
  },
  mainList: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "32px",
  },

  // Logo
  logoImg: {
    height: "48px",
    width: "auto",
  },

  // Nav button
  navBtn: {
    width: "40px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  iconImg: {
    width: "24px",
    height: "24px",
  },
  iconImgGreen: {
    width: "24px",
    height: "24px",
    filter: "invert(48%) sepia(79%) saturate(476%) hue-rotate(86deg) brightness(118%) contrast(119%)",
  },

  // Friend sections
  friendSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sectionLabel: {
    ...fontBase,
    fontWeight: "500",
    color: "#71717a",
    margin: 0,
  },
  emptyText: {
    ...fontBase,
    color: "#71717a",
    textAlign: "center",
    margin: 0,
    padding: "8px 0",
  },
  friendRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    height: "54px",
    padding: "8px",
  },
  friendAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "9999px",
    objectFit: "cover",
    flexShrink: 0,
  },
  friendName: {
    ...fontBase,
    color: "#27272a",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  friendActionBtn: {
    ...fontBase,
    color: "#27272a",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "10px 16px",
    flexShrink: 0,
  },

  // Invite button
  inviteBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    paddingLeft: "32px",
    border: "2px solid #d4d4d8",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  },
  inviteBtnText: {
    ...fontBase,
    fontWeight: "500",
    color: "#27272a",
  },

  // Toast
  toastWrapper: {
    position: "fixed",
    top: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 50,
  },
  toast: {
    backgroundColor: "#dcfce7",
    borderRadius: "8px",
    padding: "8px 12px",
    boxShadow: "0px 0px 32px 0px rgba(0,0,0,0.25)",
  },
  toastText: {
    ...fontBase,
    color: "#15803d",
    textAlign: "center",
    margin: 0,
  },

  // Footer
  footer: {
    backgroundColor: "#22c55e",
    borderTopLeftRadius: "24px",
    borderTopRightRadius: "24px",
    boxShadow: "0px 0px 24px 0px rgba(0,0,0,0.25)",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    alignItems: "center",
  },
  footerMe: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    padding: "8px",
    width: "100%",
  },
  footerMeInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },
  footerAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "9999px",
    objectFit: "cover",
  },
  footerAvatarName: {
    ...fontBase,
    color: "#ffffff",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  footerMeText: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  footerMeTextLine: {
    ...fontBase,
    color: "#ffffff",
    margin: 0,
    whiteSpace: "nowrap",
  },
  footerMascotCircle: {
    width: "81px",
    height: "81px",
    borderRadius: "9999px",
    backgroundColor: "#e4e4e7",
    overflow: "hidden",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  footerMascotImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  footerBtnWhite: {
    width: "100%",
    backgroundColor: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    cursor: "pointer",
    textAlign: "center",
  },
  footerBtnWhiteText: {
    ...fontBase,
    fontWeight: "500",
    color: "#27272a",
  },
  footerBtnGreenText: {
    ...fontBase,
    fontWeight: "500",
    color: "#16a34a",
  },

  // Settings (07-01)
  settingsScreen: {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  settingsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 16px",
  },
  settingsTitleArea: {
    padding: "16px",
  },
  settingsTitle: {
    fontFamily: "'Noto Sans JP', sans-serif",
    fontSize: "40px",
    fontWeight: "600",
    lineHeight: "1.5",
    letterSpacing: "0.6px",
    color: "#27272a",
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  settingsList: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    borderTop: "2px solid #d4d4d8",
    borderBottom: "2px solid #d4d4d8",
    display: "flex",
    flexDirection: "column",
  },
  settingsRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    height: "54px",
    padding: "8px",
  },
  toggle: {
    position: "relative",
    width: "52px",
    height: "32px",
    borderRadius: "9999px",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
    transition: "background-color 0.2s",
    padding: "2px 4px",
  },
  toggleThumb: {
    position: "absolute",
    top: "4px",
    width: "24px",
    height: "24px",
    borderRadius: "9999px",
    backgroundColor: "#ffffff",
    transition: "transform 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  },
  settingsFooter: {
    padding: "16px",
  },
  greenBtn: {
    width: "100%",
    backgroundColor: "#22c55e",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    cursor: "pointer",
    textAlign: "center",
  },
  greenBtnText: {
    ...fontBase,
    fontWeight: "500",
    color: "#fafafa",
  },
};