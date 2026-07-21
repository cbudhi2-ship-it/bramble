/**
 * A menu of common household jobs with suggested sub-£1 costs, so a parent who
 * can't think of jobs can tap to add them to the library. Costs are deliberately
 * small (spec §7: same job, same price, always) — the paid ones show a board
 * price; the essentials show what they're worth as an after-6pm bonus.
 */
export interface JobSuggestion {
  title: string;
  room: string | null;
  kind: "house_critical" | "paid";
  price_pence: number; // board price (paid jobs only)
  fallback_pence: number; // what it pays if not done by 6pm
  framing_ambient: string;
  age_min: number;
}

export const JOB_SUGGESTIONS: JobSuggestion[] = [
  // Kitchen
  { title: "Empty the dishwasher", room: "Kitchen", kind: "house_critical", price_pence: 0, fallback_pence: 50, framing_ambient: "The dishwasher is full", age_min: 7 },
  { title: "Load the dishwasher", room: "Kitchen", kind: "house_critical", price_pence: 0, fallback_pence: 40, framing_ambient: "There are dishes by the sink", age_min: 7 },
  { title: "Wipe the kitchen sides", room: "Kitchen", kind: "paid", price_pence: 30, fallback_pence: 40, framing_ambient: "The sides need a wipe", age_min: 6 },
  { title: "Lay the table", room: "Kitchen", kind: "paid", price_pence: 20, fallback_pence: 30, framing_ambient: "The table needs laying", age_min: 4 },
  { title: "Clear the table", room: "Kitchen", kind: "paid", price_pence: 20, fallback_pence: 30, framing_ambient: "The table needs clearing", age_min: 4 },
  { title: "Take the bins out", room: "Kitchen", kind: "house_critical", price_pence: 0, fallback_pence: 50, framing_ambient: "The bins need to go out", age_min: 8 },
  { title: "Feed the pet", room: "Kitchen", kind: "house_critical", price_pence: 0, fallback_pence: 30, framing_ambient: "The pet's bowl is empty", age_min: 5 },
  { title: "Sweep the kitchen floor", room: "Kitchen", kind: "paid", price_pence: 40, fallback_pence: 40, framing_ambient: "The floor needs a sweep", age_min: 6 },

  // Living room
  { title: "Tidy the living room", room: "Living room", kind: "paid", price_pence: 50, fallback_pence: 50, framing_ambient: "The living room needs a tidy", age_min: 5 },
  { title: "Plump the cushions", room: "Living room", kind: "paid", price_pence: 20, fallback_pence: 20, framing_ambient: "The cushions need sorting", age_min: 4 },
  { title: "Dust the surfaces", room: "Living room", kind: "paid", price_pence: 40, fallback_pence: 40, framing_ambient: "The surfaces are dusty", age_min: 6 },

  // Bathroom
  { title: "Wipe the bathroom sink", room: "Bathroom", kind: "paid", price_pence: 30, fallback_pence: 30, framing_ambient: "The bathroom sink needs a wipe", age_min: 6 },
  { title: "Tidy the bath toys", room: "Bathroom", kind: "paid", price_pence: 20, fallback_pence: 20, framing_ambient: "The bath toys are everywhere", age_min: 4 },

  // Bedroom
  { title: "Make your bed", room: "Bedroom", kind: "house_critical", price_pence: 0, fallback_pence: 20, framing_ambient: "The bed needs making", age_min: 4 },
  { title: "Tidy your room", room: "Bedroom", kind: "paid", price_pence: 50, fallback_pence: 50, framing_ambient: "Your room needs a tidy", age_min: 5 },
  { title: "Put clean clothes away", room: "Bedroom", kind: "paid", price_pence: 40, fallback_pence: 40, framing_ambient: "There are clean clothes to put away", age_min: 5 },

  // Utility / washing
  { title: "Match the socks", room: "Utility", kind: "paid", price_pence: 50, fallback_pence: 50, framing_ambient: "There's a basket of odd socks", age_min: 5 },
  { title: "Sort the washing", room: "Utility", kind: "paid", price_pence: 40, fallback_pence: 40, framing_ambient: "The washing needs sorting", age_min: 6 },
  { title: "Bring the washing in", room: "Utility", kind: "house_critical", price_pence: 0, fallback_pence: 40, framing_ambient: "The washing's on the line", age_min: 6 },

  // Hall / general
  { title: "Shoes away", room: "Hallway", kind: "house_critical", price_pence: 0, fallback_pence: 20, framing_ambient: "There are shoes in the hall", age_min: 4 },
  { title: "Water the plants", room: null, kind: "paid", price_pence: 30, fallback_pence: 30, framing_ambient: "The plants look thirsty", age_min: 5 },

  // Outside
  { title: "Fill the bird feeder", room: "Outside", kind: "paid", price_pence: 20, fallback_pence: 20, framing_ambient: "The bird feeder is empty", age_min: 5 },
  { title: "Sweep the path", room: "Outside", kind: "paid", price_pence: 60, fallback_pence: 60, framing_ambient: "The path needs sweeping", age_min: 8 },
];
