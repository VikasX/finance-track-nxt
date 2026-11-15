import type { Metadata } from "next";
import { Loans } from "@/components/pages/loans";
export const metadata: Metadata = { title: "Loans & EMI" };
export default function Page() {
  return <Loans />;
}
