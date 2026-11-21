export interface Screenshot {
  id: string;
  name: string;
  content: string;
}

export interface Note {
  id: string;
  title: string;
  date?: string;
  explanations: string;
  screenshots: Screenshot[];
  createdAt: string;
  updatedAt: string;
}
