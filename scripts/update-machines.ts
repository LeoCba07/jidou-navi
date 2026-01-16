import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Machine {
  name: string;
  location: { address: string };
  features: string[];
}

interface MachinesData {
  machines: Machine[];
}

async function updateMachines() {
  const dataPath = path.join(__dirname, 'output', 'machines.json');
  const data: MachinesData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  console.log(`Updating ${data.machines.length} machines...\n`);

  let updated = 0;
  let errors = 0;

  for (const m of data.machines) {
    const { error } = await supabase
      .from('machines')
      .update({
        address: m.location.address,
        description: m.features[0] || null,
      })
      .eq('name', m.name);

    if (error) {
      console.log(`✗ ${m.name}: ${error.message}`);
      errors++;
    } else {
      updated++;
    }
  }

  console.log(`\n✅ Updated: ${updated}`);
  console.log(`❌ Errors: ${errors}`);
}

updateMachines();
