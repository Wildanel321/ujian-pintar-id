import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import Papa from 'papaparse';
import {
  BookOpen, Users, FileText, GraduationCap, BarChart3,
  LogOut, Plus, Pencil, Trash2, Search, Upload, Download
} from 'lucide-react';

type Tab = 'peserta' | 'soal' | 'mapel' | 'nilai';

interface Profile {
  id: string;
  name: string;
  username: string;
  kelas: string | null;
  role: string;
  auth_id: string;
}

interface Subject {
  id: string;
  nama_mapel: string;
  durasi: number;
  is_active: boolean;
}

interface Question {
  id: string;
  subject_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  answer: string;
}

interface Result {
  id: string;
  user_id: string;
  subject_id: string;
  score: number;
  correct_count: number;
  wrong_count: number;
  duration_minutes: number | null;
  created_at: string;
  profiles?: { name: string; kelas: string | null };
  subjects?: { nama_mapel: string };
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('peserta');

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const tabs = [
    { key: 'peserta' as Tab, label: 'Peserta', icon: Users },
    { key: 'soal' as Tab, label: 'Soal', icon: FileText },
    { key: 'mapel' as Tab, label: 'Mata Pelajaran', icon: GraduationCap },
    { key: 'nilai' as Tab, label: 'Nilai', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary shadow-neon">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary-foreground" />
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">Admin Panel</h1>
              <p className="text-xs text-primary-foreground/70">CBT Ujian</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-primary-foreground hover:bg-primary-foreground/10">
            <LogOut className="w-4 h-4 mr-1" /> Keluar
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'gradient-primary text-primary-foreground shadow-neon'
                  : 'bg-card text-muted-foreground hover:bg-secondary border border-border'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'peserta' && <PesertaPanel />}
        {activeTab === 'soal' && <SoalPanel />}
        {activeTab === 'mapel' && <MapelPanel />}
        {activeTab === 'nilai' && <NilaiPanel />}
      </div>
    </div>
  );
}

