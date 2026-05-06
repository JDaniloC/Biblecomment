export interface UserChapterRead {
  _id?: string;
  userId: string;
  abbrev: string;
  chapter: number;
  readAt: Date;
}
