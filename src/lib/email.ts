// import { Resend } from "resend";
// const resend = new Resend(process.env.RESEND_API_KEY);
// const FROM = process.env.EMAIL_FROM ?? "AllocateMe <onboarding@resend.dev>";

interface AllocationEmailPayload {
  email: string;
  eventTitle: string;
  optionName: string | null; // null = unassigned
}

export async function sendAllocationEmails(
  payloads: AllocationEmailPayload[]
): Promise<{ sent: number; failed: number }> {
  // Email sending disabled — preview emails at /event/[id]/admin/emails
  // const results = await Promise.allSettled(
  //   payloads.map(({ email, eventTitle, optionName }) => {
  //     const subject = `Your allocation result for "${eventTitle}"`;
  //     const html = optionName
  //       ? `<p>Good news! You have been allocated to <strong>${optionName}</strong> for the event <em>${eventTitle}</em>.</p>`
  //       : `<p>Unfortunately, you were not allocated to any option for the event <em>${eventTitle}</em>.</p>`;
  //     return resend.emails.send({ from: FROM, to: email, subject, html });
  //   })
  // );
  // const failed = results.filter((r) => r.status === "rejected");
  // return { sent: results.length - failed.length, failed: failed.length };

  return { sent: payloads.length, failed: 0 };
}
