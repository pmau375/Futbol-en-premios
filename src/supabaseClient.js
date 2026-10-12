import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://krqoxcanigygxzwmozfx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycW94Y2FuaWd5Z3h6d21vemZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NzYzMTAsImV4cCI6MjEwNzM1MjMxMH0.lX_EO02Srn3-2qROEqikIdgytmtoswAEwclFeOTjS6Y'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)