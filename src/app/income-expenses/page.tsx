import type { Metadata } from "next";
import { Suspense } from "react";
import { Transactions } from "@/components/pages/transactions";
export const metadata: Metadata = { title: "Income & Expenses" };
export default function Page() {
  return (
    <Suspense fallback={<div className="card">Loading transactions…</div>}>
      <Transactions />
    </Suspense>
  );
}
