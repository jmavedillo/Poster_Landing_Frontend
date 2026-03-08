"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./legacyPoster.css";
import { buildPosterRenderRequest, PosterRenderRequest } from "./posterModel";

type Artist = {
  id: string;
  name: string;
  imageUrl: string | null;
};

type TrackArtist = {
  id: string;
  name: string;
};

type Track = {
  id: string;
  title: string;
  artists: TrackArtist[];
  durationSeconds: number;
  coverUrl: string | null;
};

type PosterTheme = "dark" | "inverse";

const defaults = {
  title: "Viajo Sin Ver (Remix) [feat De La...]",
  artists: "Jon Z, De La Ghetto, Almighty, Miky...",
  totalTime: "9:29",
  cover: "/next.svg",
};

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const API_UNREACHABLE_MESSAGE =
  `Cannot reach the poster API at ${API_BASE_URL}. Set NEXT_PUBLIC_API_BASE_URL to your running backend URL.`;

const serializeBody = (body: unknown) => {
  if (typeof body === "string") return body;
  if (body == null) return "";
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
};

const readErrorResponse = async (response: Response) => {
  let bodyText = "";

  try {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      bodyText = serializeBody(await response.json());
    } else {
      bodyText = await response.text();
    }
  } catch {
    bodyText = "";
  }

  console.error("Poster API error body", {
    status: response.status,
    statusText: response.statusText,
    body: bodyText,
  });

  const suffix = bodyText ? `: ${bodyText}` : "";
  return `Request failed (${response.status} ${response.statusText})${suffix}`;
};

const normalizeText = (value: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatTime = (totalSeconds: number) => {
  const safeSeconds = clampNumber(Number(totalSeconds) || 0, 0, 59 * 60 + 59);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const parseTime = (value: string) => {
  if (!/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [minutes, seconds] = value.split(":").map(Number);
  if (seconds > 59) return null;
  return minutes * 60 + seconds;
};

const getElapsedTime = (totalTime: string) => {
  const parsedTotal = parseTime(totalTime);
  if (parsedTotal === null) {
    return formatTime(Math.round(0.8 * (parseTime(defaults.totalTime) ?? 0)));
  }

  return formatTime(Math.round(parsedTotal * 0.8));
};

const getTrackArtists = (track: Track | null) => (track?.artists || []).map((artist) => artist.name).join(", ");

const resolveCoverUrl = (coverUrl: string | null | undefined) => {
  const value = coverUrl || defaults.cover;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  if (typeof window !== "undefined") {
    return new URL(value, window.location.origin).toString();
  }

  return value;
};

const sanitizeFileName = (value: string) =>
  String(value || "poster")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "poster";

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string };
      detail = body?.error ? `: ${body.error}` : "";
    } catch {
      detail = "";
    }

    throw new Error(`Request failed (${response.status}) for ${url}${detail}`);
  }

  return response.json() as Promise<T>;
};

const getRequestErrorMessage = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : "";
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("networkerror") ||
    normalizedMessage.includes("cors")
  ) {
    return API_UNREACHABLE_MESSAGE;
  }

  return message || fallback;
};

