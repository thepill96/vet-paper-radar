import { supabase } from "../lib/supabase";
import { useT } from "../lib/i18n";

export default function Pending({ user, blocked }) {
  const { t } = useT();
  return (
    <div className="auth">
      <div className="auth-card">
        <div className="logo"><span className="logo-mark" />{t("auth.title")}</div>
        <h1>{blocked ? t("pending.blockedTitle") : t("pending.title")}</h1>
        <p>{blocked ? t("pending.blockedBody") : t("pending.body", { email: user.email })}</p>
        <div className="row">
          {!blocked && <button className="btn primary" style={{ flex: 1 }} onClick={() => window.location.reload()}>{t("pending.refresh")}</button>}
          <button className="btn" onClick={() => supabase.auth.signOut()}>{t("pending.signOut")}</button>
        </div>
      </div>
    </div>
  );
}
