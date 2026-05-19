import { IPushSubscriptionRepository } from "@/domain/repositories/IPushSubscriptionRepository";
import type {
  PushSubscriptionInput,
  StoredPushSubscription,
} from "@/domain/entities/PushSubscription";
import {
  PushSubscriptionModel,
  IPushSubscriptionDocument,
} from "@/infrastructure/database/models/PushSubscriptionModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toEntity(doc: IPushSubscriptionDocument): StoredPushSubscription {
  return {
    _id: doc._id ? String(doc._id) : undefined,
    username: doc.username,
    endpoint: doc.endpoint,
    p256dh: doc.p256dh,
    auth: doc.auth,
    userAgent: doc.userAgent,
    createdAt: doc.createdAt,
  };
}

export class MongoPushSubscriptionRepository
  implements IPushSubscriptionRepository
{
  async upsert(sub: PushSubscriptionInput): Promise<void> {
    await connectToDatabase();
    // Endpoint is the stable identity; a re-subscribe (or a different
    // user on the same browser) overwrites the owner/keys.
    await PushSubscriptionModel.updateOne(
      { endpoint: sub.endpoint },
      {
        $set: {
          username: sub.username,
          p256dh: sub.p256dh,
          auth: sub.auth,
          userAgent: sub.userAgent,
        },
      },
      { upsert: true },
    );
  }

  async findByUsername(username: string): Promise<StoredPushSubscription[]> {
    await connectToDatabase();
    const docs = await PushSubscriptionModel.find({ username });
    return docs.map(toEntity);
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await connectToDatabase();
    await PushSubscriptionModel.deleteOne({ endpoint });
  }

  async deleteByEndpoints(endpoints: string[]): Promise<number> {
    if (endpoints.length === 0) return 0;
    await connectToDatabase();
    const res = await PushSubscriptionModel.deleteMany({
      endpoint: { $in: endpoints },
    });
    return res.deletedCount ?? 0;
  }
}