function PesertaPanel() {
  const [peserta, setPeserta] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', username: '', password: '', kelas: '' });

  const fetchPeserta = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'peserta')
      .order('created_at', { ascending: false });
    if (data) setPeserta(data as Profile[]);
  };

  useEffect(() => { fetchPeserta(); }, []);

  const callManageStudent = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-student`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Gagal');
    return result;
  };

  const handleSave = async () => {
    if (!form.name || !form.username || (!editId && !form.password)) {
      toast.error('Lengkapi semua field');
      return;
    }

    try {
      if (editId) {
        await callManageStudent({ action: 'update', id: editId, ...form });
        toast.success('Peserta diperbarui');
      } else {
        await callManageStudent({ action: 'create', ...form });
        toast.success('Peserta ditambahkan');
      }
      setDialogOpen(false);
      setEditId(null);
      setForm({ name: '', username: '', password: '', kelas: '' });
      fetchPeserta();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan');
    }
  };

  const handleEdit = (p: Profile) => {
    setEditId(p.id);
    setForm({ name: p.name, username: p.username, password: '', kelas: p.kelas || '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus peserta ini?')) return;
    try {
      await callManageStudent({ action: 'delete', id });
      toast.success('Peserta dihapus');
      fetchPeserta();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus');
    }
  };

  const filtered = peserta.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari peserta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null); setForm({ name: '', username: '', password: '', kelas: '' }); } }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground shadow-neon">
              <Plus className="w-4 h-4 mr-1" /> Tambah Peserta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit' : 'Tambah'} Peserta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Nama</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Username</Label><Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
              <div><Label>Password{editId ? ' (kosongkan jika tidak diubah)' : ''}</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editId ? 'Biarkan kosong' : ''} /></div>
              <div><Label>Kelas</Label><Input value={form.kelas} onChange={e => setForm(f => ({ ...f, kelas: e.target.value }))} /></div>
              <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground">Simpan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 text-sm font-semibold text-foreground">Nama</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Username</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Kelas</th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">{p.name}</td>
                  <td className="p-4 text-sm text-muted-foreground">{p.username}</td>
                  <td className="p-4 text-sm text-muted-foreground">{p.kelas || '-'}</td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Belum ada peserta</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MapelPanel() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ nama_mapel: '', durasi: '60' });

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('created_at', { ascending: false });
    if (data) setSubjects(data as Subject[]);
  };

  useEffect(() => { fetchSubjects(); }, []);

  const handleSave = async () => {
    if (!form.nama_mapel) { toast.error('Nama mapel wajib diisi'); return; }
    if (editId) {
      await supabase.from('subjects').update({ nama_mapel: form.nama_mapel, durasi: parseInt(form.durasi) }).eq('id', editId);
      toast.success('Mata pelajaran diperbarui');
    } else {
      await supabase.from('subjects').insert({ nama_mapel: form.nama_mapel, durasi: parseInt(form.durasi) });
      toast.success('Mata pelajaran ditambahkan');
    }
    setDialogOpen(false);
    setEditId(null);
    setForm({ nama_mapel: '', durasi: '60' });
    fetchSubjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus mata pelajaran ini?')) return;
    await supabase.from('subjects').delete().eq('id', id);
    toast.success('Mata pelajaran dihapus');
    fetchSubjects();
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-end mb-4">
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null); setForm({ nama_mapel: '', durasi: '60' }); } }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground shadow-neon">
              <Plus className="w-4 h-4 mr-1" /> Tambah Mapel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Tambah'} Mata Pelajaran</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Nama Mapel</Label><Input value={form.nama_mapel} onChange={e => setForm(f => ({ ...f, nama_mapel: e.target.value }))} /></div>
              <div><Label>Durasi (menit)</Label><Input type="number" value={form.durasi} onChange={e => setForm(f => ({ ...f, durasi: e.target.value }))} /></div>
              <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground">Simpan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map(s => (
          <div key={s.id} className="glass-card rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-card-foreground">{s.nama_mapel}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.durasi} menit</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditId(s.id); setForm({ nama_mapel: s.nama_mapel, durasi: s.durasi.toString() }); setDialogOpen(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {subjects.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Belum ada mata pelajaran</p>}
      </div>
    </div>
  );
}

function SoalPanel() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject_id: '', question: '', option_a: '', option_b: '', option_c: '', option_d: '', option_e: '', answer: ''
  });

  const fetchData = async () => {
    const { data: subs } = await supabase.from('subjects').select('*');
    if (subs) setSubjects(subs as Subject[]);

    let query = supabase.from('questions').select('*').order('created_at', { ascending: false });
    if (selectedSubject !== 'all') query = query.eq('subject_id', selectedSubject);
    const { data } = await query;
    if (data) setQuestions(data as Question[]);
  };

  useEffect(() => { fetchData(); }, [selectedSubject]);

  const handleSave = async () => {
    if (!form.subject_id || !form.question || !form.option_a || !form.answer) {
      toast.error('Lengkapi semua field');
      return;
    }
    if (editId) {
      await supabase.from('questions').update(form).eq('id', editId);
      toast.success('Soal diperbarui');
    } else {
      await supabase.from('questions').insert(form);
      toast.success('Soal ditambahkan');
    }
    setDialogOpen(false);
    setEditId(null);
    setForm({ subject_id: '', question: '', option_a: '', option_b: '', option_c: '', option_d: '', option_e: '', answer: '' });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus soal ini?')) return;
    await supabase.from('questions').delete().eq('id', id);
    toast.success('Soal dihapus');
    fetchData();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const downloadTemplate = () => {
    const template = 'soal,pilihan_a,pilihan_b,pilihan_c,pilihan_d,pilihan_e,jawaban\n"Berapakah 1+1?","1","2","3","4","5","B"\n"Ibukota Indonesia?","Jakarta","Bandung","Surabaya","Medan","Bali","A"';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_soal.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedSubject || selectedSubject === 'all') {
      toast.error('Pilih mata pelajaran terlebih dahulu untuk import');
      e.target.value = '';
      return;
    }

    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          if (rows.length === 0) {
            toast.error('File CSV kosong');
            return;
          }

          const validAnswers = ['A', 'B', 'C', 'D', 'E'];
          const questions = rows.map((row, i) => {
            const soal = (row['soal'] || '').trim();
            const jawaban = (row['jawaban'] || '').trim().toUpperCase();
            if (!soal) throw new Error(`Baris ${i + 2}: Soal kosong`);
            if (!validAnswers.includes(jawaban)) throw new Error(`Baris ${i + 2}: Jawaban harus A-E, ditemukan "${jawaban}"`);
            return {
              subject_id: selectedSubject,
              question: soal,
              option_a: (row['pilihan_a'] || '').trim(),
              option_b: (row['pilihan_b'] || '').trim(),
              option_c: (row['pilihan_c'] || '').trim(),
              option_d: (row['pilihan_d'] || '').trim(),
              option_e: (row['pilihan_e'] || '').trim(),
              answer: jawaban,
            };
          });

          const { error } = await supabase.from('questions').insert(questions);
          if (error) throw error;

          toast.success(`${questions.length} soal berhasil diimport!`);
          fetchData();
        } catch (err: any) {
          toast.error(err.message || 'Gagal import');
        } finally {
          setImporting(false);
          e.target.value = '';
        }
      },
      error: () => {
        toast.error('Gagal membaca file CSV');
        setImporting(false);
        e.target.value = '';
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-[200px] bg-card">
            <SelectValue placeholder="Filter mapel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Mapel</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.nama_mapel}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1">
            <Download className="w-4 h-4" /> Template CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing || !selectedSubject || selectedSubject === 'all'}
            className="gap-1"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Mengimport...' : 'Import CSV'}
          </Button>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null); setForm({ subject_id: '', question: '', option_a: '', option_b: '', option_c: '', option_d: '', option_e: '', answer: '' }); } }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground shadow-neon">
                <Plus className="w-4 h-4 mr-1" /> Tambah Soal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Tambah'} Soal</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Mata Pelajaran</Label>
                  <Select value={form.subject_id} onValueChange={v => setForm(f => ({ ...f, subject_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.nama_mapel}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Soal</Label><textarea className="w-full p-3 rounded-lg border border-input bg-background text-foreground min-h-[80px] resize-y" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} /></div>
                {(['A', 'B', 'C', 'D', 'E'] as const).map(opt => (
                  <div key={opt}><Label>Pilihan {opt}</Label><Input value={form[`option_${opt.toLowerCase()}` as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [`option_${opt.toLowerCase()}`]: e.target.value }))} /></div>
                ))}
                <div>
                  <Label>Jawaban Benar</Label>
                  <Select value={form.answer} onValueChange={v => setForm(f => ({ ...f, answer: v }))}>
                    <SelectTrigger><SelectValue placeholder="Pilih jawaban" /></SelectTrigger>
                    <SelectContent>
                      {['A', 'B', 'C', 'D', 'E'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground">Simpan</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedSubject === 'all' && (
        <div className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/20 text-sm text-card-foreground">
          💡 Pilih mata pelajaran terlebih dahulu untuk menggunakan fitur Import CSV
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={q.id} className="glass-card rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  #{i + 1} — {subjects.find(s => s.id === q.subject_id)?.nama_mapel}
                </span>
                <p className="text-sm text-card-foreground mt-2">{q.question}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['A', 'B', 'C', 'D', 'E'].map(opt => (
                    <span key={opt} className={`text-xs px-2 py-1 rounded ${q.answer === opt ? 'bg-success/20 text-success font-semibold' : 'bg-muted text-muted-foreground'}`}>
                      {opt}: {q[`option_${opt.toLowerCase()}` as keyof Question]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditId(q.id); setForm(q); setDialogOpen(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(q.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {questions.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada soal</p>}
      </div>
    </div>
  );
}

function NilaiPanel() {
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('results')
        .select('*, profiles(name, kelas), subjects(nama_mapel)')
        .order('created_at', { ascending: false });
      if (data) setResults(data);
    }
    fetch();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 text-sm font-semibold text-foreground">Nama</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Kelas</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Mapel</th>
                <th className="text-center p-4 text-sm font-semibold text-foreground">Nilai</th>
                <th className="text-center p-4 text-sm font-semibold text-foreground">Benar</th>
                <th className="text-center p-4 text-sm font-semibold text-foreground">Salah</th>
                <th className="text-center p-4 text-sm font-semibold text-foreground">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">{r.profiles?.name || '-'}</td>
                  <td className="p-4 text-sm text-muted-foreground">{r.profiles?.kelas || '-'}</td>
                  <td className="p-4 text-sm text-muted-foreground">{r.subjects?.nama_mapel || '-'}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${
                      r.score >= 70 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                    }`}>{r.score}</span>
                  </td>
                  <td className="p-4 text-center text-sm text-success">{r.correct_count}</td>
                  <td className="p-4 text-center text-sm text-destructive">{r.wrong_count}</td>
                  <td className="p-4 text-center text-sm text-muted-foreground">{r.duration_minutes ?? '-'} menit</td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Belum ada data nilai</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
