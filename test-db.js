import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbhxwntxuovcyjkfsyih.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiaHh3bnR4dW92Y3lqa2ZzeWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTYwNDQsImV4cCI6MjA4NjU3MjA0NH0.FPA3_IQ2eOGdGJHE2lylcybmO2TnWVg5PCHIQSiYBXE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: workspaces, error: err1 } = await supabase.from('workspaces').select('*');
    console.log('Workspaces:', workspaces, err1);

    if (workspaces && workspaces.length > 0) {
        const wid = workspaces[0].id;
        console.log('Using Workspace:', wid);

        const { data: txns, error: err2 } = await supabase.from('transactions').select('date, amount, type').eq('workspace_id', wid).order('date', { ascending: false });
        console.log('Transactions Count:', txns?.length, err2);
        if (txns?.length) {
            console.log('Sample Txns:', txns.slice(0, 3));
        }

        const { data: periods, error: err3 } = await supabase.from('periods').select('id, year, month').eq('workspace_id', wid).order('year', { ascending: false }).order('month', { ascending: false });
        console.log('Periods:', periods, err3);

        if (periods && periods.length > 0) {
            const { data: entries, error: err4 } = await supabase.from('ledger_entries').select('amount, direction').eq('period_id', periods[0].id);
            console.log('Entries in latest period:', entries?.length, err4);
        }
    }
}

check();
