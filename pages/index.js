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
   04-01 トークルーム画面
   ──────────────────────────────────────────── */
function TalkRoomScreen({ onShare, onGoToTop }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100dvh',
      backgroundColor: c.white,
    }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 16px', width: '100%', boxSizing: 'border-box',
      }}>
        <div style={{ width: 40, height: 44 }} />
        <p style={{
          margin: 0, fontFamily: font, fontWeight: 400, fontSize: 24,
          lineHeight: 1.67, letterSpacing: 0.6, color: c.gray800,
          textAlign: 'center',
        }}>
          イマヒマ。
        </p>
        <div style={{ width: 40, height: 44 }} />
      </div>

      {/* トーク本文 */}
      <div style={{
        flex: 1, padding: 16, display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ paddingRight: 24 }}>
          <div style={{
            border: `1px solid ${c.gray200}`, padding: '4px 8px',
          }}>
            <p style={{
              margin: 0, fontFamily: font, fontWeight: 400, fontSize: 16,
              lineHeight: 1.75, letterSpacing: 0.48, color: c.gray800,
            }}>
              イマヒマ。に登録いただきありがとうございます！{'\n'}
              下のメニューから友達と暇な状況をシェアしてください！
            </p>
          </div>
        </div>
      </div>

      {/* フッター: 2カラムグリッド */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 16, padding: 16,
      }}>
        {/* イマヒマ。をシェア */}
        <button onClick={onShare} style={{
          backgroundColor: c.gray50, border: `2px solid ${c.gray300}`,
          borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 8, height: 92,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 5L12 1L8 5" stroke={c.gray800} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 1V15" stroke={c.gray800} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 9H4C3.44772 9 3 9.44772 3 10V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V10C21 9.44772 20.5523 9 20 9H18" stroke={c.gray800} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p style={{
            margin: 0, fontFamily: font, fontWeight: 500, fontSize: 16,
            lineHeight: 1.75, letterSpacing: 0.48, color: c.gray800,
            textAlign: 'center',
          }}>
            イマヒマ。をシェア
          </p>
        </button>

        {/* アプリTOPへ */}
        <button onClick={onGoToTop} style={{
          backgroundColor: c.green500, border: 'none',
          borderRadius: 8, padding: '10px 16px', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 8,
        }}>
          <img src="/images/logo.svg" alt="イマヒマ。" style={{ height: 48 }} />
          <p style={{
            margin: 0, fontFamily: font, fontWeight: 500, fontSize: 16,
            lineHeight: 1.75, letterSpacing: 0.48, color: c.gray50,
            textAlign: 'center',
          }}>
            アプリTOPへ
          </p>
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   03-01 オンボーディング画面
   ──────────────────────────────────────────── */
