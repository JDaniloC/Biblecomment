import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const sendMock = vi.fn();
vi.mock("resend", () => {
  class Resend {
    emails = { send: sendMock };
    constructor(_key?: string) {}
  }
  return { Resend };
});

vi.mock("./logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { sendEmail, getMemoryInbox, clearMemoryInbox } from "./email";
import { logger } from "./logger";

const payload = {
  to: "alice@example.com",
  subject: "Hello",
  html: "<p>Hi</p>",
  text: "Hi",
};

describe("sendEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "x" }, error: null });
    clearMemoryInbox();
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.EMAIL_TRANSPORT;
    vi.mocked(logger.warn).mockClear();
    vi.mocked(logger.info).mockClear();
    vi.mocked(logger.debug).mockClear();
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.EMAIL_TRANSPORT;
  });

  it("memory transport captures the email and skips Resend", async () => {
    process.env.EMAIL_TRANSPORT = "memory";
    process.env.RESEND_API_KEY = "re_should_be_ignored";

    await sendEmail(payload);

    expect(sendMock).not.toHaveBeenCalled();
    const inbox = getMemoryInbox();
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({ to: payload.to, subject: payload.subject });
  });

  it("no-ops with a warning when RESEND_API_KEY is missing", async () => {
    await sendEmail(payload);

    expect(sendMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(getMemoryInbox()).toHaveLength(0);
  });

  it("calls Resend with from/to/subject/html/text when key is set", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Bible Comment <noreply@example.com>";

    await sendEmail(payload);

    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock).toHaveBeenCalledWith({
      from: "Bible Comment <noreply@example.com>",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
  });

  it("falls back to onboarding@resend.dev when EMAIL_FROM is unset", async () => {
    process.env.RESEND_API_KEY = "re_test";

    await sendEmail(payload);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "onboarding@resend.dev" }),
    );
  });

  it("throws when Resend reports an error", async () => {
    process.env.RESEND_API_KEY = "re_test";
    sendMock.mockResolvedValue({ data: null, error: { message: "bad recipient" } });

    await expect(sendEmail(payload)).rejects.toThrow(/Resend: bad recipient/);
  });

  it("clearMemoryInbox empties the inbox", async () => {
    process.env.EMAIL_TRANSPORT = "memory";
    await sendEmail(payload);
    expect(getMemoryInbox()).toHaveLength(1);

    clearMemoryInbox();
    expect(getMemoryInbox()).toHaveLength(0);
  });
});
