import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  auth_id: string;
  name: string;
  username: string;
  role: 'admin' | 'peserta';
  kelas: string | null;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data as UserProfile | null;
}

export async function createProfile(authId: string, name: string, username: string, role: 'admin' | 'peserta', kelas?: string) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ auth_id: authId, name, username, role, kelas })
    .select()
    .single();

  if (error) throw error;
  return data;
}
