/**
 * Parent-auth helper. Resolves the signed-in Supabase user to their household
 * via parent_account. Parent Mode is the only context in which money can be
 * credited, jobs created, or approvals given (spec §3.1).
 */
import { createClient } from "@/lib/supabase/server";

export interface ParentContext {
  userId: string;
  householdId: string;
  displayName: string;
}

export async function getParent(): Promise<ParentContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: account } = await supabase
    .from("parent_account")
    .select("household_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) return null;
  return {
    userId: user.id,
    householdId: account.household_id,
    displayName: account.display_name,
  };
}
