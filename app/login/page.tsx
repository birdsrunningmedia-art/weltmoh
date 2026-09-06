import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isFirstRun } from "@/lib/settings";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (isFirstRun()) redirect("/setup");
  const user = await getSessionUser();
  if (user) redirect("/");
  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <h1 className="page-title">Sign in</h1>
      <p style={{ color: "#6b7280" }}>Weltmoh invoicing — office access only.</p>
      <LoginForm />
    </div>
  );
}
