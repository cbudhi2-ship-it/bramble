/**
 * Seed a demo household (spec §1 — two grown-ups, five children).
 *
 *   node --env-file=.env.local scripts/seed.ts
 *
 * Idempotent-ish: it wipes and recreates the demo household each run. Parent
 * auth users are NOT created here — sign the two parents up through Supabase Auth, then
 * insert their parent_account rows (printed at the end) pointing at this
 * household.
 */
import { createClient } from "@supabase/supabase-js";
import { hashPin } from "../lib/child-pin.ts";
import { picturePinToSecret } from "../lib/picture-pin.ts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  // fresh demo household
  await supabase.from("household").delete().eq("name", "The Bramble house");
  const { data: household, error: hErr } = await supabase
    .from("household")
    .insert({ name: "The Bramble house", base_pocket_money_pence: 100, load_state: "normal" })
    .select()
    .single();
  if (hErr || !household) throw hErr;
  const hid = household.id;

  const members = [
    { display_name: "Mabel", dob: "2015-06-01", colour_hex: "#7B4FA8", mode: "low_demand", presence: "full_time", pin: "1379", pin_type: "numeric", weekly_cap_pence: 500 },
    { display_name: "Rowan", dob: "2020-09-01", colour_hex: "#E07A2F", mode: "young_visual", presence: "full_time", picture: ["fox", "octopus", "bee"], pin_type: "picture", weekly_cap_pence: 300 },
    { display_name: "Nell", dob: "2015-03-01", colour_hex: "#2E8B8B", mode: "standard", presence: "eow_and_holidays", pin: "2468", pin_type: "numeric", per_visit_cap_pence: 500 },
    { display_name: "Posy", dob: "2017-11-01", colour_hex: "#D4568A", mode: "standard", presence: "eow_and_holidays", pin: "1357", pin_type: "numeric", per_visit_cap_pence: 500 },
    { display_name: "Bo", dob: "2020-04-01", colour_hex: "#4A9E4A", mode: "young_visual", presence: "eow_and_holidays", picture: ["owl", "whale", "frog"], pin_type: "picture", per_visit_cap_pence: 300 },
  ] as const;

  const memberIds: Record<string, string> = {};
  for (const m of members) {
    const secret = m.pin_type === "picture" ? picturePinToSecret([...m.picture!]) : m.pin!;
    const { data } = await supabase
      .from("member")
      .insert({
        household_id: hid,
        display_name: m.display_name,
        dob: m.dob,
        colour_hex: m.colour_hex,
        mode: m.mode,
        presence: m.presence,
        pin_type: m.pin_type,
        pin_hash: await hashPin(secret),
        weekly_cap_pence: (m as { weekly_cap_pence?: number }).weekly_cap_pence ?? null,
        per_visit_cap_pence: (m as { per_visit_cap_pence?: number }).per_visit_cap_pence ?? null,
      })
      .select()
      .single();
    memberIds[m.display_name] = data!.id;
  }

  const jobs = [
    { title: "Empty the dishwasher", icon_key: "🍽️", kind: "house_critical", tier: "core", age_min: 8, low_demand_safe: false, fallback_pence: 100, room: "Kitchen", framing_direct: "Empty the dishwasher", framing_ambient: "The dishwasher is full" },
    { title: "Feed Nutmeg", icon_key: "🐈", kind: "house_critical", tier: "core", age_min: 5, low_demand_safe: true, fallback_pence: 75, room: "Kitchen", framing_direct: "Feed the cat", framing_ambient: "Nutmeg's bowl is empty" },
    { title: "Bins out", icon_key: "🗑️", kind: "house_critical", tier: "core", age_min: 8, low_demand_safe: true, fallback_pence: 75, room: "Kitchen", framing_direct: "Put the bins out", framing_ambient: "The bins need to go out" },
    { title: "Washing in", icon_key: "🧺", kind: "house_critical", tier: "full", age_min: 8, low_demand_safe: true, fallback_pence: 75, room: "Utility", framing_direct: "Bring the washing in", framing_ambient: "The washing's on the line" },
    { title: "Shoes away", icon_key: "👟", kind: "house_critical", tier: "full", age_min: 5, low_demand_safe: true, fallback_pence: 50, room: "Hallway", framing_direct: "Put your shoes away", framing_ambient: "There are shoes in the hall" },
    { title: "Clean the bathroom", icon_key: "🛁", kind: "house_critical", tier: "full", age_min: 8, low_demand_safe: true, fallback_pence: 200, room: "Bathroom", recurrence: "weekly", people_needed: 2, framing_direct: "Clean the bathroom", framing_ambient: "The bathroom needs doing" },
    { title: "Match the socks", icon_key: "🧦", kind: "paid", price_pence: 60, fallback_pence: 60, age_min: 5, pool: "any", room: "Utility", framing_direct: "Match the socks", framing_ambient: "There's a basket of odd socks" },
    { title: "Water the plants", icon_key: "🪴", kind: "paid", price_pence: 50, fallback_pence: 50, age_min: 5, pool: "any", room: null, framing_direct: "Water the plants", framing_ambient: "The plants look thirsty" },
    { title: "Hoover the car", icon_key: "🚗", kind: "paid", price_pence: 200, fallback_pence: 200, age_min: 8, pool: "weekend_only", room: "Outside", recurrence: "weekly", framing_direct: "Hoover the car", framing_ambient: "The car's full of crumbs" },
    { title: "Sweep the patio", icon_key: "🍂", kind: "paid", price_pence: 150, fallback_pence: 150, age_min: 8, pool: "weekend_only", room: "Outside", framing_direct: "Sweep the patio", framing_ambient: "The patio's covered in leaves" },
  ];
  for (const j of jobs) {
    await supabase.from("job_def").insert({ household_id: hid, recurrence: "daily", ...j });
  }

  // a goal each
  const goals = [
    ["Mabel", "Sylvanian caravan", 2500],
    ["Nell", "Roller skates", 4000],
    ["Posy", "Squishmallow", 1800],
  ] as const;
  for (const [name, title, target] of goals) {
    await supabase.from("goal").insert({ member_id: memberIds[name], title, target_pence: target });
  }

  console.log("Seeded household:", hid);
  console.log("PINs — Mabel 1379, Nell 2468, Posy 1357");
  console.log("Picture PINs — Rowan fox/octopus/bee, Bo owl/whale/frog");
  console.log("\nAfter you sign the two parents up in Supabase Auth, run:");
  console.log(`  insert into parent_account (user_id, household_id, display_name)`);
  console.log(`  values ('<auth-user-id>', '${hid}', 'Parent one');`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
