import { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import liff from '@line/liff';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, getDocs, serverTimestamp, Timestamp
} from 'firebase/firestore';

/* ────────────────────────────────────────────
   Firebase Client Setup
   ──────────────────────────────────────────── */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(fbApp);

/* ────────────────────────────────────────────
   Design Tokens (Figma準拠)
   ──────────────────────────────────────────── */
const c = {
  green500: '#22c55e',
  green600: '#16a34a',
  green700: '#15803d',
  greenLight: '#dcfce7',
  white: '#ffffff',
  gray50: '#fafafa',
  gray100: '#f4f4f5',
  gray200: '#e4e4e7',
  gray300: '#d4d4d8',
  gray500: '#71717a',
  gray600: '#52525b',
  gray800: '#27272a',
  gray900: '#09090b',
};

const font = "'Noto Sans JP', sans-serif";

/* ────────────────────────────────────────────
   共通スタイル
   ──────────────────────────────────────────── */
const baseBtn = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  padding: '10px 16px',
  borderRadius: 8,
  fontFamily: font,
  fontWeight: 500,
  fontSize: 16,
  lineHeight: 1.75,
  letterSpacing: 0.48,
  cursor: 'pointer',
  border: 'none',
  outline: 'none',
  WebkitTapHighlightColor: 'transparent',
};

/* ────────────────────────────────────────────
   Toast コンポーネント
   ──────────────────────────────────────────── */
function Toast({ message, visible }) {
  return (
    <div style={{
      position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
      backgroundColor: c.greenLight, padding: '8px 12px', borderRadius: 8,
      boxShadow: '0 0 32px rgba(0,0,0,0.25)', zIndex: 100,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
      pointerEvents: 'none',
    }}>
      <p style={{
        margin: 0, fontFamily: font, fontWeight: 400, fontSize: 16,
        lineHeight: 1.75, letterSpacing: 0.48,
        color: c.green700, textAlign: 'center', whiteSpace: 'nowrap',
      }}>{message}</p>
    </div>
  );
}

/* ────────────────────────────────────────────
   Spinner コンポーネント
   ──────────────────────────────────────────── */
function Spinner() {
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{
        width: 32, height: 32, border: `3px solid ${c.gray200}`,
        borderTopColor: c.green500, borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </>
  );
}

/* ────────────────────────────────────────────
   ローディングオーバーレイ
   ──────────────────────────────────────────── */
function LoadingOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      backgroundColor: 'rgba(255,255,255,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Spinner />
    </div>
  );
}

/* ────────────────────────────────────────────
   Header コンポーネント
   ──────────────────────────────────────────── */
function Header({ onBack, onClose, showLogo = true }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 16px', width: '100%', boxSizing: 'border-box',
    }}>
      <div style={{ width: 40, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src="/icons/close.svg" alt="閉じる" width={24} height={24} />
          </button>
        )}
        {onBack && !onClose && (
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src="/icons/arrow_back_ios_new.svg" alt="戻る" width={24} height={24} />
          </button>
        )}
      </div>
      {showLogo && (
        <img src="/images/logo.svg" alt="イマヒマ。" style={{ height: 48 }} />
      )}
      <div style={{ width: 40, height: 44 }} />
    </div>
  );
}

/* ────────────────────────────────────────────
   03-01 オンボーディング画面
   ──────────────────────────────────────────── */
