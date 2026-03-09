import { PosterTemplateId } from "./posterModel";

export type CreatePosterPageConfig = {
  templateId: PosterTemplateId;
  pageTitle: string;
  pageDescription: string;
  requiresPhotoUpload?: boolean;
};

export const createPosterConfigs = {
  create1: {
    templateId: "spotify-player-v1",
    pageTitle: "Create your poster",
    pageDescription: "Search an artist and song, then render and export.",
    requiresPhotoUpload: false,
  },
  create2: {
    templateId: "minimal-clean-v1",
    pageTitle: "Create your poster",
    pageDescription: "Use your photo and song details to craft a clean, emotional composition.",
    requiresPhotoUpload: true,
  },
} satisfies Record<string, CreatePosterPageConfig>;
