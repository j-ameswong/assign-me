import { describe, it, expect } from "vitest";
import { sendAllocationEmails } from "@/lib/email";

describe("sendAllocationEmails", () => {
  it("returns sent count equal to number of payloads", async () => {
    const payloads = [
      { email: "a@test.com", eventTitle: "Test Event", optionName: "Option A" },
      { email: "b@test.com", eventTitle: "Test Event", optionName: null },
    ];

    const result = await sendAllocationEmails(payloads);

    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("returns zero sent and zero failed for empty array", async () => {
    const result = await sendAllocationEmails([]);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("handles a single assigned payload", async () => {
    const result = await sendAllocationEmails([
      { email: "a@test.com", eventTitle: "My Event", optionName: "Project X" },
    ]);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("handles a single unassigned payload (optionName: null)", async () => {
    const result = await sendAllocationEmails([
      { email: "a@test.com", eventTitle: "My Event", optionName: null },
    ]);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("returns a Promise", () => {
    const result = sendAllocationEmails([]);
    expect(result).toBeInstanceOf(Promise);
  });
});
