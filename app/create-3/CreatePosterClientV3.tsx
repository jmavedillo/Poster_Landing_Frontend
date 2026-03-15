"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "../azteuno.png";
import "../create/legacyPoster.css";
import { buildMapMessageRenderRequest, MapMessageRenderRequest } from "./posterModelV3";

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
  url?: string | null;
  spotifyUrl?: string | null;
  external_urls?: {
    spotify?: string | null;
  } | null;
};

type PreviewResponseModel = {
  song?: {
    spotifyUrl?: string | null;
  };
  map?: {
    lat?: number | null;
    lng?: number | null;
    googleMapsUrl?: string | null;
    googleMapsDirectionsUrl?: string | null;
  };
};

type MapShareMetadata = {
  spotifyUrl: string | null;
  googleMapsDirectionsUrl: string | null;
  googleMapsUrl: string | null;
  lat: number | null;
  lng: number | null;
};

type MapMessageStyleVariant = "style1" | "style2" | "style3";

const MAP_MESSAGE_STYLE_OPTIONS: Array<{ value: MapMessageStyleVariant; label: string }> = [
  { value: "style1", label: "White" },
  { value: "style2", label: "Navy" },
  { value: "style3", label: "Green" },
];


const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY ?? "";
const API_UNREACHABLE_MESSAGE =
  `Cannot reach the poster API at ${API_BASE_URL}. Set NEXT_PUBLIC_API_BASE_URL to your running backend URL.`;
const SHARE_DEFAULT_WIDTH = 1000;
const NOMINATIM_REVERSE_GEOCODE_URL = "https://nominatim.openstreetmap.org/reverse";

const ensureHtmlBaseHref = (html: string, baseUrl: string) => {
  if (!html.trim()) return "";

  const baseTag = `<base href="${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}">`;
  if (/<base\s/i.test(html)) return html;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  }

  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${baseTag}</head>`);
  }

  return `<!doctype html><html><head>${baseTag}</head><body>${html}</body></html>`;
};

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

  const suffix = bodyText ? `: ${bodyText}` : "";
  return `Request failed (${response.status} ${response.statusText})${suffix}`;
};

const normalizeText = (value: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getTrackArtists = (track: Track | null) => (track?.artists || []).map((artist) => artist.name).join(", ");

const getTrackSpotifyUrl = (track: Track | null) =>
  track?.spotifyUrl || track?.external_urls?.spotify || track?.url || "";

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

const resolveGoogleMapsUrl = (metadata: MapShareMetadata): string | null => {
  if (metadata.googleMapsDirectionsUrl) return metadata.googleMapsDirectionsUrl;
  if (metadata.googleMapsUrl) return metadata.googleMapsUrl;

  if (typeof metadata.lat === "number" && typeof metadata.lng === "number") {
    return `https://www.google.com/maps/dir/?api=1&destination=${metadata.lat},${metadata.lng}`;
  }

  return null;
};

