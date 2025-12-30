
export interface LocationInfo {
  name: string;
  description: string;
  elevation: string;
  location: string;
  facts: string[];
}

export interface PanoState {
  progress: number;
  showControls: boolean;
  isAiLoading: boolean;
  aiInfo: LocationInfo | null;
}
