import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  GATE_ACCESS_CODE,
  PHOTO_PATHS,
  TOKEN_DERIVATION_SECRET,
  WORLD_PATHS,
} from "./config";

const CAPTIONS_STORAGE_KEY = "hvd-photo-captions";
const SHOT_ALBUM_STORAGE_KEY = "hvd-shot-album";
const PHOTO_INDEX_STORAGE_KEY = "hvd-next-photo-index";
const SHOT_COUNT_STORAGE_KEY = "hvd-shot-count";

function loadStoredCaptions() {
  if (typeof window === "undefined") return {};
  try {
    const rawValue = window.localStorage.getItem(CAPTIONS_STORAGE_KEY);
    if (!rawValue) return {};
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadStoredShotAlbum() {
  if (typeof window === "undefined") return [];
  try {
    const rawValue = window.localStorage.getItem(SHOT_ALBUM_STORAGE_KEY);
    if (!rawValue) return [];
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.shotNumber === "number" &&
        typeof item.photoPath === "string" &&
        typeof item.caption === "string"
    );
  } catch {
    return [];
  }
}

function upsertShotAlbumEntry(album, entry) {
  const nextAlbum = [...album];
  const existingIndex = nextAlbum.findIndex(
    (item) => item.shotNumber === entry.shotNumber
  );

  if (existingIndex >= 0) {
    nextAlbum[existingIndex] = { ...nextAlbum[existingIndex], ...entry };
  } else {
    nextAlbum.push(entry);
  }

  return nextAlbum.sort((a, b) => a.shotNumber - b.shotNumber).slice(0, 10);
}

function loadStoredPhotoIndex(photoCount) {
  if (typeof window === "undefined") return 0;
  if (!photoCount) return 0;

  const rawValue = window.localStorage.getItem(PHOTO_INDEX_STORAGE_KEY);
  const parsed = Number.parseInt(rawValue ?? "0", 10);
  if (Number.isNaN(parsed)) return 0;

  return ((parsed % photoCount) + photoCount) % photoCount;
}

function loadStoredShotCount() {
  if (typeof window === "undefined") return 0;

  const rawValue = window.localStorage.getItem(SHOT_COUNT_STORAGE_KEY);
  const parsed = Number.parseInt(rawValue ?? "0", 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;

  return parsed;
}

function resetExperienceStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CAPTIONS_STORAGE_KEY);
  window.localStorage.removeItem(SHOT_ALBUM_STORAGE_KEY);
  window.localStorage.removeItem(PHOTO_INDEX_STORAGE_KEY);
  window.localStorage.removeItem(SHOT_COUNT_STORAGE_KEY);
}

