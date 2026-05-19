import { describe, it, expect, vi } from "vitest";
import { PushNotificationService } from "./PushNotificationService";
import type { WebPushSender } from "./PushNotificationService";
import type { IPushSubscriptionRepository } from "@/domain/repositories/IPushSubscriptionRepository";
import type { StoredPushSubscription } from "@/domain/entities/PushSubscription";

function sub(endpoint: string): StoredPushSubscription {
  return { username: "alice", endpoint, p256dh: "p_" + endpoint, auth: "a_" + endpoint };
}

function setup(subs: StoredPushSubscription[], sendImpl: WebPushSender["send"]) {
  const deleteByEndpoints = vi.fn(async () => 0);
  const repo = {
    upsert: vi.fn(),
    findByUsername: vi.fn(async () => subs),
    deleteByEndpoint: vi.fn(),
    deleteByEndpoints,
  } as unknown as IPushSubscriptionRepository;
  const send = vi.fn(sendImpl);
  const sender = { send } as WebPushSender;
  return { svc: new PushNotificationService(repo, sender), send, deleteByEndpoints };
}

const payload = { title: "T", body: "B", url: "/x", tag: "comment_mention" };

describe("PushNotificationService", () => {
  it("sends the serialized payload to every subscription of the user", async () => {
    const { svc, send } = setup([sub("e1"), sub("e2")], async () => ({ ok: true }));
    await svc.sendToUser("alice", payload);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(
      { endpoint: "e1", keys: { p256dh: "p_e1", auth: "a_e1" } },
      JSON.stringify(payload),
    );
  });

  it("prunes only 404/410 endpoints, keeps others", async () => {
    const { svc, deleteByEndpoints } = setup(
      [sub("gone404"), sub("gone410"), sub("ok"), sub("err500")],
      async (t) => {
        if (t.endpoint === "gone404") return { ok: false, statusCode: 404 };
        if (t.endpoint === "gone410") return { ok: false, statusCode: 410 };
        if (t.endpoint === "err500") return { ok: false, statusCode: 500 };
        return { ok: true };
      },
    );
    await svc.sendToUser("alice", payload);
    expect(deleteByEndpoints).toHaveBeenCalledTimes(1);
    const arg = (deleteByEndpoints as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect([...arg].sort()).toEqual(["gone404", "gone410"]);
  });

  it("no subscriptions → no send, no prune", async () => {
    const { svc, send, deleteByEndpoints } = setup([], async () => ({ ok: true }));
    await svc.sendToUser("alice", payload);
    expect(send).not.toHaveBeenCalled();
    expect(deleteByEndpoints).not.toHaveBeenCalled();
  });

  it("a thrown sender error does not reject and does not prune", async () => {
    const { svc, deleteByEndpoints } = setup([sub("e1")], async () => {
      throw new Error("network");
    });
    await expect(svc.sendToUser("alice", payload)).resolves.toBeUndefined();
    expect(deleteByEndpoints).not.toHaveBeenCalled();
  });
});
