export type MapMessageRenderRequest = {
  template: "map_message_v1";
  mapQuery: string;
  marker: {
    type: "pin";
  };
  song: {
    title: string;
    artist: string;
    coverUrl: string;
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
  mapQuery: string;
  song: {
    title: string;
    artist: string;
    coverUrl: string;
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

export const buildMapMessageRenderRequest = ({ mapQuery, song, time, message, output }: BuildMapMessageRequestInput): MapMessageRenderRequest => ({
  template: "map_message_v1",
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