const resolveMapShareText = (metadata: MapShareMetadata) => {
  const spotifyUrl = metadata.spotifyUrl;
  const googleMapsUrl = resolveGoogleMapsUrl(metadata);
  const lines = [spotifyUrl ? `Mood: ${spotifyUrl}` : null, googleMapsUrl ? `Where: ${googleMapsUrl}` : null].filter(
    (line): line is string => Boolean(line),
  );

  return {
    spotifyUrl,
    googleMapsUrl,
    shareText: lines.join("\n"),
  };
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

const toLocalDateInputValue = (date: Date) => {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
};

const toLocalTimeInputValue = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const reverseGeocodeCoordinates = async (latitude: number, longitude: number): Promise<string> => {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "16",
  });
  const response = await fetch(`${NOMINATIM_REVERSE_GEOCODE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Could not resolve your current location. You can still type it manually.");
  }

  const payload = (await response.json()) as { display_name?: string; name?: string };
  const resolvedLocation = payload?.display_name || payload?.name;

  if (!resolvedLocation) {
    throw new Error("Could not resolve your current location. You can still type it manually.");
  }

  return resolvedLocation;
};

export function CreatePosterClientV3() {
  const [locationQuery, setLocationQuery] = useState("");
  const [artistQuery, setArtistQuery] = useState("");
  const [songQuery, setSongQuery] = useState("");
  const [dateText, setDateText] = useState("");
  const [timeText, setTimeText] = useState("");
  const [messageIntro, setMessageIntro] = useState("");
  const [messageMain, setMessageMain] = useState("");
  const [styleVariant, setStyleVariant] = useState<MapMessageStyleVariant>("style1");
  const [useCurrentContext, setUseCurrentContext] = useState(false);
  const [autoFillHelperMessage, setAutoFillHelperMessage] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [artistResults, setArtistResults] = useState<Artist[]>([]);
  const [trackResults, setTrackResults] = useState<Track[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const [showPoster, setShowPoster] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreparingPosterImage, setIsPreparingPosterImage] = useState(false);
  const [isExporting, setIsExporting] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [mapShareMetadata, setMapShareMetadata] = useState<MapShareMetadata | null>(null);
  const [generatedPosterRequest, setGeneratedPosterRequest] = useState<MapMessageRenderRequest | null>(null);
  const [cachedPosterImage, setCachedPosterImage] = useState<{ blob: Blob; file: File; fileName: string } | null>(null);
  const prepareRenderIdRef = useRef(0);
  const [previewDocumentUrl, setPreviewDocumentUrl] = useState<string | null>(null);
  const trimmedLocationQuery = locationQuery.trim();
  const { shareText: linkShareText } = useMemo(
    () =>
      mapShareMetadata
        ? resolveMapShareText(mapShareMetadata)
        : {
            spotifyUrl: null,
            googleMapsUrl: null,
            shareText: "",
          },
    [mapShareMetadata],
  );

  const applyCurrentDateTimeAndLocation = async () => {
    const now = new Date();
    setDateText(toLocalDateInputValue(now));
    setTimeText(toLocalTimeInputValue(now));
    setAutoFillHelperMessage(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setAutoFillHelperMessage("Date and time were set. Location is unavailable on this browser, so please enter it manually.");
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const resolvedLocation = await reverseGeocodeCoordinates(position.coords.latitude, position.coords.longitude);
      setLocationQuery(resolvedLocation);
    } catch {
      setAutoFillHelperMessage("Date and time were set. We could not retrieve your location, so please enter it manually.");
    }
  };

  const handleUseCurrentContextToggle = async (enabled: boolean) => {
    setUseCurrentContext(enabled);
    if (enabled) {
      await applyCurrentDateTimeAndLocation();
      return;
    }

    setAutoFillHelperMessage(null);
  };

  useEffect(() => {
    return () => {
      if (photoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

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
    setFormError(null);

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
    if (!previewHtml) {
      setPreviewDocumentUrl(null);
      return;
    }

    const renderedHtml = ensureHtmlBaseHref(previewHtml, API_BASE_URL);
    const blob = new Blob([renderedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setPreviewDocumentUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [previewHtml]);

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
        setFormError(null);
      } catch (error) {
        if (isCancelled) return;
        setArtistResults([]);
        setSelectedArtist(null);
        setFormError(getRequestErrorMessage(error, "Unable to fetch artists right now."));
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
        setFormError(null);
      } catch (error) {
        if (isCancelled) return;
        setTrackResults([]);
        setSelectedTrack(null);
        setFormError(getRequestErrorMessage(error, "Unable to fetch tracks right now."));
      }
    }, DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [songQuery, artistQuery, selectedArtist]);

  const posterPayload = useMemo(
    () =>
      buildMapMessageRenderRequest({
        styleVariant,
        mapQuery: trimmedLocationQuery,
        photoUrl: uploadedPhotoUrl,
        song: {
          title: selectedTrack?.title ?? "",
          artist: getTrackArtists(selectedTrack),
          coverUrl: selectedTrack?.coverUrl ?? "",
          spotifyUrl: getTrackSpotifyUrl(selectedTrack),
        },
        time: {
          dateText,
          timeText,
        },
        message: {
          intro: messageIntro,
          main: messageMain,
        },
      }),
    [styleVariant, trimmedLocationQuery, selectedTrack, dateText, timeText, messageIntro, messageMain, uploadedPhotoUrl],
  );

  const renderPosterImage = async (width: number, sourceRequest?: MapMessageRenderRequest) => {
    const baseRequest = sourceRequest ?? generatedPosterRequest ?? posterPayload;
    const renderRequest = buildMapMessageRenderRequest({
      styleVariant: baseRequest.styleVariant,
      mapQuery: baseRequest.mapQuery,
      photoUrl: baseRequest.photoUrl ?? null,
      song: baseRequest.song,
      time: baseRequest.time,
      message: baseRequest.message,
      output: { width, format: "jpeg", quality: 0.92 },
    });

    console.log("[CreateV3] render location input", trimmedLocationQuery);
    console.log("[CreateV3] render payload", renderRequest);

    const response = await fetch(`${API_BASE_URL}/api/posters/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(renderRequest),
    });

    if (!response.ok) {
      throw new Error(await readErrorResponse(response));
    }

    const blob = await response.blob();
    const fileName = `${sanitizeFileName(baseRequest.song.title || baseRequest.mapQuery || "map-message")}-poster-${width}.jpg`;
    return { blob, fileName, file: toJpegFile(blob, fileName) };
  };

  const preparePosterImageInBackground = async (sourceRequest: MapMessageRenderRequest) => {
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
      setFormError(getRequestErrorMessage(error, "Unable to prepare the poster image right now."));
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

  const handleGeneratePoster = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isGenerating) return;

    if (!trimmedLocationQuery) {
      setFormError("Please enter a location to generate this visual");
      return;
    }

    if (!selectedTrack) {
      setFormError("Please select a song to generate this visual");
      return;
    }

    setIsGenerating(true);
    prepareRenderIdRef.current += 1;
    setCachedPosterImage(null);
    setGeneratedPosterRequest(null);
    setMapShareMetadata(null);
    try {
      const previewRequest = buildMapMessageRenderRequest({
        styleVariant,
        mapQuery: trimmedLocationQuery,
        photoUrl: uploadedPhotoUrl,
        song: {
          title: selectedTrack.title,
          artist: getTrackArtists(selectedTrack),
          coverUrl: selectedTrack.coverUrl ?? "",
          spotifyUrl: getTrackSpotifyUrl(selectedTrack),
        },
        time: {
          dateText,
          timeText,
        },
        message: {
          intro: messageIntro,
          main: messageMain,
        },
      });

      console.log("[CreateV3] location input", trimmedLocationQuery);
      console.log("[CreateV3] preview payload", previewRequest);

      const response = await fetch(`${API_BASE_URL}/api/posters/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewRequest),
      });

      if (!response.ok) throw new Error(await readErrorResponse(response));
      const payload = (await response.json()) as { html?: string; model?: PreviewResponseModel };
      setPreviewHtml(payload.html || null);
      setMapShareMetadata({
        spotifyUrl: payload.model?.song?.spotifyUrl ?? null,
        googleMapsDirectionsUrl: payload.model?.map?.googleMapsDirectionsUrl ?? null,
        googleMapsUrl: payload.model?.map?.googleMapsUrl ?? null,
        lat: payload.model?.map?.lat ?? null,
        lng: payload.model?.map?.lng ?? null,
      });
      setShowPoster(true);
      setFormError(null);
      setGeneratedPosterRequest(previewRequest);
      void preparePosterImageInBackground(previewRequest);
    } catch (error) {
      setFormError(getRequestErrorMessage(error, "Unable to render preview right now."));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(SHARE_DEFAULT_WIDTH);
    try {
      const { blob, fileName } = await getCachedPosterImage();
      downloadBlobAsFile(blob, fileName);
    } catch (error) {
      setFormError(getRequestErrorMessage(error, "Poster export failed. Please try again."));
    } finally {
      setIsExporting(null);
    }
  };

  const handleShare = async (includeLinks: boolean) => {
    setIsExporting(SHARE_DEFAULT_WIDTH);
    try {
      const { blob, fileName, file } = await getCachedPosterImage();
      const sharePayload: ShareData = {
        files: [file],
        title: "Soundframe visual",
        ...(includeLinks && linkShareText ? { text: linkShareText } : {}),
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
      setFormError(getRequestErrorMessage(error, "Poster share failed. Please try again."));
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
        <header className="flex items-center justify-between rounded-full border border-stone-200 bg-white/90 px-6 py-3">
          <Link href="/" aria-label="Azteuno home" className="inline-flex items-center">
            <Image src={logo} alt="Azteuno" className="h-auto w-36 md:w-40" priority />
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
            <h1 className="text-3xl font-semibold tracking-tight">Create your visual</h1>
            <p className="mt-2 text-sm text-stone-600">Set location, song, date, time, and your message to render your map-message visual.</p>

            <form className="mt-6 space-y-4" onSubmit={handleGeneratePoster}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm font-medium text-stone-700">
                <input
                  type="checkbox"
                  checked={useCurrentContext}
                  onChange={(e) => {
                    void handleUseCurrentContextToggle(e.target.checked);
                  }}
                  className="mt-1 h-5 w-5 flex-none accent-stone-900"
                />
                <span>Use my current location, date and time</span>
              </label>
              {autoFillHelperMessage ? <p className="text-xs text-amber-700">{autoFillHelperMessage}</p> : null}

              <label className="block text-sm font-semibold text-stone-700">
                Location
                <input type="text" value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2" />
              </label>

              <label className="block text-sm font-semibold text-stone-700">
                Date
                <input type="date" value={dateText} onChange={(e) => setDateText(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2" />
              </label>

              <label className="block text-sm font-semibold text-stone-700">
                Time
                <input type="time" value={timeText} onChange={(e) => setTimeText(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2" />
              </label>

              <label className="block text-sm font-semibold text-stone-700">
                Search by artist
                <input type="search" value={artistQuery} onChange={(e) => setArtistQuery(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2" list="artists-v3" />
              </label>
              <datalist id="artists-v3">
                {artistResults.map((artist) => (
                  <option key={artist.id} value={artist.name} />
                ))}
              </datalist>

              <label className="block text-sm font-semibold text-stone-700">
                Search by song
                <input type="search" value={songQuery} onChange={(e) => setSongQuery(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2" list="tracks-v3" />
              </label>
              <datalist id="tracks-v3">
                {trackResults.map((track) => (
                  <option key={track.id} value={`${track.title} — ${getTrackArtists(track)}`} />
                ))}
              </datalist>

              <label className="block text-sm font-semibold text-stone-700">
                Message intro
                <input type="text" value={messageIntro} onChange={(e) => setMessageIntro(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2" />
              </label>

              <label className="block text-sm font-semibold text-stone-700">
                Message main
                <textarea value={messageMain} onChange={(e) => setMessageMain(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2" rows={3} />
              </label>


              <fieldset className="block text-sm font-semibold text-stone-700">
                <legend>Visual style</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {MAP_MESSAGE_STYLE_OPTIONS.map((option) => {
                    const isSelected = styleVariant === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setStyleVariant(option.value)}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          isSelected ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                        }`}
                        aria-pressed={isSelected}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>


              <div className="space-y-2">
                <label className="block text-sm font-semibold text-stone-700">
                  Add photo (optional)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2"
                  />
                </label>
                {isUploadingPhoto ? <p className="text-xs text-stone-500">Processing and uploading your image...</p> : null}
                {!isUploadingPhoto && uploadedPhotoUrl ? <p className="text-xs text-emerald-700">Image uploaded successfully. Temporary link ready.</p> : null}
                {photoPreviewUrl ? (
                  <Image src={photoPreviewUrl} alt="Uploaded preview" width={96} height={96} unoptimized className="h-24 w-24 rounded-lg border border-stone-200 object-cover" />
                ) : null}
                {photoError ? <p className="text-xs text-red-600">{photoError}</p> : null}
              </div>

              {formError ? <p className="text-xs text-red-600">{formError}</p> : null}

              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white"
                disabled={isGenerating}
              >
                {isGenerating ? "Rendering..." : "Generate visual"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="w-full max-w-[400px]">
                <div className="legacy-poster-shell">
                  {previewDocumentUrl ? (
                    <div className="legacy-poster-preview-viewport">
                      <iframe title="Visual preview" src={previewDocumentUrl} className="legacy-poster-preview-frame" />
                    </div>
                  ) : (
                    <div className="legacy-poster-preview-empty" aria-label="Visual preview placeholder">
                      <Image src={logo} alt="Azteuno" className="h-auto w-36" priority />
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
                    disabled={!showPoster || !linkShareText || isExporting !== null || isPreparingPosterImage}
                    className="w-full rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 disabled:opacity-60"
                  >
                    {isPreparingPosterImage ? "Preparing image..." : isExporting === SHARE_DEFAULT_WIDTH ? "Sharing..." : "Share with links"}
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
                <p className="mt-3 leading-relaxed">
                  Soundframe generated images are provided for free use under sole user responsibility.
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
