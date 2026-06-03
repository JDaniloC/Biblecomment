/*
 * Backfill denormalized counters on existing Discussion documents.
 *
 * Fields added in Phase 3:
 *   - answersCount  (derived from discussionanswers.discussionId)
 *   - likeCount     (derived from discussionlikes where targetType === "discussion")
 *
 * Collection names follow Mongoose defaults (model name lowercased + pluralized):
 *   Discussion      → discussions
 *   DiscussionAnswer → discussionanswers
 *   DiscussionLike   → discussionlikes
 */
module.exports = {
  async up(db) {
    // answersCount — group discussionanswers by discussionId.
    const answerCounts = await db
      .collection("discussionanswers")
      .aggregate([{ $group: { _id: "$discussionId", count: { $sum: 1 } } }])
      .toArray();

    for (const { _id, count } of answerCounts) {
      await db
        .collection("discussions")
        .updateOne({ _id }, { $set: { answersCount: count } });
    }

    // likeCount — group discussion-targeted likes by targetId.
    const likeCounts = await db
      .collection("discussionlikes")
      .aggregate([
        { $match: { targetType: "discussion" } },
        { $group: { _id: "$targetId", count: { $sum: 1 } } },
      ])
      .toArray();

    for (const { _id, count } of likeCounts) {
      await db
        .collection("discussions")
        .updateOne({ _id }, { $set: { likeCount: count } });
    }

    // Default 0 on any discussion that had no answers or no likes.
    await db
      .collection("discussions")
      .updateMany({ answersCount: { $exists: false } }, { $set: { answersCount: 0 } });
    await db
      .collection("discussions")
      .updateMany({ likeCount: { $exists: false } }, { $set: { likeCount: 0 } });
  },

  async down(db) {
    await db
      .collection("discussions")
      .updateMany({}, { $unset: { answersCount: "", likeCount: "" } });
  },
};
