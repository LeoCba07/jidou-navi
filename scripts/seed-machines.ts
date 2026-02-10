import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set SUPABASE_SERVICE_ROLE_KEY in your environment (find it in Supabase Dashboard > Settings > API)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Category mapping from Japanese to slug
const categoryMap: Record<string, string> = {
  '飲み物': 'eats',
  '食べ物': 'eats',
  'ガチャポン': 'gachapon',
  '珍しい': 'weird',
  'レトロ': 'retro',
  'アイスクリーム': 'eats',
  'コーヒー': 'eats',
  'アルコール': 'eats',
};

interface MachineJSON {
  source_id: string;
  source_url: string | null;
  name: string;
  name_en?: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  merchandise: string[];
  categories: string[];
  features: string[];
  images: {
    url: string | null;
    local_path: string;
  }[];
}

interface MachinesData {
  scraped_at: string;
  source: string;
  machines: MachineJSON[];
}

async function getContentType(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return types[ext] || 'image/jpeg';
}

async function uploadImage(localPath: string, machineId: string): Promise<string | null> {
  const fullPath = path.join(__dirname, 'output', localPath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠ Image not found: ${fullPath}`);
    return null;
  }

  const fileBuffer = fs.readFileSync(fullPath);
  const fileName = path.basename(localPath);
  const storagePath = `machines/${machineId}/${fileName}`;
  const contentType = await getContentType(fullPath);

  const { error } = await supabase.storage
    .from('machine-photos')
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.log(`  ⚠ Upload failed: ${error.message}`);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('machine-photos')
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

async function getCategoryIds(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug');

  if (error) {
    console.error('Failed to fetch categories:', error);
    return {};
  }

  const map: Record<string, string> = {};
  for (const cat of data || []) {
    map[cat.slug] = cat.id;
  }
  return map;
}

async function seedMachines() {
  console.log('🚀 Starting machine seeding...\n');

  // Load machines.json
  const dataPath = path.join(__dirname, 'output', 'machines.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const data: MachinesData = JSON.parse(rawData);

  console.log(`📦 Loaded ${data.machines.length} machines from JSON\n`);

  // Get category IDs
  const categoryIds = await getCategoryIds();
  console.log('📁 Categories:', Object.keys(categoryIds).join(', '), '\n');

  let successCount = 0;
  let errorCount = 0;

  for (const machine of data.machines) {
    console.log(`Processing: ${machine.name} (${machine.source_id})`);

    try {
      // Generate UUID for this machine
      const machineId = crypto.randomUUID();

      // Build description from features
      const description = machine.features.join(' ');

      // Insert machine
      const { error: machineError } = await supabase
        .from('machines')
        .insert({
          id: machineId,
          name: machine.name,
          description: description || null,
          address: machine.location.address,
          latitude: machine.location.latitude,
          longitude: machine.location.longitude,
          location: `SRID=4326;POINT(${machine.location.longitude} ${machine.location.latitude})`,
          status: 'active',
        });

      if (machineError) {
        console.log(`  ✗ Machine insert failed: ${machineError.message}`);
        errorCount++;
        continue;
      }

      // Upload images and create photo records
      for (let i = 0; i < machine.images.length; i++) {
        const img = machine.images[i];
        if (!img.local_path) continue;

        const photoUrl = await uploadImage(img.local_path, machineId);
        if (photoUrl) {
          const { error: photoError } = await supabase
            .from('machine_photos')
            .insert({
              machine_id: machineId,
              photo_url: photoUrl,
              is_primary: i === 0,
              status: 'active',
            });

          if (photoError) {
            console.log(`  ⚠ Photo insert failed: ${photoError.message}`);
          } else {
            console.log(`  📷 Uploaded photo ${i + 1}`);
          }
        }
      }

      // Link to categories
      const categorySlugs = machine.categories
        .map(cat => categoryMap[cat] || cat.toLowerCase())
        .filter(slug => categoryIds[slug]);

      const uniqueSlugs = [...new Set(categorySlugs)];

      for (const slug of uniqueSlugs) {
        const categoryId = categoryIds[slug];
        if (categoryId) {
          const { error: catError } = await supabase
            .from('machine_categories')
            .insert({
              machine_id: machineId,
              category_id: categoryId,
            });

          if (catError && !catError.message.includes('duplicate')) {
            console.log(`  ⚠ Category link failed: ${catError.message}`);
          }
        }
      }

      console.log(`  ✓ Success (categories: ${uniqueSlugs.join(', ')})`);
      successCount++;

    } catch (err) {
      console.log(`  ✗ Error: ${err}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Seeding complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
}

seedMachines().catch(console.error);
