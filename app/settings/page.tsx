import { redirect } from "next/navigation";
import { getDb } from "@/db/sqlite";
import { users } from "@/db/schema.sqlite";
import { can, getSessionUser } from "@/lib/auth";
import { getSettings, isFirstRun } from "@/lib/settings";
import { SettingsEditor, StaffManager } from "./SettingsForms";
import { signOutAction } from "./actions";

export default async function SettingsPage() {
  if (isFirstRun()) redirect("/setup");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const settings = getSettings();
  if (!settings) redirect("/setup");
  const db = getDb();
  const staff = db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .all();
  const editable = can(user, "manage-settings");

  return (
    <>
      <div className="topbar">
        <h1 className="page-title">Settings</h1>
        <form action={signOutAction}>
          <button className="btn secondary" type="submit">
            Sign out ({user.email})
          </button>
        </form>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Business profile</h3>
        <SettingsEditor settings={settings} editable={editable} />
      </div>
      {editable ? (
        <div className="card">
          <StaffManager staff={staff} />
        </div>
      ) : null}
    </>
  );
}
