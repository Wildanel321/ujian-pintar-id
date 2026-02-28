import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth';
import { toast } from 'sonner';
import { BookOpen, Play, LogOut, User, Clock } from 'lucide-react';

interface Subject {
  id: string;
  nama_mapel: string;
  durasi: number;
  is_active: boolean;
}

export default function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubjects() {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true);
      if (!error && data) setSubjects(data as Subject[]);
      setLoading(false);
    }
    fetchSubjects();
  }, []);

  const handleStartExam = (subjectId: string) => {
    navigate(`/exam/${subjectId}`);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    toast.success('Berhasil logout');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary shadow-neon">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary-foreground" />
            <h1 className="text-xl font-bold text-primary-foreground">CBT Ujian</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{profile?.name}</span>
              {profile?.kelas && (
                <span className="text-xs bg-primary-foreground/20 px-2 py-0.5 rounded-full">
                  {profile.kelas}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-foreground">
            Selamat Datang, {profile?.name}! 👋
          </h2>
          <p className="text-muted-foreground mt-1">Pilih mata pelajaran untuk memulai ujian</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Belum ada mata pelajaran yang tersedia</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject, i) => (
              <div
                key={subject.id}
                className="glass-card rounded-2xl p-6 hover:shadow-card-hover transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {subject.nama_mapel}
                </h3>
                <div className="flex items-center gap-1 text-muted-foreground text-sm mb-6">
                  <Clock className="w-4 h-4" />
                  <span>{subject.durasi} menit</span>
                </div>
                <Button
                  onClick={() => handleStartExam(subject.id)}
                  className="w-full h-11 gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-neon"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Mulai Ujian
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