function OnboardingScreen({ onSelect }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      backgroundColor: c.green500, overflow: 'hidden',
    }}>
      {/* タイトル */}
      <div style={{ padding: 16, flexShrink: 0 }}>
        <p style={{
          margin: 0, fontFamily: font, fontWeight: 600, fontSize: 34,
          lineHeight: 1.5, letterSpacing: 0.6, color: c.white,
        }}>
          イマヒマ。を<br />始めましょう！<br /><span style={{ whiteSpace: 'nowrap' }}>あなたは今暇ですか？</span>
        </p>
      </div>

      {/* イラスト（固定サイズ） */}
      <div style={{
        flex: 1, minHeight: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
        <img
          src="/images/onboarding-bears.svg"
          alt="シロクマ"
          style={{ width: 272, height: 272, objectFit: 'contain', flexShrink: 0 }}
        />
      </div>

      {/* フッター（下部固定） */}
      <div style={{
        padding: '16px 16px 32px', display: 'flex', flexDirection: 'column',
        gap: 16, alignItems: 'center', flexShrink: 0,
      }}>
        <button onClick={() => onSelect(true)} style={{
          ...baseBtn,
          backgroundColor: c.white, color: c.green600,
        }}>
          イマヒマ。
        </button>
        <button onClick={() => onSelect(false)} style={{
          ...baseBtn,
          backgroundColor: 'transparent', color: c.white,
          border: `2px solid ${c.gray50}`,
        }}>
          ヒマじゃない
        </button>
        <p style={{
          margin: 0, fontFamily: font, fontWeight: 400, fontSize: 12,
          lineHeight: 1.5, letterSpacing: 0.36, color: c.white,
          whiteSpace: 'nowrap', width: '100%', textAlign: 'center',
        }}>
          暇な状態は1時間たつと自動的に解除されます。
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   05-01/05-03 TOP画面
   ──────────────────────────────────────────── */
function TopScreen({ user, friends, onInvite, onGoToSettings, onStopHima, toast }) {
  const himaFriends = friends.filter(f => f.isHima);
  const nonHimaFriends = friends.filter(f => !f.isHima);
  const isHima = user?.isHima;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100dvh',
      backgroundColor: c.white, position: 'relative',
    }}>
      {/* ヘッダー */}
      <Header />

      {/* 友達リスト */}
      <div style={{
        flex: 1, overflow: 'auto', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 32,
        paddingBottom: 220,
      }}>
        {/* イマヒマ。な友達 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{
            margin: 0, fontFamily: font, fontWeight: 500, fontSize: 16,
            lineHeight: 1.75, letterSpacing: 0.48, color: c.gray500,
          }}>
            イマヒマ。な友達
          </p>
          {himaFriends.length === 0 ? (
            <p style={{
              margin: 0, fontFamily: font, fontWeight: 400, fontSize: 16,
              lineHeight: 1.75, letterSpacing: 0.48, color: c.gray500,
              textAlign: 'center', padding: '8px 0',
            }}>
              イマヒマ。な友達がいません
            </p>
          ) : (
            himaFriends.map(f => (
              <FriendRow key={f.userId} friend={f} isHima />
            ))
          )}
        </div>

        {/* ヒマじゃない友達 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{
            margin: 0, fontFamily: font, fontWeight: 500, fontSize: 16,
            lineHeight: 1.75, letterSpacing: 0.48, color: c.gray500,
          }}>
            ヒマじゃない友達
          </p>
          {nonHimaFriends.length === 0 ? (
            <p style={{
              margin: 0, fontFamily: font, fontWeight: 400, fontSize: 16,
              lineHeight: 1.75, letterSpacing: 0.48, color: c.gray500,
              textAlign: 'center', padding: '8px 0',
            }}>
              ヒマじゃない友達がいません
            </p>
          ) : (
            nonHimaFriends.map(f => (
              <FriendRow key={f.userId} friend={f} />
            ))
          )}
        </div>

        {/* 友達を招待するボタン */}
        <button onClick={onInvite} style={{
          ...baseBtn,
          backgroundColor: 'transparent', color: c.gray800,
          border: `2px solid ${c.gray300}`, gap: 8,
          paddingLeft: 32, paddingRight: 16,
        }}>
          友達を招待する
          <img src="/icons/person_search.svg" alt="" width={24} height={24} />
        </button>
      </div>

      {/* フッター: isHima で状態分岐 */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: isHima ? c.gray50 : c.green500,
        borderRadius: '24px 24px 0 0',
        boxShadow: '0 0 24px rgba(0,0,0,0.25)',
        padding: '24px 16px 32px',
        display: 'flex', flexDirection: 'column', gap: 16,
        alignItems: 'center',
      }}>
        {/* ユーザー情報 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: 8,
        }}>
          <div style={{
            width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
            }}>
              {user?.pictureUrl ? (
                <img src={user.pictureUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', backgroundColor: c.gray200 }} />
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ textAlign: 'right' }}>
              {isHima ? (
                <>
                  <p style={{
                    margin: 0, fontFamily: font, fontWeight: 400, fontSize: 16,
                    lineHeight: 1.75, letterSpacing: 0.48, color: c.gray800,
                    whiteSpace: 'nowrap',
                  }}>
                    {user?.displayName ?? ''}さんは
                  </p>
                  <p style={{
                    margin: 0, fontFamily: font, fontWeight: 400, fontSize: 16,
                    lineHeight: 1.75, letterSpacing: 0.48, color: c.gray800,
                    whiteSpace: 'nowrap',
                  }}>
                    イマヒマしています！
                  </p>
                </>
              ) : (
                <>
                  <p style={{
                    margin: 0, fontFamily: font, fontWeight: 400, fontSize: 16,
                    lineHeight: 1.75, letterSpacing: 0.48, color: c.white,
                    whiteSpace: 'nowrap',
                  }}>
                    {user?.displayName ?? ''}さん！
                  </p>
                  <p style={{
                    margin: 0, fontFamily: font, fontWeight: 400, fontSize: 16,
                    lineHeight: 1.75, letterSpacing: 0.48, color: c.white,
                    whiteSpace: 'nowrap',
                  }}>
                    今の状況はどうですか？
                  </p>
                </>
              )}
            </div>
            <div style={{
              width: 81, height: 81, borderRadius: '50%', overflow: 'hidden',
              backgroundColor: c.gray200, flexShrink: 0,
            }}>
              <img
                src={isHima ? '/images/mascot-bear-hima.svg' : '/images/mascot-bear-nothima.svg'}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>

        {/* ボタン: isHima で切り替え */}
        {isHima ? (
          <button onClick={onStopHima} style={{
            ...baseBtn,
            backgroundColor: c.white, color: c.gray800,
            border: `1px solid ${c.gray300}`,
          }}>
            ヒマじゃなくなった。
          </button>
        ) : (
          <button onClick={onGoToSettings} style={{
            ...baseBtn,
            backgroundColor: c.white, color: c.green600,
          }}>
            イマヒマ。
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} visible={toast.visible} />}
    </div>
  );
}

