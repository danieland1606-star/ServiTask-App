import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qsadtpckaowrkxkbxcxe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzYWR0cGNrYW93cmt4a2J4Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjc5NjcsImV4cCI6MjA5MDc0Mzk2N30.SmiEwt2Z-Vm71dqnkTOSJraFei64Txrv-WHJRegCmEc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
