export interface Note {
  id: string;
  title: string;
  date?: string;
  explanations: string;
  screenshots: { id: string; name: string; content: string }[];
  createdAt: string;
  updatedAt: string;
}
