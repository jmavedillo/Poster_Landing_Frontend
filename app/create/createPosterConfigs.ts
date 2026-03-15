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
    pageTitle: "Create your visual",
    pageDescription: "Search an artist and song, then render and export your visual.",
    requiresPhotoUpload: false,
  },
  create2: {
    templateId: "minimal-clean-v1",
    pageTitle: "Create your visual",
    pageDescription: "Use your photo and song details to craft a clean, emotional visual.",
    requiresPhotoUpload: true,
  },
} satisfies Record<string, CreatePosterPageConfig>;