export function CreatePosterClient() {
  const [artistQuery, setArtistQuery] = useState("");
  const [songQuery, setSongQuery] = useState("");
  const [artistResults, setArtistResults] = useState<Artist[]>([]);
  const [trackResults, setTrackResults] = useState<Track[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [theme, setTheme] = useState<PosterTheme>("dark");
  const [showPoster, setShowPoster] = useState(false);
  const [isExporting, setIsExporting] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const posterPayload: PosterRenderRequest = useMemo(
    () =>
      buildPosterRenderRequest({
        track: selectedTrack
          ? {
              title: selectedTrack.title,
              artists: getTrackArtists(selectedTrack),
              totalTime: formatTime(selectedTrack.durationSeconds),
              currentTime: getElapsedTime(formatTime(selectedTrack.durationSeconds)),
            }
          : {
              title: defaults.title,
              artists: defaults.artists,
              totalTime: defaults.totalTime,
              currentTime: getElapsedTime(defaults.totalTime),
            },
        artwork: { coverUrl: resolveCoverUrl(selectedTrack?.coverUrl) },
        theme,
      }),
    [selectedTrack, theme],
  );

  useEffect(() => {
    const normalizedArtistTerm = normalizeText(artistQuery);
    if (normalizedArtistTerm.length < MIN_QUERY_LENGTH) {
      setArtistResults([]);
      setSelectedArtist(null);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const url = `${API_BASE_URL}/api/artists?q=${encodeURIComponent(artistQuery)}`;
        const results = await fetchJson<Artist[]>(url);
        if (isCancelled) return;

        setArtistResults(Array.isArray(results) ? results : []);
        const matchedArtist = (Array.isArray(results) ? results : []).find(
          (artist) => normalizeText(artist.name) === normalizedArtistTerm,
        );
        setSelectedArtist(matchedArtist || null);
        setSearchError(null);
      } catch (error) {
        if (isCancelled) return;
        setArtistResults([]);
        setSelectedArtist(null);
        setSearchError(getRequestErrorMessage(error, "Unable to fetch artists right now."));
      }
    }, DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [artistQuery]);

  useEffect(() => {
    const artistChanged = selectedArtist && normalizeText(selectedArtist.name) !== normalizeText(artistQuery);
    if (artistChanged) {
      setSelectedTrack(null);
    }

    const normalizedSongTerm = normalizeText(songQuery);
    if (normalizedSongTerm.length < MIN_QUERY_LENGTH) {
      setTrackResults([]);
      if (!songQuery) setSelectedTrack(null);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: songQuery.split("—")[0].trim() });
        if (selectedArtist?.name) {
          params.set("artistName", selectedArtist.name);
        }

        const results = await fetchJson<Track[]>(`${API_BASE_URL}/api/tracks?${params.toString()}`);
        if (isCancelled) return;

        const safeResults = Array.isArray(results) ? results : [];
        setTrackResults(safeResults);

        const selectedSongTerm = normalizeText(songQuery);
        const selectedSongRaw = normalizeText(songQuery.split("—")[0].trim());
        const matchedTrack =
          safeResults.find((track) => {
            const title = normalizeText(track.title);
            const display = normalizeText(`${track.title} — ${getTrackArtists(track)}`);
            return title === selectedSongRaw || display === selectedSongTerm || title === selectedSongTerm;
          }) || null;

        setSelectedTrack(matchedTrack);
        setSearchError(null);
      } catch (error) {
        if (isCancelled) return;
        setTrackResults([]);
        setSelectedTrack(null);
        setSearchError(getRequestErrorMessage(error, "Unable to fetch tracks right now."));
      }
    }, DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [songQuery, artistQuery, selectedArtist]);

  const handleGeneratePoster = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      console.log("Poster preview payload", posterPayload);
      const response = await fetch(`${API_BASE_URL}/api/posters/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(posterPayload),
      });

      if (!response.ok) throw new Error(await readErrorResponse(response));
      const payload = (await response.json()) as { html?: string };
      setPreviewHtml(payload.html || null);
      setShowPoster(true);
      setSearchError(null);
    } catch (error) {
      setSearchError(getRequestErrorMessage(error, "Unable to render preview right now."));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (width: number) => {
    setIsExporting(width);
    try {
      const response = await fetch(`${API_BASE_URL}/api/posters/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...posterPayload, output: { width, format: "jpeg", quality: 0.92 } }),
      });

      if (!response.ok) {
        throw new Error(await readErrorResponse(response));
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const fileName = `${sanitizeFileName(posterPayload.track.title)}-poster-${width}.jpg`;
      const linkEl = document.createElement("a");
      linkEl.href = downloadUrl;
      linkEl.download = fileName;
      document.body.append(linkEl);
      linkEl.click();
      linkEl.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setSearchError(getRequestErrorMessage(error, "Poster export failed. Please try again."));
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
        <header className="flex items-center justify-between rounded-full border border-stone-200 bg-white/90 px-6 py-3">
          <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-stone-700">
            POSTERFLOW
          </Link>
          <Link
            href="/"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-100"
          >
            Back Home
          </Link>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[360px_1fr]">
          <div className="rounded-3xl border border-stone-200 bg-white p-6">
            <h1 className="text-3xl font-semibold tracking-tight">Create your poster</h1>
            <p className="mt-2 text-sm text-stone-600">Search an artist and song, then render and export.</p>

            <form className="mt-6 space-y-4" onSubmit={handleGeneratePoster}>
              <label className="block text-sm font-semibold text-stone-700">
                Search by artist
                <input type="search" value={artistQuery} onChange={(e) => setArtistQuery(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2" list="artists" />
              </label>
              <datalist id="artists">
                {artistResults.map((artist) => (
                  <option key={artist.id} value={artist.name} />
                ))}
              </datalist>

              <label className="block text-sm font-semibold text-stone-700">
                Search by song
                <input type="search" value={songQuery} onChange={(e) => setSongQuery(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2" list="tracks" />
              </label>
              <datalist id="tracks">
                {trackResults.map((track) => (
                  <option key={track.id} value={`${track.title} — ${getTrackArtists(track)}`} />
                ))}
              </datalist>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-stone-700">Theme</legend>
                <div className="flex gap-4 text-sm">
                  <label><input type="radio" checked={theme === "dark"} onChange={() => setTheme("dark")} /> Spotify dark</label>
                  <label><input type="radio" checked={theme === "inverse"} onChange={() => setTheme("inverse")} /> Elegant inverse</label>
                </div>
              </fieldset>

              {searchError ? <p className="text-xs text-red-600">{searchError}</p> : null}

              <button type="submit" className="flex w-full items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white" disabled={isGenerating}>
                {isGenerating ? "Rendering..." : "Generate poster"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="w-full max-w-[400px]">
                <div className="legacy-poster-shell">
                  {previewHtml ? (
                    <iframe title="Poster preview" srcDoc={previewHtml} className="h-[600px] w-full overflow-hidden rounded-2xl border border-stone-200" />
                  ) : (
                    <div className="flex h-[600px] w-full items-center justify-center rounded-2xl border border-dashed border-stone-300 text-sm text-stone-500">
                      Generate a poster to preview.
                    </div>
                  )}
                </div>

                <div className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                  {[500, 1000].map((width) => (
                    <button
                      key={width}
                      type="button"
                      onClick={() => handleExport(width)}
                      disabled={!showPoster || isExporting !== null}
                      className="w-full rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 disabled:opacity-60"
                    >
                      {isExporting === width ? "Exporting..." : `Download JPG (${width}px wide)`}
                    </button>
                  ))}
                </div>
              </div>

              <aside className="w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 xl:max-w-[320px]">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-900">Disclaimer</h2>
                <p className="mt-3 leading-relaxed">
                  Posterflow generated images are provided for free use under sole user responsibility.
                </p>
                <p className="mt-3 leading-relaxed">
                  This service is provided as-is, without warranties and on a non-profit basis; we are not responsible for generated content or for how it is ultimately used.
                </p>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
