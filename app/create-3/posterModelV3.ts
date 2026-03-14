export type MapMessageRenderRequest = {
  template: "map_message_v1";
  styleVariant: "style1" | "style2" | "style3";
  mapQuery: string;
  marker: {
    type: "pin";
  };
  song: {
    title: string;
    artist: string;
    coverUrl: string;
    spotifyUrl: string;
  };
  place: {
    title: string;
    subtitle: string;
  };
  time: {
    dateText: string;
    timeText: string;
  };
  message: {
    intro: string;
    main: string;
  };
  output: {
    width: number;
    format: "jpeg" | "png";
    quality?: number;
  };
};

type BuildMapMessageRequestInput = {
  styleVariant?: "style1" | "style2" | "style3";
  mapQuery: string;
  song: {
    title: string;
    artist: string;
    coverUrl: string;
    spotifyUrl: string;
  };
  time: {
    dateText: string;
    timeText: string;
  };
  message: {
    intro: string;
    main: string;
  };
  output?: {
    width: number;
    format: "jpeg" | "png";
    quality?: number;
  };
};

export const buildMapMessageRenderRequest = ({ styleVariant = "style1", mapQuery, song, time, message, output }: BuildMapMessageRequestInput): MapMessageRenderRequest => ({
  template: "map_message_v1",
  styleVariant,
  mapQuery,
  marker: {
    type: "pin",
  },
  song,
  place: {
    title: "",
    subtitle: "",
  },
  time,
  message,
  output:
    output ?? {
      width: 1000,
      format: "jpeg",
      quality: 0.92,
    },
});
