import { useEffect, useState } from "react";
import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { useBusiness } from "../context/BusinessContext";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function safeColor(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback;
}

function setMeta(name: string, content: string) {
  let node = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!node) {
    node = document.createElement("meta");
    node.name = name;
    document.head.appendChild(node);
  }
  node.content = content;
}

export default function PWAExperience() {
  const { business } = useBusiness();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [showInstall, setShowInstall] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const primary = safeColor(business.primaryColor, "#c6a15b");
    const secondary = safeColor(business.secondaryColor, "#11161b");
    document.documentElement.style.setProperty("--gold", primary);
    document.documentElement.style.setProperty("--brand-primary", primary);
    document.documentElement.style.setProperty("--brand-secondary", secondary);
    document.documentElement.style.setProperty("--panel2", secondary);
    document.title = business.name ? `${business.name} — Barber Online` : "Barber Online";
    setMeta("theme-color", primary);
    setMeta("apple-mobile-web-app-title", business.name || "Barber Online");

    const icon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (icon && business.logoUrl) icon.href = business.logoUrl;

    const manifest = {
      name: business.name || "Barber Online",
      short_name: (business.name || "Barber Online").slice(0, 20),
      description: `Aplikasi operasional ${business.name || "barber shop"}`,
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: secondary,
      theme_color: primary,
      orientation: "portrait-primary",
      icons: business.logoUrl
        ? [
            { src: business.logoUrl, sizes: "192x192", type: "image/png", purpose: "any maskable" },
            { src: business.logoUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ]
        : [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const href = URL.createObjectURL(blob);
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    const oldHref = manifestLink.href;
    manifestLink.href = href;
    return () => {
      URL.revokeObjectURL(href);
      if (manifestLink) manifestLink.href = oldHref || "/manifest.webmanifest";
    };
  }, [business.name, business.logoUrl, business.primaryColor, business.secondaryColor]);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    const onControllerChange = () => setUpdateReady(true);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setShowInstall(false);
  }

  function reload() {
    window.location.reload();
  }

  return <>
    {offline && <div className="pwa-status offline"><WifiOff size={15}/> Offline — koneksi ke server terputus; beberapa data mungkin tidak tersedia.</div>}
    {updateReady && <div className="pwa-status update"><span>Versi aplikasi baru tersedia.</span><button onClick={reload}><RefreshCw size={14}/> Muat ulang</button></div>}
    {showInstall && installEvent && <div className="pwa-install">
      <div><strong>Pasang {business.name || "Barber Online"}</strong><span>Gunakan seperti aplikasi di perangkat ini.</span></div>
      <button className="btn primary" onClick={install}><Download size={15}/> Pasang</button>
      <button className="pwa-dismiss" aria-label="Tutup" onClick={() => setShowInstall(false)}><X size={17}/></button>
    </div>}
  </>;
}
