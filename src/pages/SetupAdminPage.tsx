import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, UserPlus, RefreshCw, CheckCircle } from 'lucide-react';

export default function SetupAdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });

  useEffect(() => {
    async function checkAdmin() {
      const { data } = await supabase.rpc('check_admin_exists');
      if (data === true) {
        navigate('/');
        toast.info('Admin sudah terdaftar');
      }
      setChecking(false);
    }
    checkAdmin();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Password tidak cocok');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      // 1. Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Gagal membuat akun');

      // 2. Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        auth_id: authData.user.id,
        name: form.name,
        username: form.email.split('@')[0],
        role: 'admin',
      });
      if (profileError) throw profileError;

      // 3. Setup admin role via secure function
      const { data: result, error: roleError } = await supabase.rpc('setup_first_admin', {
        _user_id: authData.user.id,
      });
      if (roleError) throw roleError;
      if (!result) throw new Error('Admin sudah ada');

      toast.success('Admin berhasil dibuat! Silakan login.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat admin');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="w-8 h-8 border-4 border-primary-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-neon mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground">Setup Admin</h1>
          <p className="text-primary-foreground/70 mt-1">Buat akun administrator pertama</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-accent/10 border border-accent/20">
            <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
            <p className="text-sm text-card-foreground">
              Halaman ini hanya muncul sekali saat pertama kali setup sistem.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-card-foreground">Nama Lengkap</Label>
              <Input
                placeholder="Masukkan nama admin"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                className="h-12 bg-secondary/50 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-card-foreground">Email</Label>
              <Input
                type="email"
                placeholder="admin@sekolah.id"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                className="h-12 bg-secondary/50 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-card-foreground">Password</Label>
              <Input
                type="password"
                placeholder="Minimal 6 karakter"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                className="h-12 bg-secondary/50 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-card-foreground">Konfirmasi Password</Label>
              <Input
                type="password"
                placeholder="Ulangi password"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                required
                className="h-12 bg-secondary/50 border-border"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 gradient-primary text-primary-foreground font-semibold shadow-neon"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Membuat Admin...' : 'Buat Akun Admin'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
