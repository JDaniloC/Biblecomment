export interface DiscussionAnswer {
  _id?: string;
  name: string;
  text: string;
}

export interface Discussion {
  _id?: string;
  bookAbbrev: string;
  commentId?: string;
  username: string;
  verseReference: string;
  verseText: string;
  commentText: string;
  question: string;
  answers: DiscussionAnswer[];
  createdAt?: Date;
  updatedAt?: Date;
}

