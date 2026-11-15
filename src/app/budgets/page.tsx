import type { Metadata } from "next";
import { Budgets } from "@/components/pages/budgets";
export const metadata: Metadata = { title: "Budgets" };
export default function Page() {
  return <Budgets />;
}
