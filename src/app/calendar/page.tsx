import type { Metadata } from "next";
import { Calendar } from "@/components/pages/calendar";
export const metadata: Metadata = { title: "Financial Calendar" };
export default function Page() {
  return <Calendar />;
}
