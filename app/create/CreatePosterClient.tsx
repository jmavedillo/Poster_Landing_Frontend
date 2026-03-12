"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Inter } from "next/font/google";
import "./legacyPoster.css";
import { buildPosterRenderRequest, PosterRenderRequest, PosterTemplateId, PosterTheme } from "./posterModel";

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
  uri?: string | null;
  spotifyUrl?: string | null;
};

type CreatePosterClientProps = {
  templateId: PosterTemplateId;
  pageTitle: string;
  pageDescription: string;
  requiresPhotoUpload?: boolean;
};

const inter = Inter({ subsets: ["latin"] });

const defaults = {
  title: "Viajo Sin Ver (Remix) [feat De La...]",
  artists: "Jon Z, De La Ghetto, Almighty, Miky...",
  totalTime: "9:29",
  cover: "/next.svg",
};

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY ?? "";

const createThemes: Array<{ label: string; value: PosterTheme }> = [
  { label: "Spotify dark", value: "dark" },
  { label: "Elegant inverse", value: "inverse" },
];

const createTwoThemes: Array<{ label: string; value: PosterTheme }> = [
  { label: "Black & White", value: "bw" },
  { label: "Color", value: "color" },
  { label: "Lo-fi", value: "lofi" },
];

const API_UNREACHABLE_MESSAGE =
  `Cannot reach the poster API at ${API_BASE_URL}. Set NEXT_PUBLIC_API_BASE_URL to your running backend URL.`;
const SHARE_DEFAULT_WIDTH = 1000;

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
  if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
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

const downloadBlobAsFile = (blob: Blob, fileName: string) => {
  const downloadUrl = URL.createObjectURL(blob);
  const linkEl = document.createElement("a");
  linkEl.href = downloadUrl;
  linkEl.download = fileName;
  document.body.append(linkEl);
  linkEl.click();
  linkEl.remove();
  URL.revokeObjectURL(downloadUrl);
};

const toJpegFile = (blob: Blob, fileName: string) => new File([blob], fileName, { type: "image/jpeg" });

const isShareCancelled = (error: unknown) => error instanceof Error && error.name === "AbortError";

const isUnsupportedShareError = (error: unknown) =>
  error instanceof Error && (error.name === "TypeError" || error.name === "NotSupportedError");

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

const loadImageElement = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image: HTMLImageElement = document.createElement("img");

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read the selected image."));
    };

    image.src = objectUrl;
  });

const compressImageFile = async (file: File) => {
  const image = await loadImageElement(file);
  const targetWidth = 1000;
  const targetHeight = Math.max(1, Math.round((image.height / image.width) * targetWidth));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to process the image in this browser.");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (!value) {
          reject(new Error("Unable to compress the image. Please try another file."));
          return;
        }

        resolve(value);
      },
      "image/jpeg",
      0.85,
    );
  });

  return blob;
};

