import { redirect } from "next/navigation";
import { isFirstRun } from "@/lib/settings";
import { SetupForm } from "./SetupForm";

export default function SetupPage() {
  if (!isFirstRun()) redirect("/login");
  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h1 className="page-title">First-run setup</h1>
      <p style={{ color: "#6b7280" }}>
        Creates the Owner account, business profile and sync key. Runs once.
      </p>
      <SetupForm />
    </div>
  );
}
