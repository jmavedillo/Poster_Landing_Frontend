import { PosterTemplateId } from "./posterModel";

export type CreatePosterPageConfig = {
  templateId: PosterTemplateId;
  pageTitle: string;
  pageDescription: string;
  templateLabel: string;
  requiresPhotoUpload?: boolean;
};

export const createPosterConfigs = {
  create1: {
    templateId: "spotify-player-v1",
    pageTitle: "Create your poster",
    pageDescription: "Search an artist and song, then render and export.",
    templateLabel: "Template 1 · Spotify Player",
    requiresPhotoUpload: false,
  },
  create2: {
    templateId: "minimal-clean-v1",
    pageTitle: "Create your poster",
    pageDescription: "Template 2 keeps the same flow with a cleaner minimal composition.",
    templateLabel: "Template 2 · Minimal Clean",
    requiresPhotoUpload: true,
  },
} satisfies Record<string, CreatePosterPageConfig>;
