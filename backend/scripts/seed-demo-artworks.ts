import { supabase } from '../src/db/supabase';
import { seedStarterCollection } from '../src/services/starter-collection.service';

async function main() {
  let total = 0;
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('User').select('id')
      .order('id').range(offset, offset + 499);
    if (error) throw error;
    for (const user of data) {
      if (user.id === 'aureum-starter-custodian') continue;
      await seedStarterCollection(user.id);
      total++;
    }
    if (data.length < 500) break;
  }
  console.log(`Starter collections prepared for ${total} accounts.`);
}

main().catch((error) => {
  console.error('Starter collection setup failed:', error);
  process.exitCode = 1;
});
