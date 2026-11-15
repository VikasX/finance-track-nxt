import type { Metadata } from "next";
import { Deposits } from "@/components/pages/deposits";
export const metadata: Metadata = { title: "Fixed Deposits" };
export default function Page() {
  return <Deposits />;
}
