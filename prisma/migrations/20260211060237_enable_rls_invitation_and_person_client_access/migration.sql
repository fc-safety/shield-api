-- Enable RLS on tables that had policies defined but RLS not enabled
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PersonClientAccess" ENABLE ROW LEVEL SECURITY;

-- Force RLS on tables
ALTER TABLE "Invitation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PersonClientAccess" FORCE ROW LEVEL SECURITY;

