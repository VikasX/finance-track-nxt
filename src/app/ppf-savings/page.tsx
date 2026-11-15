import type { Metadata } from "next";
import { Savings } from "@/components/pages/savings";
export const metadata: Metadata = { title: "PPF & Savings" };
export default function Page() {
  return <Savings />;
}
