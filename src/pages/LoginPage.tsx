import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getProfile } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BookOpen, RefreshCw, LogIn, Shield, Settings, User, Mail } from 'lucide-react';

type LoginMode = 'siswa' | 'admin';

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('siswa');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    async function check() {
      const { data } = await supabase.rpc('check_admin_exists');
      setShowSetup(data === false);
      setCheckingAdmin(false);
    }
    check();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loginEmail = mode === 'siswa' ? `${username}@student.cbt` : email;
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) throw error;

      await refreshProfile();
      const profile = await getProfile();

      if (profile?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
      toast.success('Login berhasil!');
    } catch (err: any) {
      toast.error(mode === 'siswa' ? 'Username atau password salah' : 'Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    toast.info('Form direset');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-neon mb-4">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground">CBT Ujian</h1>
          <p className="text-primary-foreground/70 mt-1">Computer Based Test</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {/* Mode Toggle */}
          <div className="flex rounded-xl bg-secondary/50 p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode('siswa')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'siswa'
                  ? 'gradient-primary text-primary-foreground shadow-neon'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-4 h-4" />
              Siswa
            </button>
            <button
              type="button"
              onClick={() => setMode('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'admin'
                  ? 'gradient-primary text-primary-foreground shadow-neon'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="w-4 h-4" />
              Admin
            </button>
          </div>

          <div className="flex items-center gap-2 mb-6">
            {mode === 'siswa' ? <User className="w-5 h-5 text-primary" /> : <Shield className="w-5 h-5 text-primary" />}
            <h2 className="text-xl font-semibold text-card-foreground">
              {mode === 'siswa' ? 'Login Siswa' : 'Login Admin'}
            </h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {mode === 'siswa' ? (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-card-foreground">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-12 bg-secondary/50 border-border focus:border-primary"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-card-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Masukkan email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-secondary/50 border-border focus:border-primary"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-card-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-secondary/50 border-border focus:border-primary"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-12 gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-all shadow-neon"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Memproses...' : 'Login'}
              </Button>

              <Button
                type="button"
                onClick={handleRefresh}
                variant="outline"
                className="h-12 px-4 bg-accent/20 border-accent text-accent-foreground hover:bg-accent/30"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {!checkingAdmin && showSetup && mode === 'admin' && (
            <Link
              to="/setup"
              className="flex items-center justify-center gap-2 mt-5 p-3 rounded-xl bg-accent/10 border border-accent/20 text-sm text-card-foreground hover:bg-accent/20 transition-colors"
            >
              <Settings className="w-4 h-4 text-accent" />
              <span>Belum ada admin? <strong>Setup Admin Pertama</strong></span>
            </Link>
          )}
        </div>

        <p className="text-center text-primary-foreground/50 text-sm mt-6">
          © 2026 CBT Ujian — Sistem Ujian Berbasis Komputer
        </p>
      </div>
    </div>
  );
}
