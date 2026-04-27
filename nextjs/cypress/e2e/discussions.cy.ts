/**
 * Discussion lifecycle: create / get / answer / delete + answer notification.
 *
 * Pairs with discussions backend in api/discussion/[abbrev]/route.ts (list+create)
 * and api/discussion/[abbrev]/[id]/route.ts (get+answer+delete) — the PATCH/DELETE
 * were moved to [id] in CR-5.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Discussions — create, answer, notify, delete", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice, users.bob, users.mod],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
  });

  describe("Create", () => {
    it("authenticated user creates a discussion under a book", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: {
          verseReference: "Gn 1:1",
          verseText: "No princípio, Deus criou os céus e a terra.",
          commentText: "",
          question: "O que significa 'princípio' aqui?",
        },
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body).to.have.property("username", "alice");
        expect(res.body).to.have.property("bookAbbrev", "gn");
        expect(res.body).to.have.property("question", "O que significa 'princípio' aqui?");
        expect(res.body).to.have.property("_id");
      });
    });

    it("rejects anonymous POST with 401", () => {
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: { verseReference: "Gn 1:1", question: "?" },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });

    it("rejects empty question with 400", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: { verseReference: "Gn 1:1", question: "" },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
      });
    });
  });

  describe("Answer + notification", () => {
    it("when bob answers alice's discussion, alice gets exactly one notification", () => {
      // alice creates the discussion
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: {
          verseReference: "Gn 1:1",
          question: "Discussão de alice",
        },
      }).then((createRes) => {
        const discussionId = createRes.body._id as string;

        // bob answers
        cy.clearCookies();
        cy.loginAs(users.bob.email, users.bob.password);
        cy.request({
          method: "PATCH",
          url: `/api/discussion/gn/${discussionId}`,
          body: { text: "Resposta do bob — sem mention" },
        }).then((patchRes) => {
          expect(patchRes.status).to.eq(200);
          expect(patchRes.body.answers).to.have.length(1);
          expect(patchRes.body.answers[0]).to.deep.include({
            name: "bob",
            text: "Resposta do bob — sem mention",
          });
        });

        // alice should now have one unread notification of type discussion_answer
        cy.clearCookies();
        cy.loginAs(users.alice.email, users.alice.password);
        cy.request("/api/notifications").then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body.unread, "alice should have 1 unread notification").to.eq(1);
          const note = res.body.items.find(
            (n: { type: string }) => n.type === "discussion_answer",
          );
          expect(note, "discussion_answer notification missing").to.exist;
          expect(note.actor).to.eq("bob");
          expect(note.recipient).to.eq("alice");
          expect(note.url).to.eq(`/discussion/gn/${discussionId}`);
        });
      });
    });

    it("answering your own discussion creates NO notification (self-skip)", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: { verseReference: "Gn 1:1", question: "alice talks to herself" },
      }).then((createRes) => {
        const discussionId = createRes.body._id as string;

        cy.request({
          method: "PATCH",
          url: `/api/discussion/gn/${discussionId}`,
          body: { text: "alice answering alice" },
        });

        cy.request("/api/notifications").then((res) => {
          expect(res.body.unread, "self-answer must not notify").to.eq(0);
        });
      });
    });
  });

  describe("Update answer", () => {
    it("answer owner can edit their own answer text", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: { verseReference: "Gn 1:1", question: "hi" },
      }).then((createRes) => {
        const discussionId = createRes.body._id as string;

        cy.clearCookies();
        cy.loginAs(users.bob.email, users.bob.password);
        cy.request({
          method: "PATCH",
          url: `/api/discussion/gn/${discussionId}`,
          body: { text: "first version" },
        }).then((patchRes) => {
          const answerId = (patchRes.body.answers as Array<{ _id: string }>)[0]._id;

          // bob edits his own answer
          cy.request({
            method: "PATCH",
            url: `/api/discussion/gn/${discussionId}/answers/${answerId}`,
            body: { text: "edited version" },
          }).then((editRes) => {
            expect(editRes.status).to.eq(200);
            const updated = (editRes.body.answers as Array<{ _id: string; text: string }>).find(
              (a) => a._id === answerId,
            );
            expect(updated?.text).to.eq("edited version");
          });
        });
      });
    });

    it("non-owner gets 403 when editing someone else's answer", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: { verseReference: "Gn 1:1", question: "hi" },
      }).then((createRes) => {
        const discussionId = createRes.body._id as string;

        cy.clearCookies();
        cy.loginAs(users.bob.email, users.bob.password);
        cy.request({
          method: "PATCH",
          url: `/api/discussion/gn/${discussionId}`,
          body: { text: "bob's answer" },
        }).then((patchRes) => {
          const answerId = (patchRes.body.answers as Array<{ _id: string }>)[0]._id;

          // alice tries to edit bob's answer — must fail
          cy.clearCookies();
          cy.loginAs(users.alice.email, users.alice.password);
          cy.request({
            method: "PATCH",
            url: `/api/discussion/gn/${discussionId}/answers/${answerId}`,
            body: { text: "hijack attempt" },
            failOnStatusCode: false,
          }).then((res) => {
            expect(res.status).to.eq(403);
          });
        });
      });
    });

    it("moderator can edit any answer", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: { verseReference: "Gn 1:1", question: "hi" },
      }).then((createRes) => {
        const discussionId = createRes.body._id as string;

        cy.clearCookies();
        cy.loginAs(users.bob.email, users.bob.password);
        cy.request({
          method: "PATCH",
          url: `/api/discussion/gn/${discussionId}`,
          body: { text: "bob's answer" },
        }).then((patchRes) => {
          const answerId = (patchRes.body.answers as Array<{ _id: string }>)[0]._id;

          cy.clearCookies();
          cy.loginAs(users.mod.email, users.mod.password);
          cy.request({
            method: "PATCH",
            url: `/api/discussion/gn/${discussionId}/answers/${answerId}`,
            body: { text: "moderated content" },
          }).then((res) => {
            expect(res.status).to.eq(200);
          });
        });
      });
    });

    it("404 when answerId doesn't exist", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: { verseReference: "Gn 1:1", question: "hi" },
      }).then((createRes) => {
        const discussionId = createRes.body._id as string;
        cy.request({
          method: "PATCH",
          url: `/api/discussion/gn/${discussionId}/answers/507f1f77bcf86cd799439011`,
          body: { text: "x" },
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(404);
        });
      });
    });

    it("400 with empty text", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: { verseReference: "Gn 1:1", question: "hi" },
      }).then((createRes) => {
        const discussionId = createRes.body._id as string;

        cy.request({
          method: "PATCH",
          url: `/api/discussion/gn/${discussionId}`,
          body: { text: "first" },
        }).then((patchRes) => {
          const answerId = (patchRes.body.answers as Array<{ _id: string }>)[0]._id;

          cy.request({
            method: "PATCH",
            url: `/api/discussion/gn/${discussionId}/answers/${answerId}`,
            body: { text: "" },
            failOnStatusCode: false,
          }).then((res) => {
            expect(res.status).to.eq(400);
          });
        });
      });
    });
  });

  describe("Delete", () => {
    it("owner can delete their own discussion", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: { verseReference: "Gn 1:1", question: "to delete" },
      }).then((createRes) => {
        const id = createRes.body._id as string;
        cy.request({ method: "DELETE", url: `/api/discussion/gn/${id}` }).then((res) => {
          expect(res.status).to.eq(200);
        });
      });
    });

    it("moderator can delete anyone's discussion", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: { verseReference: "Gn 1:1", question: "alice's, mod deletes" },
      }).then((createRes) => {
        const id = createRes.body._id as string;

        cy.clearCookies();
        cy.loginAs(users.mod.email, users.mod.password);
        cy.request({ method: "DELETE", url: `/api/discussion/gn/${id}` }).then((res) => {
          expect(res.status).to.eq(200);
        });
      });
    });

    it("non-owner non-moderator gets 403", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: { verseReference: "Gn 1:1", question: "alice's" },
      }).then((createRes) => {
        const id = createRes.body._id as string;

        cy.clearCookies();
        cy.loginAs(users.bob.email, users.bob.password);
        cy.request({
          method: "DELETE",
          url: `/api/discussion/gn/${id}`,
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(403);
        });
      });
    });
  });
});
