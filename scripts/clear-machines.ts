import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearSeededMachines() {
  console.log('Clearing seeded machines...\n');

  // Delete machine_photos first (foreign key)
  const { error: photoErr } = await supabase
    .from('machine_photos')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (photoErr) console.log('Photo delete error:', photoErr.message);
  else console.log('✓ Cleared machine_photos');

  // Delete machine_categories
  const { error: catErr } = await supabase
    .from('machine_categories')
    .delete()
    .neq('machine_id', '00000000-0000-0000-0000-000000000000');

  if (catErr) console.log('Category delete error:', catErr.message);
  else console.log('✓ Cleared machine_categories');

  // Delete all machines - we'll re-seed everything
  const { error: machineErr } = await supabase
    .from('machines')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (machineErr) console.log('Machine delete error:', machineErr.message);
  else console.log('✓ Cleared machines');

  console.log('\nDone!');
}

clearSeededMachines();
