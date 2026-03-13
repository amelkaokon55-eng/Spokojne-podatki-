/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Users, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ArrowLeft,
  LayoutDashboard,
  GraduationCap,
  History,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Training {
  id: number;
  title: string;
  description: string;
  category: string;
  level: string;
  trainerName: string;
  price: number;
  coverImage: string;
}

interface Session {
  id: number;
  trainingId: number;
  dateStart: string;
  dateEnd: string;
  location: string;
  capacity: number;
  bookedCount: number;
  status: string;
}

interface Enrollment {
  id: number;
  trainingTitle: string;
  dateStart: string;
  location: string;
  status: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  createdAt: string;
}

export default function App() {
  const [view, setView] = useState<'catalog' | 'details' | 'my-enrollments' | 'organizer'>('catalog');
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [organizerStats, setOrganizerStats] = useState<any[]>([]);
  const [organizerEnrollments, setOrganizerEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTrainings();
    fetchMyEnrollments();
    if (view === 'organizer') {
      fetchOrganizerData();
    }
  }, [view]);

  const fetchTrainings = async () => {
    try {
      const res = await fetch('/api/trainings');
      const data = await res.json();
      setTrainings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyEnrollments = async () => {
    try {
      const res = await fetch('/api/my-enrollments');
      const data = await res.json();
      setMyEnrollments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrganizerData = async () => {
    try {
      const [statsRes, enrollRes] = await Promise.all([
        fetch('/api/organizer/stats'),
        fetch('/api/organizer/enrollments')
      ]);
      const stats = await statsRes.json();
      const enrolls = await enrollRes.json();
      setOrganizerStats(stats);
      setOrganizerEnrollments(enrolls);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewDetails = async (training: Training) => {
    setSelectedTraining(training);
    setLoading(true);
    try {
      const res = await fetch(`/api/trainings/${training.id}/sessions`);
      const data = await res.json();
      setSessions(data);
      setView('details');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) return;

    setEnrolling(true);
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          userName: formData.name,
          userEmail: formData.email,
          userPhone: formData.phone
        })
      });
      const data = await res.json();
      if (data.success) {
        const msg = data.status === 'waitlist' 
          ? 'Zostałeś dopisany do listy rezerwowej!' 
          : 'Zostałeś pomyślnie zapisany na szkolenie!';
        setSuccessMessage(msg);
        fetchMyEnrollments();
        setTimeout(() => {
          setSuccessMessage(null);
          setView('my-enrollments');
          setSelectedSessionId(null);
          setFormData({ name: '', email: '', phone: '' });
        }, 2000);
      } else {
        alert(data.error || 'Wystąpił błąd podczas zapisu.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEnrolling(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Czy na pewno chcesz zrezygnować z tego szkolenia?')) return;
    
    try {
      const res = await fetch(`/api/enrollments/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Twoja rezerwacja została anulowana.');
        fetchMyEnrollments();
        setTimeout(() => setSuccessMessage(null), 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportToCSV = () => {
    const headers = ['Szkolenie', 'Data', 'Uczestnik', 'Email', 'Status'];
    const rows = organizerEnrollments.map(e => [
      e.trainingTitle,
      format(new Date(e.dateStart), 'yyyy-MM-dd'),
      e.userName,
      e.userEmail,
      e.status
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "zapisy_spokojne_podatki.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setView('catalog')}
          >
            <div className="w-10 h-10 bg-[#5A5A40] rounded-full flex items-center justify-center text-white">
              <GraduationCap size={24} />
            </div>
            <span className="text-xl font-serif font-bold tracking-tight">Spokojne Podatki</span>
          </div>
          
          <div className="flex gap-6 items-center">
            <button 
              onClick={() => setView('catalog')}
              className={cn(
                "text-sm font-medium transition-colors",
                view === 'catalog' ? "text-[#5A5A40]" : "text-black/40 hover:text-black"
              )}
            >
              Katalog
            </button>
            <button 
              onClick={() => setView('my-enrollments')}
              className={cn(
                "text-sm font-medium transition-colors",
                view === 'my-enrollments' ? "text-[#5A5A40]" : "text-black/40 hover:text-black"
              )}
            >
              Moje zapisy
            </button>
            <button 
              onClick={() => setView('organizer')}
              className={cn(
                "text-sm font-medium transition-colors",
                view === 'organizer' ? "text-[#5A5A40]" : "text-black/40 hover:text-black"
              )}
            >
              Panel Organizatora
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {view === 'catalog' && (
            <motion.div
              key="catalog"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-12">
                <h1 className="text-5xl font-serif font-bold mb-4">Odkryj swoją ścieżkę rozwoju</h1>
                <p className="text-black/60 text-lg max-w-2xl">
                  Wybieraj spośród dziesiątek szkoleń prowadzonych przez ekspertów. 
                  Zarezerwuj miejsce w kilka sekund.
                </p>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-[400px] bg-white rounded-[32px] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {trainings.map((training) => (
                    <motion.div
                      key={training.id}
                      whileHover={{ y: -8 }}
                      className="group bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-black/5"
                    >
                      <div className="aspect-[4/3] overflow-hidden relative">
                        <img 
                          src={training.coverImage} 
                          alt={training.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider">
                            {training.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-8">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-2xl font-serif font-bold leading-tight">{training.title}</h3>
                        </div>
                        <p className="text-black/50 text-sm mb-6 line-clamp-2">{training.description}</p>
                        
                        <div className="flex items-center justify-between pt-6 border-t border-black/5">
                          <div>
                            <span className="block text-[10px] uppercase tracking-widest text-black/40 font-bold">Cena</span>
                            <span className="text-xl font-bold">{training.price.toFixed(2)} PLN</span>
                          </div>
                          <button 
                            onClick={() => handleViewDetails(training)}
                            className="w-12 h-12 rounded-full bg-[#5A5A40] text-white flex items-center justify-center hover:bg-[#4A4A30] transition-colors"
                          >
                            <ChevronRight size={24} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'details' && selectedTraining && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <button 
                onClick={() => setView('catalog')}
                className="flex items-center gap-2 text-black/40 hover:text-black mb-8 transition-colors group"
              >
                <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
                <span>Wróć do katalogu</span>
              </button>

              <div className="bg-white rounded-[48px] p-12 shadow-sm border border-black/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                  <div>
                    <span className="inline-block px-4 py-1 bg-[#5A5A40]/10 text-[#5A5A40] rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                      {selectedTraining.level}
                    </span>
                    <h2 className="text-5xl font-serif font-bold mb-6 leading-tight">{selectedTraining.title}</h2>
                    <p className="text-black/60 text-lg mb-8 leading-relaxed">
                      {selectedTraining.description}
                    </p>
                    
                    <div className="flex items-center gap-4 p-4 bg-[#F5F5F0] rounded-2xl">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#5A5A40]">
                        <Users size={24} />
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-widest text-black/40 font-bold">Prowadzący</span>
                        <span className="font-bold">{selectedTraining.trainerName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[32px] overflow-hidden h-full min-h-[300px]">
                    <img 
                      src={selectedTraining.coverImage} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <div className="border-t border-black/5 pt-12">
                  <h3 className="text-2xl font-serif font-bold mb-8">Dostępne terminy</h3>
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div 
                        key={session.id}
                        className={cn(
                          "p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6",
                          selectedSessionId === session.id 
                            ? "border-[#5A5A40] bg-[#5A5A40]/5" 
                            : "border-black/5 hover:border-black/10 bg-white"
                        )}
                        onClick={() => setSelectedSessionId(session.id)}
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-white rounded-2xl border border-black/5 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-bold text-black/40 uppercase">
                              {format(new Date(session.dateStart), 'MMM', { locale: pl })}
                            </span>
                            <span className="text-xl font-bold">
                              {format(new Date(session.dateStart), 'dd')}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-sm text-black/60 mb-1">
                              <Clock size={14} />
                              <span>{format(new Date(session.dateStart), 'HH:mm')} - {format(new Date(session.dateEnd), 'HH:mm')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-bold">
                              <MapPin size={14} className="text-[#5A5A40]" />
                              <span>{session.location}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="block text-[10px] uppercase tracking-widest text-black/40 font-bold">Miejsca</span>
                            <span className={cn(
                              "font-bold",
                              session.capacity - session.bookedCount <= 3 ? "text-orange-600" : "text-green-600"
                            )}>
                              {session.capacity - session.bookedCount} / {session.capacity} wolnych
                            </span>
                          </div>
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                            selectedSessionId === session.id ? "bg-[#5A5A40] border-[#5A5A40]" : "border-black/10"
                          )}>
                            {selectedSessionId === session.id && <CheckCircle2 size={14} className="text-white" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedSessionId && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 p-10 bg-[#1A1A1A] rounded-[32px] text-white"
                  >
                    <h3 className="text-2xl font-serif font-bold mb-6">Zapisz się teraz</h3>
                    <form onSubmit={handleEnroll} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Imię i Nazwisko</label>
                        <input 
                          required
                          type="text"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/40 transition-colors"
                          placeholder="np. Jan Kowalski"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Adres E-mail</label>
                        <input 
                          required
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/40 transition-colors"
                          placeholder="jan@przyklad.pl"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Numer Telefonu</label>
                        <input 
                          required
                          type="tel"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/40 transition-colors"
                          placeholder="+48 000 000 000"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <button 
                          disabled={enrolling}
                          className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {enrolling ? 'Przetwarzanie...' : 'Potwierdzam zapis'}
                          {!enrolling && <ChevronRight size={20} />}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'my-enrollments' && (
            <motion.div
              key="my-enrollments"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-12">
                <h1 className="text-5xl font-serif font-bold mb-4">Twoje szkolenia</h1>
                <p className="text-black/60 text-lg">Zarządzaj swoimi rezerwacjami i historią nauki.</p>
              </div>

              {myEnrollments.length === 0 ? (
                <div className="bg-white rounded-[48px] p-20 text-center border border-black/5">
                  <div className="w-20 h-20 bg-[#F5F5F0] rounded-full flex items-center justify-center mx-auto mb-6 text-black/20">
                    <History size={40} />
                  </div>
                  <h3 className="text-2xl font-serif font-bold mb-2">Brak zapisów</h3>
                  <p className="text-black/40 mb-8">Nie zapisałeś się jeszcze na żadne szkolenie.</p>
                  <button 
                    onClick={() => setView('catalog')}
                    className="bg-[#5A5A40] text-white px-8 py-3 rounded-full font-bold hover:bg-[#4A4A30] transition-colors"
                  >
                    Przeglądaj katalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {myEnrollments.map((enrollment) => (
                    <div 
                      key={enrollment.id}
                      className="bg-white p-8 rounded-[32px] border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-8"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center text-[#5A5A40]">
                          <BookOpen size={32} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-serif font-bold mb-2">{enrollment.trainingTitle}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-black/40">
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              <span>{format(new Date(enrollment.dateStart), 'PPP', { locale: pl })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin size={14} />
                              <span>{enrollment.location}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <span className="block text-[10px] uppercase tracking-widest text-black/40 font-bold">Status</span>
                          <span className={cn(
                            "inline-flex items-center gap-1 font-bold",
                            enrollment.status === 'confirmed' ? "text-green-600" : "text-orange-600"
                          )}>
                            {enrollment.status === 'confirmed' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                            {enrollment.status === 'confirmed' ? 'Potwierdzony' : 'Lista rezerwowa'}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleCancel(enrollment.id)}
                          className="text-sm font-bold text-black/20 hover:text-red-600 transition-colors"
                        >
                          Rezygnuj
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          {view === 'organizer' && (
            <motion.div
              key="organizer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex justify-between items-end mb-12">
                <div>
                  <h1 className="text-5xl font-serif font-bold mb-4">Panel Organizatora</h1>
                  <p className="text-black/60 text-lg">Zarządzaj szkoleniami i monitoruj zapisy uczestników.</p>
                </div>
                <button 
                  onClick={exportToCSV}
                  className="bg-[#1A1A1A] text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors flex items-center gap-2"
                >
                  <LayoutDashboard size={20} />
                  Eksportuj CSV
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {organizerStats.map((stat, i) => (
                  <div key={i} className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                    <h3 className="text-xl font-serif font-bold mb-4">{stat.title}</h3>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-black/40">Data:</span>
                      <span className="text-sm font-bold">{format(new Date(stat.dateStart), 'PPP', { locale: pl })}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-black/40">Zapisani:</span>
                      <span className="text-sm font-bold">{stat.bookedCount} / {stat.capacity}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-black/40">Lista rezerwowa:</span>
                      <span className="text-sm font-bold text-orange-600">{stat.waitlistCount} osób</span>
                    </div>
                    <div className="mt-6 h-2 bg-black/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#5A5A40] transition-all duration-1000" 
                        style={{ width: `${(stat.bookedCount / stat.capacity) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-[48px] overflow-hidden border border-black/5 shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F5F5F0] border-b border-black/5">
                      <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-black/40 font-bold">Uczestnik</th>
                      <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-black/40 font-bold">Szkolenie</th>
                      <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-black/40 font-bold">Data zapisu</th>
                      <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-black/40 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizerEnrollments.map((enroll) => (
                      <tr key={enroll.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors">
                        <td className="px-8 py-6">
                          <div className="font-bold">{enroll.userName}</div>
                          <div className="text-xs text-black/40">{enroll.userEmail}</div>
                          <div className="text-xs text-black/40">{enroll.userPhone}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="font-medium">{enroll.trainingTitle}</div>
                          <div className="text-xs text-black/40">{format(new Date(enroll.dateStart), 'PPP', { locale: pl })}</div>
                        </td>
                        <td className="px-8 py-6 text-sm text-black/40">
                          {format(new Date(enroll.createdAt), 'PP p', { locale: pl })}
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            enroll.status === 'confirmed' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                          )}>
                            {enroll.status === 'confirmed' ? 'Potwierdzony' : 'Lista rezerwowa'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Success Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 size={24} />
            <span className="font-bold">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
