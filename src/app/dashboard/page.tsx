import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { userId } from "@/lib/auth";

export const metadata = { title: "Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await userId())) redirect("/login");
  return (
    <div className="wrap">
      <h1 className="mb-4">Dashboard</h1>
      <Dashboard />
    </div>
  );
}
