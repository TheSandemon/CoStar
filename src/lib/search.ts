export type SearchResultType = 'all' | 'talent' | 'agency' | 'business' | 'job';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  image?: string | null;
  url: string;
}