function OnboardingScreen({ onSelect }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100dvh',
      backgroundColor: c.green500, position: 'relative',
    }}>
      {/* タイトル */}
      <div style={{ padding: 16 }}>
        <p style={{
          margin: 0, fontFamily: font, fontWeight: 600, fontSize: 40,
          lineHeight: 1.5, letterSpacing: 0.6, color: c.white,
        }}>
          イマヒマ。を<br />始めましょう！<br />あなたは今暇ですか？
        </p>
      </div>

      {/* イラスト */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
        <img
          src="/images/onboarding-bears.svg"
          alt="シロクマ"
          style={{ width: 320, height: 320, objectFit: 'contain' }}
        />
      </div>

      {/* フッター */}
      <div style={{
        padding: 16, display: 'flex', flexDirection: 'column',
        gap: 16, alignItems: 'center',
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
          margin: 0, fontFamily: font, fontWeight: 400, fontSize: 16,
          lineHeight: 1.75, letterSpacing: 0.48, color: c.white,
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
function TopScreen({ user, friends, onInvite, onGoToSettings, onStopHima, onClose, toast }) {
  const himaFriends = friends.filter(f => f.isHima);
  const nonHimaFriends = friends.filter(f => !f.isHima);
  const isHima = user?.isHima;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100dvh',
      backgroundColor: c.white, position: 'relative',
    }}>
      {/* ヘッダー: ヒマ時は×ボタン表示 */}
      <Header onClose={isHima ? onClose : undefined} />

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
        backgroundColor: c.green500,
        borderRadius: '24px 24px 0 0',
        boxShadow: '0 0 24px rgba(0,0,0,0.25)',
        padding: '24px 16px',
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
                    lineHeight: 1.75, letterSpacing: 0.48, color: c.white,
                    whiteSpace: 'nowrap',
                  }}>
                    {user?.displayName ?? ''}さんは
                  </p>
                  <p style={{
                    margin: 0, fontFamily: font, fontWeight: 400, fontSize: 16,
                    lineHeight: 1.75, letterSpacing: 0.48, color: c.white,
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
function SettingsScreen({ friends, onBack, onPublish }) {
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
          disabled={friends.length === 0}
          style={{
            ...baseBtn,
            backgroundColor: friends.length === 0 ? c.gray300 : c.green500,
            color: c.gray50,
            cursor: friends.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          暇状態を公開する
        </button>
      </div>
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
function ScreenTransition({ children, direction }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    return () => setMounted(false);
  }, []);

  const offset = direction === 'push' ? '100%' : '-30%';

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      transform: mounted ? 'translateX(0)' : `translateX(${offset})`,
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
  const [view, setView] = useState('loading');       // loading | talkroom | onboarding | top | settings
  const [prevView, setPrevView] = useState(null);
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [toast, setToast] = useState(null);
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

        // ?action=share の場合、shareTargetPickerを自動起動してLIFFを閉じる
        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'share') {
          const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
          const liffUrl = `https://liff.line.me/${liffId}?inviter=${profile.userId}`;

          if (liff.isApiAvailable('shareTargetPicker')) {
            try {
              await liff.shareTargetPicker([
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
                          url: `${window.location.origin}/images/logo.png`,
                          size: 'md',
                          aspectRatio: '4:1',
                          aspectMode: 'fit',
                          align: 'start',
                        },
                        {
                          type: 'text',
                          text: `${profile.displayName}さんがイマヒマ。に招待しています`,
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
                          color: '#22c55e',
                        },
                      ],
                    },
                  },
                },
              ]);
            } catch (shareErr) {
              console.error('Share from rich menu error:', shareErr);
            }
          }
          // shareTargetPicker完了後、LIFFを閉じてトークルームに戻る
          setTimeout(() => {
            if (liff.isApiAvailable('closeWindow')) {
              liff.closeWindow();
            }
          }, 300);
          // closeWindowが効かない場合に備えて閉じるボタン画面を表示
          setView('closePrompt');
          return;
        }

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
      // 新規ユーザー: inviter がいれば友達関係を作成
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

    // 既存ユーザー
    const data = userSnap.data();

    // 暇状態の自動期限切れチェック
    let isHima = data.isHima;
    if (isHima && data.himaExpiresAt) {
      const expiresAt = data.himaExpiresAt.toDate();
      if (expiresAt < new Date()) {
        isHima = false;
        await updateDoc(userRef, { isHima: false, himaExpiresAt: null });
      }
    }

    // inviter チェック（既存ユーザーが招待リンクで来た場合）
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

    // 自分 → 招待者
    await setDoc(doc(db, 'users', userId, 'friends', inviterId), {
      displayName: inviterData.displayName,
      pictureUrl: inviterData.pictureUrl ?? '',
      isVisible: true,
      addedAt: serverTimestamp(),
    });

    // 招待者 → 自分
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

    // ロゴ画像URL（Vercelデプロイ先ドメインから取得）
    // ※ LINE Flex MessageはJPEG/PNGのみ対応。SVGで動かない場合はPNGに変換してください
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

      // 友達リスト再読込
      await loadFriends(user.userId);

      navigateTo('top');
      setTimeout(() => {
        showToast('暇状態を公開しました。');
      }, 350);
    } catch (err) {
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

  /* ── トークルームからアプリTOPへ遷移 ── */
  async function handleGoToTopFromTalkRoom() {
    const profile = profileRef.current;
    if (profile) {
      await loadUserData(profile.userId, profile);
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

        {view === 'closePrompt' && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: '100dvh', backgroundColor: c.white, gap: 16, padding: 16,
          }}>
            <p style={{
              margin: 0, fontFamily: font, fontWeight: 400, fontSize: 16,
              lineHeight: 1.75, color: c.gray500, textAlign: 'center',
            }}>
              トークルームに戻るには下のボタンを押してください
            </p>
            <button onClick={() => {
              if (liff.isApiAvailable('closeWindow')) liff.closeWindow();
            }} style={{
              ...baseBtn, width: 'auto', padding: '10px 32px',
              backgroundColor: c.green500, color: c.white,
            }}>
              閉じる
            </button>
          </div>
        )}

        {view === 'talkroom' && (
          <TalkRoomScreen
            onShare={handleInviteFriends}
            onGoToTop={handleGoToTopFromTalkRoom}
          />
        )}

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
            onClose={handleClose}
            toast={toast}
          />
        )}

        {view === 'settings' && (
          <ScreenTransition direction="push">
            <SettingsScreen
              friends={friends}
              onBack={() => navigateTo('top')}
              onPublish={handlePublishStatus}
            />
          </ScreenTransition>
        )}
      </div>
    </>
  );
}
