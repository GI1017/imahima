import "@/styles/globals.css";
import { Noto_Sans_JP } from "next/font/google";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function App({ Component, pageProps }) {
  return (
    <main className={notoSansJP.className}>
      <Component {...pageProps} />
    </main>
  );
}