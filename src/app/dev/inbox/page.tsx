import { notFound } from "next/navigation";
import DevInboxClient from "./dev-inbox-client";

export default function DevInboxPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return <DevInboxClient />;
}
