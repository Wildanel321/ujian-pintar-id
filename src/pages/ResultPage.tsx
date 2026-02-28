import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Trophy, Home } from 'lucide-react';

interface ResultState {
  score: number;
  correct: number;
  wrong: number;
  total: number;
  duration: number;
  subject: string;
}

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ResultState | null;

  if (!state) {
    navigate('/dashboard');
    return null;
  }

  const { score, correct, wrong, total, duration, subject } = state;
  const unanswered = total - correct - wrong;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="glass-card rounded-2xl p-8 text-center">
          {/* Score Circle */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="56" fill="none" strokeWidth="8" className="stroke-muted" />
              <circle
                cx="64" cy="64" r="56" fill="none" strokeWidth="8"
                className="stroke-primary"
                strokeDasharray={`${(score / 100) * 351.86} 351.86`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Trophy className="w-5 h-5 text-accent mb-1" />
              <span className="text-3xl font-bold text-foreground">{score}</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">Hasil Ujian</h1>
          <p className="text-muted-foreground mb-8">{subject}</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-success/10 rounded-xl p-4">
              <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{correct}</p>
              <p className="text-xs text-muted-foreground">Benar</p>
            </div>
            <div className="bg-destructive/10 rounded-xl p-4">
              <XCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{wrong}</p>
              <p className="text-xs text-muted-foreground">Salah</p>
            </div>
            {unanswered > 0 && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-2xl font-bold text-foreground">{unanswered}</p>
                <p className="text-xs text-muted-foreground">Tidak dijawab</p>
              </div>
            )}
            <div className="bg-primary/10 rounded-xl p-4">
              <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{duration}</p>
              <p className="text-xs text-muted-foreground">Menit</p>
            </div>
          </div>

          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full h-12 gradient-primary text-primary-foreground font-semibold shadow-neon"
          >
            <Home className="w-4 h-4 mr-2" />
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
