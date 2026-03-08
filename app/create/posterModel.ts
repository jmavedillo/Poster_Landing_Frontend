export type PosterTemplateId = "spotify-player-v1";
export type PosterTheme = "dark" | "inverse";

export type PosterTrackData = {
  title: string;
  artists: string;
  currentTime: string;
  totalTime: string;
};

export type PosterArtworkData = {
  coverUrl: string;
};

export type PosterRenderRequest = {
  template: PosterTemplateId;
  theme: PosterTheme;
  track: PosterTrackData;
  artwork: PosterArtworkData;
  output: {
    width: number;
    format: "jpeg" | "png";
    quality?: number;
  };
};

type BuildRequestInput = {
  track: PosterTrackData;
  artwork: PosterArtworkData;
  theme: PosterTheme;
};

export const buildPosterRenderRequest = ({ track, artwork, theme }: BuildRequestInput): PosterRenderRequest => ({
  template: "spotify-player-v1",
  theme,
  track,
  artwork,
  output: {
    width: 1000,
    format: "jpeg",
    quality: 0.92,
  },
});
