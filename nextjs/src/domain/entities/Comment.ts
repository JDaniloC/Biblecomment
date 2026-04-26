export interface Comment {
  _id?: string;
  verseId: string;
  username: string;
  onTitle: boolean;
  bookReference: string;
  text: string;
  tags: string[];
  reports: string[];
  likes: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
