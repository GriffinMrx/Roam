-- The admin audit log is append-only (prompts/admin-console.md): the database itself refuses
-- updates and deletes, so a bug or a compromised admin route can't rewrite history.
CREATE OR REPLACE FUNCTION admin_audit_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER admin_audit_no_update_delete
  BEFORE UPDATE OR DELETE ON admin_audit
  FOR EACH ROW EXECUTE FUNCTION admin_audit_append_only();
--> statement-breakpoint
CREATE TRIGGER admin_audit_no_truncate
  BEFORE TRUNCATE ON admin_audit
  FOR EACH STATEMENT EXECUTE FUNCTION admin_audit_append_only();