/* ────────────────────────────────────────────
   FriendRow コンポーネント
   ──────────────────────────────────────────── */
function FriendRow({ friend, isHima = false }) {
  const handleTap = () => {
    if (liff.isApiAvailable('openWindow')) {
      liff.openWindow({
        url: `https://line.me/R/oaMessage/${friend.userId}`,
        external: true,
      });
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      height: 54, padding: 8,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
        flexShrink: 0, backgroundColor: c.gray200,
      }}>
        {friend.pictureUrl && (
          <img src={friend.pictureUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
      <p style={{
        margin: 0, flex: 1, fontFamily: font, fontWeight: 400, fontSize: 16,
        lineHeight: 1.75, letterSpacing: 0.48, color: c.gray800,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {friend.displayName}
      </p>
      {isHima && (
        <button onClick={handleTap} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '10px 16px',
          fontFamily: font, fontWeight: 500, fontSize: 16,
          lineHeight: 1.75, letterSpacing: 0.48,
          color: c.gray800, textDecoration: 'underline',
        }}>
          トークする
        </button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   07-01 公開範囲設定画面
   ──────────────────────────────────────────── */
function SettingsScreen({ friends, onBack, onPublish, isPublishing }) {
  const [visibility, setVisibility] = useState(() => {
    const map = {};
    friends.forEach(f => { map[f.userId] = f.isVisible !== false; });
    return map;
  });

  const toggle = (userId) => {
    setVisibility(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handlePublish = () => {
    const visibleFriendIds = Object.entries(visibility)
      .filter(([, v]) => v)
      .map(([id]) => id);
    onPublish(visibleFriendIds);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100dvh',
      backgroundColor: c.white,
    }}>
      <Header onBack={onBack} />

      {/* タイトル */}
      <div style={{ padding: 16 }}>
        <p style={{
          margin: 0, fontFamily: font, fontWeight: 500, fontSize: 34,
          lineHeight: 1.53, letterSpacing: 0.68, color: c.gray800,
        }}>
          暇状態の公開範囲を設定
        </p>
      </div>

      {/* 友達リスト with トグル */}
      <div style={{
        flex: 1, overflow: 'auto', padding: 16,
        borderTop: `2px solid ${c.gray300}`,
        borderBottom: `2px solid ${c.gray300}`,
      }}>
        {friends.length === 0 ? (
          <p style={{
            margin: 0, fontFamily: font, fontWeight: 400, fontSize: 16,
            lineHeight: 1.75, color: c.gray500, textAlign: 'center',
            padding: '24px 0',
          }}>
            友達がまだいません。先に友達を招待してください。
          </p>
        ) : (
          friends.map(f => (
            <div key={f.userId} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: 54, padding: 8,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
                flexShrink: 0, backgroundColor: c.gray200,
              }}>
                {f.pictureUrl && (
                  <img src={f.pictureUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <p style={{
                margin: 0, flex: 1, fontFamily: font, fontWeight: 400, fontSize: 16,
                lineHeight: 1.75, letterSpacing: 0.48, color: c.gray900,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {f.displayName}
              </p>
              {/* Toggle Switch */}
              <button
                onClick={() => toggle(f.userId)}
                style={{
                  width: 52, height: 32, borderRadius: 9999, border: 'none',
                  backgroundColor: visibility[f.userId] ? c.green500 : c.gray300,
                  position: 'relative', cursor: 'pointer', padding: 4,
                  transition: 'background-color 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  backgroundColor: c.white,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s ease',
                  transform: visibility[f.userId] ? 'translateX(20px)' : 'translateX(0)',
                }} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 公開ボタン */}
      <div style={{ padding: 16 }}>
        <button
          onClick={handlePublish}
          disabled={friends.length === 0 || isPublishing}
          style={{
            ...baseBtn,
            backgroundColor: (friends.length === 0 || isPublishing) ? c.gray300 : c.green500,
            color: c.gray50,
            cursor: (friends.length === 0 || isPublishing) ? 'not-allowed' : 'pointer',
            gap: 8,
          }}
        >
          {isPublishing && <Spinner />}
          {isPublishing ? '公開中...' : '暇状態を公開する'}
        </button>
      </div>

      {/* ローディングオーバーレイ */}
      {isPublishing && <LoadingOverlay />}
    </div>
  );
}

/* ────────────────────────────────────────────
   Loading 画面
   ──────────────────────────────────────────── */
function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', backgroundColor: c.green500,
    }}>
      <img src="/images/logo.svg" alt="イマヒマ。" style={{ height: 48, opacity: 0.9 }} />
    </div>
  );
}

/* ────────────────────────────────────────────
   画面遷移ラッパー（push アニメーション）
   ──────────────────────────────────────────── */
function ScreenTransition({ children, direction, isExiting }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    return () => setMounted(false);
  }, []);

  const offset = direction === 'push' ? '100%' : '-30%';
  const transform = isExiting ? `translateX(${offset})` : (mounted ? 'translateX(0)' : `translateX(${offset})`);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      transform,
      transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      backgroundColor: c.white,
    }}>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════
   メインページコンポーネント
   ════════════════════════════════════════════ */
export default function Home() {
  const [view, setView] = useState('loading');       // loading | onboarding | top | settings
  const [prevView, setPrevView] = useState(null);
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [toast, setToast] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [settingsExiting, setSettingsExiting] = useState(false);
  const profileRef = useRef(null);

  /* ── LIFF 初期化 ── */
  useEffect(() => {
    (async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        profileRef.current = profile;

        await loadUserData(profile.userId, profile);
      } catch (err) {
        console.error('LIFF init error:', err);
      }
    })();
  }, []);

  /* ── Firestore からユーザーデータ読み込み ── */
  async function loadUserData(lineUserId, profile) {
    const userRef = doc(db, 'users', lineUserId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const params = new URLSearchParams(window.location.search);
      const inviterId = params.get('inviter');

      await setDoc(userRef, {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl ?? '',
        isHima: false,
        himaExpiresAt: null,
        createdAt: serverTimestamp(),
      });

      if (inviterId && inviterId !== lineUserId) {
        await createFriendship(lineUserId, profile, inviterId);
      }

      setUser({
        userId: lineUserId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl ?? '',
        isHima: false,
      });
      setView('onboarding');
      return;
    }

    const data = userSnap.data();

    let isHima = data.isHima;
    if (isHima && data.himaExpiresAt) {
      const expiresAt = data.himaExpiresAt.toDate();
      if (expiresAt < new Date()) {
        isHima = false;
        await updateDoc(userRef, { isHima: false, himaExpiresAt: null });
      }
    }

    const params = new URLSearchParams(window.location.search);
    const inviterId = params.get('inviter');
    if (inviterId && inviterId !== lineUserId) {
      await createFriendship(lineUserId, profile ?? { displayName: data.displayName, pictureUrl: data.pictureUrl }, inviterId);
    }

    setUser({
      userId: lineUserId,
      displayName: data.displayName,
      pictureUrl: data.pictureUrl,
      isHima,
    });

    await loadFriends(lineUserId);
    setView('top');
  }

  /* ── 友達関係を双方向に作成 ── */
  async function createFriendship(userId, profile, inviterId) {
    const inviterRef = doc(db, 'users', inviterId);
    const inviterSnap = await getDoc(inviterRef);
    if (!inviterSnap.exists()) return;

    const inviterData = inviterSnap.data();

    await setDoc(doc(db, 'users', userId, 'friends', inviterId), {
      displayName: inviterData.displayName,
      pictureUrl: inviterData.pictureUrl ?? '',
      isVisible: true,
      addedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'users', inviterId, 'friends', userId), {
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl ?? '',
      isVisible: true,
      addedAt: serverTimestamp(),
    });
  }

  /* ── 友達リスト読み込み ── */
  async function loadFriends(lineUserId) {
    const friendsSnap = await getDocs(collection(db, 'users', lineUserId, 'friends'));
    const friendList = [];

    for (const friendDoc of friendsSnap.docs) {
      const fData = friendDoc.data();
      const fUserRef = doc(db, 'users', friendDoc.id);
      const fUserSnap = await getDoc(fUserRef);

      let isHima = false;
      if (fUserSnap.exists()) {
        const fUser = fUserSnap.data();
        isHima = fUser.isHima ?? false;
        if (isHima && fUser.himaExpiresAt) {
          const exp = fUser.himaExpiresAt.toDate();
          if (exp < new Date()) isHima = false;
        }
      }

      friendList.push({
        userId: friendDoc.id,
        displayName: fData.displayName,
        pictureUrl: fData.pictureUrl,
        isVisible: fData.isVisible ?? true,
        isHima,
      });
    }

    setFriends(friendList);
  }

  /* ── オンボーディング選択 ── */
  async function handleOnboardingSelect(isHima) {
    const userId = profileRef.current.userId;

    if (isHima) {
      setUser(prev => ({ ...prev, isHima: true }));
      await loadFriends(userId);
      navigateTo('settings');
    } else {
      await updateDoc(doc(db, 'users', userId), { isHima: false });
      setUser(prev => ({ ...prev, isHima: false }));
      await loadFriends(userId);
      navigateTo('top');
    }
  }

  /* ── 友達招待（シェアターゲットピッカー） ── */
  async function handleInviteFriends() {
    if (!liff.isApiAvailable('shareTargetPicker')) {
      alert('この機能はLINEアプリ内でのみ利用できます。');
      return;
    }

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    const userId = user?.userId ?? profileRef.current?.userId;
    const liffUrl = `https://liff.line.me/${liffId}?inviter=${userId}`;

    const logoUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/images/logo.png`
      : `https://liff.line.me/${liffId}/images/logo.png`;

    try {
      const result = await liff.shareTargetPicker([
        {
          type: 'flex',
          altText: 'イマヒマ。への招待',
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'image',
                  url: logoUrl,
                  size: 'md',
                  aspectRatio: '4:1',
                  aspectMode: 'fit',
                  align: 'start',
                },
                {
                  type: 'text',
                  text: `${user?.displayName ?? '友達'}さんがイマヒマ。に招待しています`,
                  margin: 'md',
                  size: 'sm',
                  wrap: true,
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
                    label: 'イマヒマ。を始める',
                    uri: liffUrl,
                  },
                  style: 'primary',
                  color: c.green500,
                },
              ],
            },
          },
        },
      ]);

      if (result?.status === 'success') {
        showToast('友達にイマヒマ。への招待を送りました。');
      }
    } catch (err) {
      console.error('Share target picker error:', err);
    }
  }

  /* ── 暇状態を公開 ── */
  async function handlePublishStatus(visibleFriendIds) {
    setIsPublishing(true);
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          displayName: user.displayName,
          isHima: true,
          visibleFriendIds,
        }),
      });

      if (!res.ok) throw new Error('notify API failed');

      setUser(prev => ({ ...prev, isHima: true }));

      await loadFriends(user.userId);

      setIsPublishing(false);
      navigateTo('top');
      setTimeout(() => {
        showToast('暇状態を公開しました。');
      }, 350);
    } catch (err) {
      setIsPublishing(false);
      console.error('Publish error:', err);
      alert('エラーが発生しました。もう一度お試しください。');
    }
  }

  /* ── ヒマじゃなくなった ── */
  async function handleStopHima() {
    try {
      await updateDoc(doc(db, 'users', user.userId), {
        isHima: false,
        himaExpiresAt: null,
      });
      setUser(prev => ({ ...prev, isHima: false }));
      showToast('ヒマじゃなくなりました。');
    } catch (err) {
      console.error('Stop hima error:', err);
      alert('エラーが発生しました。もう一度お試しください。');
    }
  }

  /* ── LIFFを閉じる ── */
  function handleClose() {
    if (liff.isApiAvailable('closeWindow')) {
      liff.closeWindow();
    }
  }

  /* ── Toast 表示 ── */
  function showToast(message) {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => prev ? { ...prev, visible: false } : null), 2500);
    setTimeout(() => setToast(null), 3000);
  }

  /* ── 画面遷移 ── */
  function navigateTo(nextView) {
    setPrevView(view);
    setView(nextView);
  }

  /* ── レンダリング ── */
  return (
    <>
      <Head>
        <title>イマヒマ。</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Noto Sans JP', sans-serif; overscroll-behavior: none; }
        `}</style>
      </Head>

      <div style={{ position: 'relative', width: '100%', minHeight: '100dvh', overflow: 'hidden' }}>
        {view === 'loading' && <LoadingScreen />}

        {view === 'onboarding' && (
          <OnboardingScreen onSelect={handleOnboardingSelect} />
        )}

        {view === 'top' && (
          <TopScreen
            user={user}
            friends={friends}
            onInvite={handleInviteFriends}
            onGoToSettings={() => navigateTo('settings')}
            onStopHima={handleStopHima}
            toast={toast}
          />
        )}

        {(view === 'settings' || settingsExiting) && (
          <ScreenTransition direction="push" isExiting={settingsExiting}>
            <SettingsScreen
              friends={friends}
              onBack={() => {
                setSettingsExiting(true);
                setTimeout(() => {
                  setSettingsExiting(false);
                  navigateTo('top');
                }, 300);
              }}
              onPublish={handlePublishStatus}
              isPublishing={isPublishing}
            />
          </ScreenTransition>
        )}
      </div>
    </>
  );
}