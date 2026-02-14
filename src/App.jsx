import { useEffect, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  GATE_ACCESS_CODE,
  PHOTO_PATHS,
  TOKEN_DERIVATION_SECRET,
} from "./config";

const CAPTIONS_STORAGE_KEY = "hvd-photo-captions";

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

function Layout({ title, children }) {
  return (
    <main className="page">
      <h1>{title}</h1>
      <section className="content">{children}</section>
    </main>
  );
}

function GatePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const codeLength = GATE_ACCESS_CODE.length;
  const [codeDigits, setCodeDigits] = useState(Array(codeLength).fill(""));
  const [accessLink, setAccessLink] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeInputRefs = useRef([]);
  const codeValue = codeDigits.join("");

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
    <Layout title="Valentine's Gate">
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
  const viewfinderRef = useRef(null);
  const shotIdRef = useRef(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [latestShot, setLatestShot] = useState(null);
  const [captionsByPhoto, setCaptionsByPhoto] = useState(() =>
    loadStoredCaptions()
  );
  const [shotCount, setShotCount] = useState(0);
  const [flashCycle, setFlashCycle] = useState(0);

  const triggerShutter = () => {
    if (latestShot) return;
    if (!PHOTO_PATHS.length) return;

    const nextShotIndex = shotCount % PHOTO_PATHS.length;
    const nextPhotoPath = PHOTO_PATHS[nextShotIndex];
    shotIdRef.current += 1;

    setLatestShot({ id: shotIdRef.current, src: nextPhotoPath });
    setShotCount((previous) => previous + 1);
    setFlashCycle((previous) => previous + 1);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      CAPTIONS_STORAGE_KEY,
      JSON.stringify(captionsByPhoto)
    );
  }, [captionsByPhoto]);

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
    <main className="game-world" onPointerDown={triggerShutter}>
      <div className="game-hud">
        <Link to="/">Back to gate</Link>
        <p>Move to aim, then click or tap to snap a shot.</p>
        <p className="shot-count">Shots taken: {shotCount}</p>
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
              value={captionsByPhoto[latestShot.src] ?? ""}
              onChange={(event) =>
                setCaptionsByPhoto((previous) => ({
                  ...previous,
                  [latestShot.src]: event.target.value,
                }))
              }
              placeholder="Write a silly caption..."
              onPointerDown={(event) => event.stopPropagation()}
            />
          </article>
          <button
            type="button"
            className="reload-bubble-button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => window.location.reload()}
          >
            reload
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
  const [captionsByPhoto, setCaptionsByPhoto] = useState(() =>
    loadStoredCaptions()
  );

  useEffect(() => {
    setCaptionsByPhoto(loadStoredCaptions());
  }, []);

  return (
    <Layout title="Valentines">
      <p>Memory review from your photo experience:</p>
      <div className="memory-review-grid">
        {PHOTO_PATHS.map((photoPath, index) => (
          <article key={photoPath} className="memory-review-card">
            <img src={photoPath} alt={`Memory ${index + 1}`} />
            <p className="memory-caption">
              {captionsByPhoto[photoPath] || "No caption written yet."}
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
