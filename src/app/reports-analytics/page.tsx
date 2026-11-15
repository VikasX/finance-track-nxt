import type { Metadata } from "next";
import { Reports } from "@/components/pages/reports";
export const metadata: Metadata = { title: "Reports & Analytics" };
export default function Page() {
  return <Reports />;
}
