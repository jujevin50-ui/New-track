export interface Note {
  id: string;
  title: string;
  explanations: string;
  screenshots: { id: string; name: string; content: string }[];
  createdAt: string;
  updatedAt: string;
}
