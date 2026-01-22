// supabaseClient.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';


import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'; 

// Initialize the Supabase client instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        // This allows Supabase to use AsyncStorage for session persistence in React Native/Expo
        storage: AsyncStorage,
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
});

