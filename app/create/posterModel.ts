export type PosterTemplateId = "spotify-player-v1" | "minimal-clean-v1";
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
  template: PosterTemplateId;
  track: PosterTrackData;
  artwork: PosterArtworkData;
  theme: PosterTheme;
  output?: {
    width: number;
    format: "jpeg" | "png";
    quality?: number;
  };
};

export const buildPosterRenderRequest = ({ template, track, artwork, theme, output }: BuildRequestInput): PosterRenderRequest => ({
  template,
  theme,
  track,
  artwork,
  output:
    output ?? {
      width: 1000,
      format: "jpeg",
      quality: 0.92,
    },
});