const uploadImageToImgbb = async (imageBlob: Blob) => {
  if (!IMGBB_API_KEY) {
    throw new Error("Missing NEXT_PUBLIC_IMGBB_API_KEY. Add it to your frontend environment.");
  }

  const formData = new FormData();
  formData.append("image", imageBlob, "cover.jpg");

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}&expiration=60`, {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as {
    data?: { url?: string; display_url?: string };
    error?: { message?: string };
  };

  if (!response.ok || !payload?.data?.url) {
    const detail = payload?.error?.message ? `: ${payload.error.message}` : "";
    throw new Error(`Image upload failed${detail}`);
  }

  return payload.data.url;
};

export function CreatePosterClient({ templateId, pageTitle, pageDescription, requiresPhotoUpload = false }: CreatePosterClientProps) {
  const availableThemes = requiresPhotoUpload ? createTwoThemes : createThemes;
  const defaultTheme = availableThemes[0]?.value ?? "dark";
  const [artistQuery, setArtistQuery] = useState("");
  const [songQuery, setSongQuery] = useState("");
  const [artistResults, setArtistResults] = useState<Artist[]>([]);
  const [trackResults, setTrackResults] = useState<Track[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [theme, setTheme] = useState<PosterTheme>(defaultTheme);
  const [showPoster, setShowPoster] = useState(false);
  const [isExporting, setIsExporting] = useState<number | null>(null);
  const [isPreparingPosterImage, setIsPreparingPosterImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [generatedPosterRequest, setGeneratedPosterRequest] = useState<PosterRenderRequest | null>(null);
  const [cachedPosterImage, setCachedPosterImage] = useState<{ blob: Blob; file: File; fileName: string } | null>(null);
  const prepareRenderIdRef = useRef(0);

  useEffect(() => {
    setTheme(defaultTheme);
  }, [defaultTheme]);

  const posterPayload: PosterRenderRequest = useMemo(
    () =>
      buildPosterRenderRequest({
        template: templateId,
        track: selectedTrack
          ? {
              title: selectedTrack.title,
              artists: getTrackArtists(selectedTrack),
              totalTime: formatTime(selectedTrack.durationSeconds),
              currentTime: getElapsedTime(formatTime(selectedTrack.durationSeconds)),
              uri: selectedTrack.uri ?? "",
              spotifyUrl: selectedTrack.spotifyUrl ?? "",
            }
          : {
              title: defaults.title,
              artists: defaults.artists,
              totalTime: defaults.totalTime,
              currentTime: getElapsedTime(defaults.totalTime),
            },
        artwork: {
          coverUrl: requiresPhotoUpload ? resolveCoverUrl(uploadedPhotoUrl) : resolveCoverUrl(selectedTrack?.coverUrl),
        },
        theme,
      }),
    [selectedTrack, templateId, theme, requiresPhotoUpload, uploadedPhotoUrl],
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    console.log("[CreatePosterClient] active template", {
      templateId,
      route: typeof window !== "undefined" ? window.location.pathname : "server",
    });
  }, [templateId]);

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


  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setShowPoster(false);

    setPhotoPreviewUrl((previousPhotoUrl) => {
      if (previousPhotoUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previousPhotoUrl);
      }

      if (!file) return null;
      return URL.createObjectURL(file);
    });

    setUploadedPhotoUrl(null);
    setPhotoError(null);
    setSearchError(null);

    if (!file) {
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const compressedImage = await compressImageFile(file);
      const hostedUrl = await uploadImageToImgbb(compressedImage);
      setUploadedPhotoUrl(hostedUrl);
    } catch (error) {
      setPhotoError(getRequestErrorMessage(error, "Unable to upload your photo right now."));
      setUploadedPhotoUrl(null);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  useEffect(() => {
    return () => {
      if (photoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const handleGeneratePoster = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isGenerating) return;

    if (!selectedTrack) {
      setSearchError("Please select a song to generate this poster");
      return;
    }

    if (requiresPhotoUpload && !uploadedPhotoUrl) {
      setSearchError("Please upload a photo successfully before generating this poster");
      return;
    }

    setIsGenerating(true);
    prepareRenderIdRef.current += 1;
    setCachedPosterImage(null);
    setGeneratedPosterRequest(null);
    try {
      const previewRequest: PosterRenderRequest = buildPosterRenderRequest({
        template: templateId,
        track: posterPayload.track,
        artwork: posterPayload.artwork,
        theme,
      });
      if (process.env.NODE_ENV === "development") {
        console.log("[CreatePosterClient] preview template", previewRequest.template);
      }

      const response = await fetch(`${API_BASE_URL}/api/posters/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewRequest),
      });

      if (!response.ok) throw new Error(await readErrorResponse(response));
      const payload = (await response.json()) as { html?: string };
      setPreviewHtml(payload.html || null);
      setShowPoster(true);
      setSearchError(null);
      setGeneratedPosterRequest(previewRequest);
      void preparePosterImageInBackground(previewRequest);
    } catch (error) {
      setSearchError(getRequestErrorMessage(error, "Unable to render preview right now."));
    } finally {
      setIsGenerating(false);
    }
  };

  const renderPosterImage = async (width: number, sourceRequest?: PosterRenderRequest) => {
    const baseRequest = sourceRequest ?? generatedPosterRequest ?? posterPayload;
    const renderRequest: PosterRenderRequest = buildPosterRenderRequest({
      template: baseRequest.template,
      track: baseRequest.track,
      artwork: baseRequest.artwork,
      theme: baseRequest.theme,
      output: { width, format: "jpeg", quality: 0.92 },
    });
    if (process.env.NODE_ENV === "development") {
      console.log("[CreatePosterClient] render template", renderRequest.template);
    }

    const response = await fetch(`${API_BASE_URL}/api/posters/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(renderRequest),
    });

    if (!response.ok) {
      throw new Error(await readErrorResponse(response));
    }

    const blob = await response.blob();
    const fileName = `${sanitizeFileName(baseRequest.track.title)}-poster-${width}.jpg`;
    return { blob, fileName, file: toJpegFile(blob, fileName) };
  };

  const preparePosterImageInBackground = async (sourceRequest: PosterRenderRequest) => {
    const currentRenderId = prepareRenderIdRef.current + 1;
    prepareRenderIdRef.current = currentRenderId;
    setIsPreparingPosterImage(true);
    setCachedPosterImage(null);

    try {
      const { blob, fileName, file } = await renderPosterImage(SHARE_DEFAULT_WIDTH, sourceRequest);
      if (prepareRenderIdRef.current !== currentRenderId) return;
      setCachedPosterImage({ blob, fileName, file });
    } catch (error) {
      if (prepareRenderIdRef.current !== currentRenderId) return;
      setSearchError(getRequestErrorMessage(error, "Unable to prepare the poster image right now."));
    } finally {
      if (prepareRenderIdRef.current === currentRenderId) {
        setIsPreparingPosterImage(false);
      }
    }
  };

  const getCachedPosterImage = async () => {
    if (cachedPosterImage) {
      return cachedPosterImage;
    }

    const sourceRequest = generatedPosterRequest ?? posterPayload;
    setIsPreparingPosterImage(true);
    try {
      const rendered = await renderPosterImage(SHARE_DEFAULT_WIDTH, sourceRequest);
      const cached = { blob: rendered.blob, fileName: rendered.fileName, file: rendered.file };
      setCachedPosterImage(cached);
      return cached;
    } finally {
      setIsPreparingPosterImage(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(SHARE_DEFAULT_WIDTH);
    try {
      const { blob, fileName } = await getCachedPosterImage();
      downloadBlobAsFile(blob, fileName);
    } catch (error) {
      setSearchError(getRequestErrorMessage(error, "Poster export failed. Please try again."));
    } finally {
      setIsExporting(null);
    }
  };

  const handleShare = async (includeSong: boolean) => {
    setIsExporting(SHARE_DEFAULT_WIDTH);
    try {
      const { blob, fileName, file } = await getCachedPosterImage();
      const sharePayload: ShareData = {
        files: [file],
        title: "Soundframe poster",
        ...(includeSong ? { text: `Listen to the song: ${selectedTrack?.spotifyUrl ?? ""}` } : {}),
      };

      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }));

      if (!canShareFiles) {
        downloadBlobAsFile(blob, fileName);
        return;
      }

      try {
        await navigator.share(sharePayload);
      } catch (error) {
        if (isShareCancelled(error)) {
          return;
        }

        if (isUnsupportedShareError(error)) {
          downloadBlobAsFile(blob, fileName);
          return;
        }

        throw error;
      }
    } catch (error) {
      setSearchError(getRequestErrorMessage(error, "Poster share failed. Please try again."));
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
        <header className="flex items-center justify-between rounded-full border border-stone-200 bg-white/90 px-6 py-3">
          <Link href="/" className={`${inter.className} text-xl tracking-tight`}>
            <span className="font-bold text-[#111]">Sound</span>
            <span className="font-light text-[#777]">frame</span>
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
            <h1 className="text-3xl font-semibold tracking-tight">{pageTitle}</h1>
            <p className="mt-2 text-sm text-stone-600">{pageDescription}</p>

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
                  {availableThemes.map((themeOption) => (
                    <label key={themeOption.value}>
                      <input
                        type="radio"
                        checked={theme === themeOption.value}
                        onChange={() => setTheme(themeOption.value)}
                      />{" "}
                      {themeOption.label}
                    </label>
                  ))}
                </div>
              </fieldset>


              {requiresPhotoUpload ? (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-stone-700">
                    Upload photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2"
                    />
                  </label>
                  {isUploadingPhoto ? <p className="text-xs text-stone-500">Processing and uploading your image...</p> : null}
                  {!isUploadingPhoto && uploadedPhotoUrl ? (
                    <p className="text-xs text-emerald-700">Image uploaded successfully. Temporary link ready.</p>
                  ) : null}
                  {photoPreviewUrl ? (
                    <Image src={photoPreviewUrl} alt="Uploaded preview" width={96} height={96} unoptimized className="h-24 w-24 rounded-lg border border-stone-200 object-cover" />
                  ) : null}
                  {photoError ? <p className="text-xs text-red-600">{photoError}</p> : null}
                </div>
              ) : null}

              {searchError ? <p className="text-xs text-red-600">{searchError}</p> : null}

              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white"
                disabled={isGenerating || isUploadingPhoto}
              >
                {isGenerating ? "Rendering..." : "Generate poster"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="w-full max-w-[400px]">
                <div className="legacy-poster-shell">
                  {previewHtml ? (
                    <div className="legacy-poster-preview-viewport">
                      <iframe title="Poster preview" srcDoc={previewHtml} className="legacy-poster-preview-frame" />
                    </div>
                  ) : (
                    <div className="legacy-poster-preview-empty" aria-label="Poster preview placeholder">
                      <p className={`${inter.className} legacy-poster-preview-brand`}>
                        <span className="font-bold text-[#111]">Sound</span>
                        <span className="font-light text-[#777]">frame</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleShare(false)}
                    disabled={!showPoster || isExporting !== null || isPreparingPosterImage}
                    className="w-full rounded-full bg-stone-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {isPreparingPosterImage ? "Preparing image..." : isExporting === SHARE_DEFAULT_WIDTH ? "Sharing..." : "Share image"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare(true)}
                    disabled={!showPoster || isExporting !== null || isPreparingPosterImage}
                    className="w-full rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 disabled:opacity-60"
                  >
                    {isPreparingPosterImage ? "Preparing image..." : isExporting === SHARE_DEFAULT_WIDTH ? "Sharing..." : "Share image + song"}
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={!showPoster || isExporting !== null || isPreparingPosterImage}
                    className="w-full rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 disabled:opacity-60 sm:col-span-2"
                  >
                    {isPreparingPosterImage ? "Preparing image..." : isExporting === SHARE_DEFAULT_WIDTH ? "Exporting..." : "Download image"}
                  </button>
                </div>
              </div>

              <aside className="w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 xl:max-w-[320px]">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-900">Disclaimer</h2>
                {requiresPhotoUpload ? (
                  <>
                    <p className="mt-3 leading-relaxed">
                      Uploaded photos are compressed in your browser and then temporarily hosted to render your poster.
                    </p>
                    <p className="mt-3 leading-relaxed">
                      The temporary URL may be publicly accessible for a short time and expires after about 60 seconds.
                    </p>
                    <p className="mt-3 leading-relaxed">
                      Download your poster promptly. Use this service under your own responsibility.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 leading-relaxed">
                      Soundframe generated images are provided for free use under sole user responsibility.
                    </p>
                    <p className="mt-3 leading-relaxed">
                      This service is provided as-is, without warranties and on a non-profit basis; we are not responsible for generated content or for how it is ultimately used.
                    </p>
                  </>
                )}
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
