import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import { Discussion, DiscussionAnswer } from "@/domain/entities/Discussion";

export class GetDiscussionsUseCase {
  constructor(private readonly discussionRepo: IDiscussionRepository) {}

  async execute(bookAbbrev: string): Promise<Discussion[]> {
    return this.discussionRepo.findByBookAbbrev(bookAbbrev);
  }
}

export class GetDiscussionByIdUseCase {
  constructor(private readonly discussionRepo: IDiscussionRepository) {}

  async execute(id: string): Promise<Discussion | null> {
    return this.discussionRepo.findById(id);
  }
}

export class GetAllDiscussionsPaginatedUseCase {
  constructor(private readonly discussionRepo: IDiscussionRepository) {}

  async execute(page: number, pageSize: number): Promise<Discussion[]> {
    return this.discussionRepo.findAllPaginated(page, pageSize);
  }
}

export class CreateDiscussionUseCase {
  constructor(private readonly discussionRepo: IDiscussionRepository) {}

  async execute(
    bookAbbrev: string,
    username: string,
    verseReference: string,
    verseText: string,
    commentText: string,
    question: string,
    commentId?: string
  ): Promise<Discussion> {
    return this.discussionRepo.create({
      bookAbbrev,
      commentId,
      username,
      verseReference,
      verseText,
      commentText,
      question,
      answers: [],
    });
  }
}

export class AddAnswerUseCase {
  constructor(private readonly discussionRepo: IDiscussionRepository) {}

  async execute(id: string, answer: DiscussionAnswer): Promise<Discussion> {
    const updated = await this.discussionRepo.addAnswer(id, answer);
    if (!updated) throw new Error("Discussion not found");
    return updated;
  }
}

export class UpdateAnswerUseCase {
  constructor(private readonly discussionRepo: IDiscussionRepository) {}

  async execute(
    discussionId: string,
    answerId: string,
    requesterUsername: string,
    isModerator: boolean,
    text: string,
  ): Promise<Discussion> {
    const discussion = await this.discussionRepo.findById(discussionId);
    if (!discussion) throw new Error("Discussion not found");

    const answer = discussion.answers.find((a) => a._id === answerId);
    if (!answer) throw new Error("Answer not found");

    if (!isModerator && answer.name !== requesterUsername) {
      throw new Error("Unauthorized");
    }

    const updated = await this.discussionRepo.updateAnswer(discussionId, answerId, text);
    if (!updated) throw new Error("Discussion not found");
    return updated;
  }
}

export class DeleteDiscussionUseCase {
  constructor(private readonly discussionRepo: IDiscussionRepository) {}

  async execute(id: string, username: string, isModerator: boolean): Promise<void> {
    const discussion = await this.discussionRepo.findById(id);
    if (!discussion) throw new Error("Discussion not found");
    if (!isModerator && discussion.username !== username) throw new Error("Unauthorized");
    await this.discussionRepo.delete(id);
  }
}

export class GetAllDiscussionsUseCase {
  constructor(private readonly discussionRepo: IDiscussionRepository) {}

  async execute(): Promise<Discussion[]> {
    return this.discussionRepo.findAll();
  }
}
