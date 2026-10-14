import { createClient } from "@/lib/supabase/client";

async function main() {
  const supabase = createClient();
  const { error } = await supabase.auth.getSession();

  if (error) {
    console.error("❌ Supabase connection failed:", error.message);
    process.exit(1);
  }

  console.log("✅ Supabase connection successful.");
}

main();
