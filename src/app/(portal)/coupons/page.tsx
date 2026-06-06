import type { Metadata } from "next";
import { journalDb } from "@/lib/journal";
import { Card, EmptyRow, PageHeader, Stat } from "../ui";
import CouponsManager from "./CouponsManager";

export const metadata: Metadata = { title: "Coupons" };

async function loadCoupons() {
  const db = journalDb();
  if (!db) return [];
  const rs = await db.execute(
    "SELECT code, percent, active, created_at FROM coupons ORDER BY created_at DESC",
  );
  return rs.rows.map((r) => ({
    code: String(r.code),
    percent: Number(r.percent),
    active: Number(r.active) === 1,
    createdAt: String(r.created_at),
  }));
}

export default async function AdminCouponsPage() {
  const coupons = await loadCoupons();

  return (
    <>
      <PageHeader
        title="Coupons"
        deva="छूट"
        sub="Discount codes for checkout — add, pause, or remove. Changes apply instantly."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat
          label="Active codes"
          value={coupons.filter((c) => c.active).length}
          accent="text-green-700"
          delay={0.05}
        />
        <Stat label="All codes" value={coupons.length} delay={0.1} />
      </div>

      <Card delay={0.15}>
        {coupons.length === 0 ? (
          <EmptyRow text="No coupons — add the first one below." />
        ) : null}
        <CouponsManager coupons={coupons} />
      </Card>
    </>
  );
}