async function deriveToken(password) {
  const data = new TextEncoder().encode(
    `${TOKEN_DERIVATION_SECRET}${password.trim()}`
  );
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function getGameBaseUrl() {
  const appBase = import.meta.env.BASE_URL ?? "/";
  const normalizedBase =
    appBase === "/" ? "" : appBase.endsWith("/") ? appBase.slice(0, -1) : appBase;
  return `${window.location.origin}${normalizedBase}/game`;
}

function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${breakpointPx}px)`).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const onChange = (event) => setIsMobile(event.matches);
    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, [breakpointPx]);

  return isMobile;
}

function CursorHeartTrail() {
  const layerRef = useRef(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;

    let lastEmittedAt = 0;

    const handlePointerMove = (event) => {
      const now = performance.now();
      if (now - lastEmittedAt < 22) return;
      lastEmittedAt = now;

      const heart = document.createElement("span");
      heart.className = "cursor-heart";
      heart.textContent = "❤";
      heart.style.left = `${event.clientX}px`;
      heart.style.top = `${event.clientY}px`;
      heart.style.fontSize = `${22 + Math.random() * 16}px`;
      heart.style.setProperty("--heart-x", `${(Math.random() - 0.5) * 38}px`);
      heart.style.setProperty("--heart-y", `${18 + Math.random() * 34}px`);
      heart.style.setProperty("--heart-rotate", `${(Math.random() - 0.5) * 36}deg`);
      layer.appendChild(heart);

      window.setTimeout(() => {
        heart.remove();
      }, 1500);
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return <div ref={layerRef} className="cursor-heart-layer" aria-hidden="true" />;
}

function Layout({
  title,
  children,
  showFloatingHearts = false,
  showFloatingAssets = false,
  showRainHeartsBackdrop = false,
  floatingAssetPaths = [],
  centerOnPage = false,
  titleImageSrc = "",
  titleImageAlt = "",
}) {
  const hearts = ["heart-1", "heart-2", "heart-3", "heart-4", "heart-5", "heart-6"];
  const shellClassName = [
    "page-shell",
    showFloatingHearts ? "page-shell-hearts" : "",
    showFloatingAssets ? "page-shell-assets" : "",
    showRainHeartsBackdrop ? "page-shell-rain-hearts" : "",
    centerOnPage ? "page-shell-centered" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName}>
      {showRainHeartsBackdrop ? (
        <div className="rain-hearts-backdrop" aria-hidden="true" />
      ) : null}
      {showFloatingHearts ? (
        <div className="floating-hearts" aria-hidden="true">
          {hearts.map((heartClass) => (
            <span key={heartClass} className={`floating-heart ${heartClass}`}>
              ❤
            </span>
          ))}
        </div>
      ) : null}
      {showFloatingAssets ? (
        <div className="floating-assets" aria-hidden="true">
          {floatingAssetPaths.map((assetPath, index) => (
            <img
              key={`${assetPath}-${index}`}
              src={assetPath}
              alt=""
              className="floating-asset"
              loading="lazy"
              decoding="async"
              style={{
                "--start-x": (index * 17 + 9) % 100,
                "--start-y": (index * 29 + 11) % 100,
                "--drift-x":
                  (index % 2 === 0 ? 1 : -1) * (8 + ((index + 1) % 5) * 3),
                "--drift-y":
                  (index % 3 === 0 ? 1 : -1) * (7 + ((index + 2) % 4) * 3),
                "--duration": 14 + (index % 6) * 2.4,
                "--delay": -(index * 1.6),
                "--size": 108 + ((index + 3) % 6) * 20,
                "--tilt": (index % 2 === 0 ? 1 : -1) * (6 + (index % 5) * 3),
              }}
            />
          ))}
        </div>
      ) : null}
      <main className="page">
        {titleImageSrc ? (
          <img
            src={titleImageSrc}
            alt={titleImageAlt || title}
            className="page-title-image"
          />
        ) : (
          <h1>{title}</h1>
        )}
        <section className="content">{children}</section>
      </main>
    </div>
  );
}

function GatePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const landingAssetPaths = [
    "/assets/bugcat-capoo-holding-hearts.gif",
    "/assets/huggy.gif",
    "/assets/just_heart.gif",
    "/assets/kissing.gif",
    "/assets/kissy.gif",
    "/assets/licking-cat.gif",
    "/assets/bugcat-capoo-holding-hearts.gif",
    "/assets/huggy.gif",
    "/assets/just_heart.gif",
    "/assets/kissing.gif",
    "/assets/kissy.gif",
    "/assets/licking-cat.gif",
    "/assets/bugcat-capoo-holding-hearts.gif",
    "/assets/huggy.gif",
    "/assets/just_heart.gif",
    "/assets/kissing.gif",
  ];
  const codeLength = GATE_ACCESS_CODE.length;
  const [codeDigits, setCodeDigits] = useState(Array(codeLength).fill(""));
  const [accessLink, setAccessLink] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeInputRefs = useRef([]);
  const codeValue = codeDigits.join("");

  useEffect(() => {
    // Returning to home always starts a fresh run.
    resetExperienceStorage();
  }, []);

  const focusCodeInput = (index) => {
    const input = codeInputRefs.current[index];
    if (input) input.focus();
  };

  const handleDigitChange = (index, value) => {
    const nextDigit = value.replace(/\D/g, "").slice(-1);
    setCodeDigits((previous) => {
      const updated = [...previous];
      updated[index] = nextDigit;
      return updated;
    });

    if (nextDigit && index < codeLength - 1) {
      focusCodeInput(index + 1);
    }
  };

  const handleDigitKeyDown = (index, event) => {
    if (event.key === "Backspace" && !codeDigits[index] && index > 0) {
      focusCodeInput(index - 1);
    }
  };

  const handleDigitPaste = (event) => {
    event.preventDefault();
    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, codeLength)
      .split("");

    if (!pastedDigits.length) return;

    setCodeDigits((previous) => {
      const updated = [...previous];
      for (let i = 0; i < codeLength; i += 1) {
        updated[i] = pastedDigits[i] ?? "";
      }
      return updated;
    });

    const nextIndex = Math.min(pastedDigits.length, codeLength - 1);
    focusCodeInput(nextIndex);
  };

  const handleUnlock = async (event) => {
    event.preventDefault();
    setCopied(false);
    setErrorMessage("");

    if (codeValue.length !== codeLength) {
      setErrorMessage("Enter all 4 digits first.");
      return;
    }

    if (codeValue !== GATE_ACCESS_CODE) {
      setAccessLink("");
      setErrorMessage("Incorrect code. Try again.");
      return;
    }

    setIsUnlocking(true);
    try {
      const token = await deriveToken(codeValue);
      const gamePathWithToken = `/game#${token}`;
      const fullAccessLink = `${getGameBaseUrl()}#${token}`;
      setAccessLink(fullAccessLink);
      navigate(gamePathWithToken);
    } catch (error) {
      console.error(error);
      setErrorMessage("Could not generate token. Try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleCopy = async () => {
    if (!accessLink) return;
    try {
      await navigator.clipboard.writeText(accessLink);
      setCopied(true);
    } catch (error) {
      console.error(error);
      setErrorMessage("Copy failed. You can still select and copy manually.");
    }
  };

  return (
    <Layout
      title="Valentine's Gate"
      centerOnPage
      showFloatingAssets
      floatingAssetPaths={landingAssetPaths}
    >
      {isMobile ? (
        <div className="mobile-riddle-card">
          <p className="mobile-riddle-title">Riddle Placeholder</p>
          <p>
            I can run but never walk, have a mouth but never talk. What am I?
          </p>
        </div>
      ) : (
        <form className="gate-form" onSubmit={handleUnlock}>
          <p className="code-label">Enter 4 digit code</p>
          <div className="code-input-row">
            {codeDigits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  codeInputRefs.current[index] = element;
                }}
                className="digit-input"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(event) => handleDigitChange(index, event.target.value)}
                onKeyDown={(event) => handleDigitKeyDown(index, event)}
                onPaste={handleDigitPaste}
                aria-label={`Code digit ${index + 1}`}
                autoComplete="one-time-code"
              />
            ))}
          </div>
          <div className="button-row">
            <button type="submit" disabled={isUnlocking}>
              {isUnlocking ? "Unlocking..." : "Unlock"}
            </button>
          </div>
        </form>
      )}

      {errorMessage ? <p className="error">{errorMessage}</p> : null}

      {accessLink ? (
        <div className="generated-link">
          <p>Access link:</p>
          <a href={accessLink}>{accessLink}</a>
          <div className="button-row">
            <button type="button" className="secondary" onClick={handleCopy}>
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}

function GamePage() {
  const navigate = useNavigate();
  const viewfinderRef = useRef(null);
  const shotIdRef = useRef(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [latestShot, setLatestShot] = useState(null);
  const [shotAlbum, setShotAlbum] = useState(() =>
    loadStoredShotAlbum()
  );
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(() =>
    loadStoredPhotoIndex(PHOTO_PATHS.length)
  );
  const [shotCount, setShotCount] = useState(() => loadStoredShotCount());
  const [flashCycle, setFlashCycle] = useState(0);
  const currentCaption = latestShot
    ? shotAlbum.find((entry) => entry.shotNumber === latestShot.shotNumber)
        ?.caption ?? ""
    : "";
  const canProceed = currentCaption.trim().length > 0;
  const currentWorldPath = WORLD_PATHS.length
    ? WORLD_PATHS[currentPhotoIndex % WORLD_PATHS.length]
    : "";

  const triggerShutter = () => {
    if (latestShot) return;
    if (shotCount >= 10) return;
    if (!PHOTO_PATHS.length) return;

    const nextShotNumber = shotCount + 1;
    const nextPhotoPath = PHOTO_PATHS[currentPhotoIndex];
    shotIdRef.current += 1;

    setLatestShot({
      id: shotIdRef.current,
      shotNumber: nextShotNumber,
      src: nextPhotoPath,
    });
    setShotAlbum((previous) =>
      upsertShotAlbumEntry(previous, {
        shotNumber: nextShotNumber,
        photoPath: nextPhotoPath,
        caption: "",
      })
    );
    setShotCount((previous) => previous + 1);
    setFlashCycle((previous) => previous + 1);
  };

  useEffect(() => {
    if (shotCount < 10 || latestShot) return;

    // If a completed run returns to /game, start a fresh run.
    resetExperienceStorage();
    setShotAlbum([]);
    setCurrentPhotoIndex(0);
    setShotCount(0);
  }, [latestShot, shotCount]);

  const handleReloadExperience = () => {
    if (shotCount >= 10) {
      navigate("/valentines");
      return;
    }

    if (PHOTO_PATHS.length) {
      const nextIndex = (currentPhotoIndex + 1) % PHOTO_PATHS.length;
      window.localStorage.setItem(PHOTO_INDEX_STORAGE_KEY, String(nextIndex));
      setCurrentPhotoIndex(nextIndex);
    }

    window.location.reload();
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SHOT_ALBUM_STORAGE_KEY, JSON.stringify(shotAlbum));
  }, [shotAlbum]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SHOT_COUNT_STORAGE_KEY, String(shotCount));
  }, [shotCount]);

  useEffect(() => {
    if (latestShot) return undefined;

    const getViewfinderSize = () => {
      const width = viewfinderRef.current?.offsetWidth ?? 320;
      const height = viewfinderRef.current?.offsetHeight ?? 240;
      return { width, height };
    };

    const clampToViewport = (clientX, clientY) => {
      const { width, height } = getViewfinderSize();
      const maxX = Math.max(0, window.innerWidth - width);
      const maxY = Math.max(0, window.innerHeight - height);
      const x = Math.min(Math.max(clientX - width / 2, 0), maxX);
      const y = Math.min(Math.max(clientY - height / 2, 0), maxY);
      return { x, y };
    };

    const centerViewfinder = () => {
      const { width, height } = getViewfinderSize();
      setPosition({
        x: Math.max((window.innerWidth - width) / 2, 0),
        y: Math.max((window.innerHeight - height) / 2, 0),
      });
    };

    const handleMouseMove = (event) => {
      setPosition(clampToViewport(event.clientX, event.clientY));
    };

    const handleTouchMove = (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      setPosition(clampToViewport(touch.clientX, touch.clientY));
    };

    const handleResize = () => {
      setPosition((previous) => {
        const { width, height } = getViewfinderSize();
        const centerX = previous.x + width / 2;
        const centerY = previous.y + height / 2;
        return clampToViewport(centerX, centerY);
      });
    };

    centerViewfinder();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", handleResize);
    };
  }, [latestShot]);

  return (
    <main
      className="game-world"
      style={
        currentWorldPath
          ? {
              backgroundImage: `url(${currentWorldPath})`,
            }
          : undefined
      }
      onPointerDown={triggerShutter}
    >
      <div className="game-hud">
        <p>Move to aim, then click or tap to snap a shot.</p>
        <p className="shot-count">Shots taken: {shotCount}/10</p>
      </div>
      {flashCycle > 0 ? <div key={flashCycle} className="shutter-flash" /> : null}
      {latestShot ? (
        <div
          className="capture-overlay"
          aria-live="polite"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <article key={latestShot.id} className="polaroid polaroid-fullscreen">
            <div className="polaroid-photo-wrap">
              <img
                src={latestShot.src}
                alt="Captured memory"
                className="polaroid-photo"
              />
            </div>
            <textarea
              className="polaroid-caption-input"
              value={currentCaption}
              onChange={(event) =>
                setShotAlbum((previous) =>
                  upsertShotAlbumEntry(previous, {
                    shotNumber: latestShot.shotNumber,
                    photoPath: latestShot.src,
                    caption: event.target.value,
                  })
                )
              }
              placeholder="Write a silly caption..."
              onPointerDown={(event) => event.stopPropagation()}
            />
          </article>
          <button
            type="button"
            className="reload-bubble-button"
            onPointerDown={(event) => event.stopPropagation()}
            disabled={!canProceed}
            onClick={handleReloadExperience}
          >
            {shotCount >= 10 ? "develop" : "reload"}
          </button>
        </div>
      ) : null}
      {!latestShot ? (
        <div
          ref={viewfinderRef}
          className="viewfinder"
          style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
          role="button"
          tabIndex={0}
          aria-label="Shutter target"
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              triggerShutter();
            }
          }}
        />
      ) : null}
    </main>
  );
}

function ValentinesPage() {
  const [shotAlbum, setShotAlbum] = useState(() =>
    loadStoredShotAlbum()
  );
  const captionByPhotoPath = new Map(
    shotAlbum.map((entry) => [entry.photoPath, entry.caption])
  );

  useEffect(() => {
    setShotAlbum(loadStoredShotAlbum());
  }, []);

  return (
    <Layout
      title="Valentines"
      titleImageSrc="/assets/happy_valentines.gif"
      titleImageAlt="Happy Valentines"
      showFloatingHearts
      showRainHeartsBackdrop
    >
      <CursorHeartTrail />
      <div className="memory-review-grid">
        {PHOTO_PATHS.map((photoPath, index) => (
          <article key={photoPath} className="memory-review-card">
            <div className="memory-review-photo-wrap">
              <img
                src={photoPath}
                alt={`Memory ${index + 1}`}
                className="memory-review-photo"
              />
            </div>
            <p className="memory-caption">
              {captionByPhotoPath.get(photoPath) || "No caption written yet."}
            </p>
          </article>
        ))}
      </div>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GatePage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="/valentines" element={<ValentinesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
