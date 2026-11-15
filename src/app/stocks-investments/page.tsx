import type { Metadata } from "next";
import { Investments } from "@/components/pages/investments";
export const metadata: Metadata = { title: "Stocks & Mutual Funds" };
export default function Page() {
  return <Investments />;
}
