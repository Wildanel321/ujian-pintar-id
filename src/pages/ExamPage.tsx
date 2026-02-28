import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
}

interface Subject {
  id: string;
  nama_mapel: string;
  durasi: number;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ExamPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tabWarnings, setTabWarnings] = useState(0);
  const submittedRef = useRef(false);

  // Anti-cheat: disable right click & copy
  useEffect(() => {
    const preventContext = (e: MouseEvent) => e.preventDefault();
    const preventCopy = (e: ClipboardEvent) => e.preventDefault();
    const preventKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'u')) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', preventContext);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('paste', preventCopy);
    document.addEventListener('keydown', preventKeys);
    return () => {
      document.removeEventListener('contextmenu', preventContext);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('paste', preventCopy);
      document.removeEventListener('keydown', preventKeys);
    };
  }, []);

  // Anti-cheat: tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !submittedRef.current) {
        setTabWarnings(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            toast.error('Terlalu banyak keluar tab! Ujian akan dikumpulkan otomatis.');
            handleSubmit();
          } else {
            toast.warning(`Peringatan ${newCount}/3: Jangan keluar dari tab ujian!`);
          }
          return newCount;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [questions, answers]);

  // Load questions
  useEffect(() => {
    async function load() {
      if (!subjectId || !profile) return;

      const { data: subjectData } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();

      if (!subjectData) {
        toast.error('Mata pelajaran tidak ditemukan');
        navigate('/dashboard');
        return;
      }
      setSubject(subjectData as Subject);
      setTimeLeft((subjectData as Subject).durasi * 60);

      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, question, option_a, option_b, option_c, option_d, option_e')
        .eq('subject_id', subjectId);

      if (questionsData) {
        setQuestions(shuffleArray(questionsData as Question[]));
      }

      // Create exam session
      const { data: session } = await supabase
        .from('exam_sessions')
        .insert({ user_id: profile.id, subject_id: subjectId })
        .select()
        .single();

      if (session) setSessionId((session as any).id);
      setLoading(false);
    }
    load();
  }, [subjectId, profile]);

  // Timer
  useEffect(() => {
    if (loading || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!submittedRef.current) {
            toast.error('Waktu habis! Ujian dikumpulkan otomatis.');
            handleSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  const saveAnswer = useCallback(async (questionId: string, answer: string) => {
    if (!profile) return;
    await supabase
      .from('answers')
      .upsert(
        { user_id: profile.id, question_id: questionId, answer },
        { onConflict: 'user_id,question_id' }
      );
  }, [profile]);

  const handleAnswer = (option: string) => {
    const q = questions[currentIndex];
    setAnswers(prev => ({ ...prev, [q.id]: option }));
    saveAnswer(q.id, option);
  };

  const handleSubmit = async () => {
    if (submittedRef.current || submitting) return;
    submittedRef.current = true;
    setSubmitting(true);

    try {
      if (!profile || !subjectId) return;

      // Fetch correct answers
      const { data: questionsWithAnswers } = await supabase
        .from('questions')
        .select('id, answer')
        .eq('subject_id', subjectId);

      let correct = 0;
      let wrong = 0;
      const answerMap = new Map((questionsWithAnswers || []).map((q: any) => [q.id, q.answer]));

      for (const q of questions) {
        const userAnswer = answers[q.id];
        const correctAnswer = answerMap.get(q.id);
        if (userAnswer === correctAnswer) correct++;
        else if (userAnswer) wrong++;
      }

      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
      const durationMinutes = subject ? subject.durasi - Math.floor(timeLeft / 60) : 0;

      await supabase.from('results').insert({
        user_id: profile.id,
        subject_id: subjectId,
        score,
        correct_count: correct,
        wrong_count: wrong,
        duration_minutes: durationMinutes,
      });

      if (sessionId) {
        await supabase
          .from('exam_sessions')
          .update({ is_completed: true, ended_at: new Date().toISOString() })
          .eq('id', sessionId);
      }

      navigate('/result', { state: { score, correct, wrong, total: questions.length, duration: durationMinutes, subject: subject?.nama_mapel } });
    } catch {
      toast.error('Gagal menyimpan hasil');
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isTimeLow = timeLeft < 300;

  return (
    <div className="min-h-screen bg-background select-none" onDragStart={e => e.preventDefault()}>
      {/* Header */}
      <header className="gradient-primary sticky top-0 z-50 shadow-neon">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">{subject?.nama_mapel}</h1>
            <p className="text-xs text-primary-foreground/70">Soal {currentIndex + 1} dari {questions.length}</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isTimeLow ? 'bg-destructive/20 animate-pulse-soft' : 'bg-primary-foreground/10'}`}>
            <Clock className={`w-5 h-5 ${isTimeLow ? 'text-destructive-foreground' : 'text-primary-foreground'}`} />
            <span className={`text-lg font-mono font-bold ${isTimeLow ? 'text-destructive-foreground' : 'text-primary-foreground'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Question Panel */}
        <div className="flex-1">
          {currentQ && (
            <div className="glass-card rounded-2xl p-6 lg:p-8 animate-fade-in">
              {tabWarnings > 0 && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive">Peringatan keluar tab: {tabWarnings}/3</span>
                </div>
              )}

              <div className="mb-6">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  Soal {currentIndex + 1}
                </span>
              </div>

              <p className="text-lg text-card-foreground leading-relaxed mb-8">{currentQ.question}</p>

              <div className="space-y-3">
                {(['A', 'B', 'C', 'D', 'E'] as const).map(option => {
                  const optionKey = `option_${option.toLowerCase()}` as keyof Question;
                  const isSelected = answers[currentQ.id] === option;
                  return (
                    <button
                      key={option}
                      onClick={() => handleAnswer(option)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-neon'
                          : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                      }`}
                    >
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold flex-shrink-0 ${
                        isSelected
                          ? 'gradient-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {option}
                      </span>
                      <span className="text-card-foreground pt-1">{currentQ[optionKey]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="h-11"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Sebelumnya
                </Button>

                {currentIndex === questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="h-11 gradient-primary text-primary-foreground font-semibold shadow-neon"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {submitting ? 'Mengumpulkan...' : 'Kumpulkan Ujian'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                    className="h-11 gradient-primary text-primary-foreground"
                  >
                    Selanjutnya
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Question Navigator */}
        <div className="lg:w-72">
          <div className="glass-card rounded-2xl p-5 sticky top-20">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Navigasi Soal</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-full aspect-square rounded-lg text-sm font-semibold transition-all ${
                      isCurrent
                        ? 'gradient-primary text-primary-foreground shadow-neon scale-110'
                        : isAnswered
                        ? 'bg-success text-success-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-border space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-success" />
                <span className="text-muted-foreground">Sudah dijawab ({Object.keys(answers).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-muted" />
                <span className="text-muted-foreground">Belum dijawab ({questions.length - Object.keys(answers).length})</span>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-5 h-11 gradient-primary text-primary-foreground font-semibold shadow-neon"
            >
              <Send className="w-4 h-4 mr-2" />
              Kumpulkan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
