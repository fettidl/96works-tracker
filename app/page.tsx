'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { PlusCircle, LogOut, TrendingUp, DollarSign, Wrench, Trash2, Calendar, User, Bike, Edit, ChevronDown, ChevronUp, Filter, Receipt, Copy, Printer, Check, Download, X, Menu, Settings, Tag } from 'lucide-react';
import Image from 'next/image';

const SHOP_TARGET = 25000;
const USER_SPLIT_PERCENT = 0.40;
const PARTNER_SPLIT_PERCENT = 0.60;

interface ServicePreset {
  id: string;
  name: string;
  base_labor: number;
  recovery_fee: number;
  customer_labor: number;
}

interface ServiceItem {
  id?: string;
  name: string;
  base_labor: number;
  recovery_fee: number;
  customer_labor: number;
  is_custom?: boolean;
}

interface PartItem {
  name: string;
  price: number;
}

interface Job {
  id: string;
  created_at: string;
  job_date: string;
  customer_name: string;
  unit?: string;
  mechanic?: string;
  service_name: string;
  base_labor: number;
  recovery_fee: number;
  customer_labor: number;
  parts_sales: number;
  total_sale: number;
  notes?: string;
  payment_status: string;
  parts_breakdown?: PartItem[];
  services_breakdown?: ServiceItem[];
}

type DateFilterType = 'today' | 'week' | 'month' | 'custom' | 'all';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // App data
  const [presetServices, setPresetServices] = useState<ServicePreset[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Navigation Drawer & Modals
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Pricing Form States
  const [editingPreset, setEditingPreset] = useState<ServicePreset | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetBaseLabor, setPresetBaseLabor] = useState<number | ''>('');
  const [presetRecoveryFee, setPresetRecoveryFee] = useState<number | ''>(50);

  // Receipt Modal State
  const [receiptJob, setReceiptJob] = useState<Job | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Date Filtering State
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Editing state for Job
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Form states for Job
  const [jobDate, setJobDate] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [unit, setUnit] = useState('');
  const [mechanic, setMechanic] = useState('');
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([
    { name: '', base_labor: 0, recovery_fee: 0, customer_labor: 0, is_custom: false },
  ]);
  const [partsList, setPartsList] = useState<PartItem[]>([{ name: '', price: 0 }]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setJobDate(today);
    setCustomStartDate(today);
    setCustomEndDate(today);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async () => {
    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .order('name');
    if (servicesData) setPresetServices(servicesData as ServicePreset[]);

    const { data: jobsData } = await supabase
      .from('jobs')
      .select('*')
      .order('job_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (jobsData) setJobs(jobsData as Job[]);
  };

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
  };

  const resetJobForm = () => {
    setJobDate(new Date().toISOString().split('T')[0]);
    setCustomerName('');
    setUnit('');
    setMechanic('');
    setSelectedServices([{ name: '', base_labor: 0, recovery_fee: 0, customer_labor: 0, is_custom: false }]);
    setPartsList([{ name: '', price: 0 }]);
    setNotes('');
    setEditingJob(null);
  };

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setJobDate(job.job_date || new Date(job.created_at).toISOString().split('T')[0]);
    setCustomerName(job.customer_name);
    setUnit(job.unit || '');
    setMechanic(job.mechanic || '');

    if (job.services_breakdown && job.services_breakdown.length > 0) {
      setSelectedServices(job.services_breakdown);
    } else {
      setSelectedServices([
        {
          name: job.service_name,
          base_labor: Number(job.base_labor || 0),
          recovery_fee: Number(job.recovery_fee || 0),
          customer_labor: Number(job.customer_labor || 0),
          is_custom: true,
        },
      ]);
    }

    if (job.parts_breakdown && job.parts_breakdown.length > 0) {
      setPartsList(job.parts_breakdown);
    } else {
      setPartsList([{ name: '', price: Number(job.parts_sales || 0) }]);
    }

    setNotes(job.notes || '');
  };

  const handleDeleteJob = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this job entry?')) {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (!error) {
        setJobs(jobs.filter((j) => j.id !== id));
      } else {
        alert('Error deleting: ' + error.message);
      }
    }
  };

  // Service Row Handlers
  const handleAddServiceRow = () => {
    setSelectedServices([
      ...selectedServices,
      { name: '', base_labor: 0, recovery_fee: 0, customer_labor: 0, is_custom: false },
    ]);
  };

  const handleRemoveServiceRow = (index: number) => {
    const updated = selectedServices.filter((_, i) => i !== index);
    setSelectedServices(
      updated.length
        ? updated
        : [{ name: '', base_labor: 0, recovery_fee: 0, customer_labor: 0, is_custom: false }]
    );
  };

  const handlePresetSelect = (index: number, serviceId: string) => {
    const updated = [...selectedServices];
    if (serviceId === '__custom__' || serviceId === '') {
      updated[index] = {
        name: '',
        base_labor: 0,
        recovery_fee: 50,
        customer_labor: 50,
        is_custom: serviceId === '__custom__',
      };
    } else {
      const preset = presetServices.find((s) => s.id === serviceId);
      if (preset) {
        updated[index] = {
          id: preset.id,
          name: preset.name,
          base_labor: Number(preset.base_labor),
          recovery_fee: Number(preset.recovery_fee),
          customer_labor: Number(preset.customer_labor),
          is_custom: false,
        };
      }
    }
    setSelectedServices(updated);
  };

  const handleCustomServiceChange = (index: number, field: string, val: any) => {
    const updated = [...selectedServices];
    const item = { ...updated[index] };
    if (field === 'name') item.name = val;
    if (field === 'base_labor') item.base_labor = Number(val) || 0;
    if (field === 'recovery_fee') item.recovery_fee = Number(val) || 0;
    item.customer_labor = item.base_labor + item.recovery_fee;
    updated[index] = item;
    setSelectedServices(updated);
  };

  // Parts Row Handlers
  const handleAddPartRow = () => {
    setPartsList([...partsList, { name: '', price: 0 }]);
  };

  const handleRemovePartRow = (index: number) => {
    const updated = partsList.filter((_, i) => i !== index);
    setPartsList(updated.length ? updated : [{ name: '', price: 0 }]);
  };

  const handlePartChange = (index: number, field: 'name' | 'price', value: any) => {
    const updated = [...partsList];
    updated[index] = { ...updated[index], [field]: field === 'price' ? Number(value) || 0 : value };
    setPartsList(updated);
  };

  const validServices = selectedServices.filter((s) => s.name.trim() !== '');
  const currentBaseLabor = validServices.reduce((sum, s) => sum + s.base_labor, 0);
  const currentRecoveryFee = validServices.reduce((sum, s) => sum + s.recovery_fee, 0);
  const currentLaborTotal = currentBaseLabor + currentRecoveryFee;

  const validParts = partsList.filter((p) => p.name.trim() !== '' || p.price > 0);
  const currentPartsTotal = validParts.reduce((sum, p) => sum + Number(p.price || 0), 0);
  const currentTotalCustomerPay = currentLaborTotal + currentPartsTotal;

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) {
      alert('Please enter a customer name');
      return;
    }
    if (validServices.length === 0) {
      alert('Please add at least one service');
      return;
    }

    setIsSubmitting(true);
    const combinedServiceName = validServices.map((s) => s.name).join(' + ');

    const payload = {
      job_date: jobDate,
      customer_name: customerName,
      unit: unit.trim() || 'N/A',
      mechanic: mechanic.trim() || 'Unassigned',
      service_id: validServices[0].id || null,
      service_name: combinedServiceName,
      base_labor: currentBaseLabor,
      recovery_fee: currentRecoveryFee,
      customer_labor: currentLaborTotal,
      parts_sales: currentPartsTotal,
      parts_breakdown: validParts,
      services_breakdown: validServices,
      total_sale: currentTotalCustomerPay,
      notes: notes,
      payment_status: 'Paid',
    };

    let responseError;
    if (editingJob) {
      const { error } = await supabase.from('jobs').update(payload).eq('id', editingJob.id);
      responseError = error;
    } else {
      const { error } = await supabase.from('jobs').insert([payload]);
      responseError = error;
    }

    setIsSubmitting(false);

    if (!responseError) {
      resetJobForm();
      setShowAddModal(false);
      loadData();
    } else {
      alert('Error saving job: ' + responseError.message);
    }
  };

  // Labor Pricing Handlers
  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetName.trim()) {
      alert('Service name is required');
      return;
    }

    const base = Number(presetBaseLabor) || 0;
    const rec = Number(presetRecoveryFee) || 0;
    const total = base + rec;

    const payload = {
      name: presetName.trim(),
      base_labor: base,
      recovery_fee: rec,
      customer_labor: total,
    };

    if (editingPreset) {
      const { error } = await supabase.from('services').update(payload).eq('id', editingPreset.id);
      if (error) alert('Error updating: ' + error.message);
    } else {
      const { error } = await supabase.from('services').insert([payload]);
      if (error) alert('Error adding: ' + error.message);
    }

    setEditingPreset(null);
    setPresetName('');
    setPresetBaseLabor('');
    setPresetRecoveryFee(50);
    loadData();
  };

  const handleEditPresetClick = (preset: ServicePreset) => {
    setEditingPreset(preset);
    setPresetName(preset.name);
    setPresetBaseLabor(preset.base_labor);
    setPresetRecoveryFee(preset.recovery_fee);
  };

  const handleDeletePreset = async (id: string) => {
    if (confirm('Delete this service preset?')) {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (!error) {
        setPresetServices(presetServices.filter((s) => s.id !== id));
      } else {
        alert('Error deleting: ' + error.message);
      }
    }
  };

  const copyReceiptToClipboard = (job: Job) => {
    let text = `==============================\n       🏍️ 96 WORKS 🏍️\n   Motorcycle Service & Parts\n==============================\n`;
    text += `Date: ${job.job_date || new Date(job.created_at).toLocaleDateString()}\n`;
    text += `Customer: ${job.customer_name}\n`;
    text += `Unit: ${job.unit || 'N/A'}\n`;
    text += `Mechanic: ${job.mechanic || 'Unassigned'}\n`;
    text += `------------------------------\n`;

    if (job.services_breakdown && job.services_breakdown.length > 0) {
      text += `SERVICES:\n`;
      job.services_breakdown.forEach((s) => {
        text += `• ${s.name} - ₱${Number(s.customer_labor).toLocaleString()}\n`;
      });
    } else {
      text += `SERVICES: ${job.service_name} - ₱${Number(job.customer_labor).toLocaleString()}\n`;
    }

    if (job.parts_breakdown && job.parts_breakdown.length > 0) {
      text += `\nPARTS SOLD:\n`;
      job.parts_breakdown.forEach((p) => {
        text += `• ${p.name || 'Part'} - ₱${Number(p.price).toLocaleString()}\n`;
      });
    }

    text += `------------------------------\n`;
    text += `TOTAL AMOUNT: ₱${Number(job.total_sale).toLocaleString()}\n`;
    text += `STATUS: Paid\n`;
    if (job.notes) text += `Remarks: ${job.notes}\n`;
    text += `==============================\nThank you for choosing 96 Works!`;

    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2500);
  };

  // Date Filtering Logic
  const filteredJobs = useMemo(() => {
    if (dateFilter === 'all') return jobs;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return jobs.filter((job) => {
      const jDate = job.job_date || new Date(job.created_at).toISOString().split('T')[0];

      if (dateFilter === 'today') {
        return jDate === todayStr;
      }

      if (dateFilter === 'week') {
        const d = new Date(jDate);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return d >= monday;
      }

      if (dateFilter === 'month') {
        const currentMonth = todayStr.substring(0, 7);
        return jDate.startsWith(currentMonth);
      }

      if (dateFilter === 'custom') {
        if (customStartDate && customEndDate) {
          return jDate >= customStartDate && jDate <= customEndDate;
        }
        if (customStartDate) return jDate >= customStartDate;
        if (customEndDate) return jDate <= customEndDate;
      }

      return true;
    });
  }, [jobs, dateFilter, customStartDate, customEndDate]);

  const totalRecovered = jobs.reduce((sum, j) => sum + Number(j.recovery_fee || 0), 0);
  const remainingTarget = Math.max(0, SHOP_TARGET - totalRecovered);
  const progressPercent = Math.min(100, (totalRecovered / SHOP_TARGET) * 100);

  const filteredLaborRevenue = filteredJobs.reduce((sum, j) => sum + Number(j.customer_labor || 0), 0);
  const filteredPartsRevenue = filteredJobs.reduce((sum, j) => sum + Number(j.parts_sales || 0), 0);
  const filteredRecoveryTotal = filteredJobs.reduce((sum, j) => sum + Number(j.recovery_fee || 0), 0);
  const filteredTotalRevenue = filteredJobs.reduce((sum, j) => sum + Number(j.total_sale || 0), 0);

  const handleExportCSV = () => {
    if (filteredJobs.length === 0) {
      alert('No jobs to export for the selected period.');
      return;
    }

    const headers = [
      'Date', 'Customer', 'Unit', 'Mechanic', 'Services', 'Parts Sold',
      'Labor (PHP)', 'Parts (PHP)', 'Shop Cut / ROI (PHP)', 'Total Paid (PHP)', 'Notes'
    ];

    const escapeCSV = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = filteredJobs.map((job) => {
      const partsSummary = job.parts_breakdown && job.parts_breakdown.length > 0
        ? job.parts_breakdown.map((p) => `${p.name} (P${p.price})`).join('; ')
        : (job.parts_sales > 0 ? `Parts (P${job.parts_sales})` : 'None');

      return [
        escapeCSV(job.job_date || new Date(job.created_at).toLocaleDateString()),
        escapeCSV(job.customer_name),
        escapeCSV(job.unit || 'N/A'),
        escapeCSV(job.mechanic || 'Unassigned'),
        escapeCSV(job.service_name),
        escapeCSV(partsSummary),
        Number(job.customer_labor || 0),
        Number(job.parts_sales || 0),
        Number(job.recovery_fee || 0),
        Number(job.total_sale || 0),
        escapeCSV(job.notes || '')
      ].join(',');
    });

    const summaryRow = [
      escapeCSV('TOTALS'),
      escapeCSV(`Total Jobs: ${filteredJobs.length}`),
      escapeCSV(''), escapeCSV(''), escapeCSV(''), escapeCSV(''),
      filteredLaborRevenue,
      filteredPartsRevenue,
      filteredRecoveryTotal,
      filteredTotalRevenue,
      escapeCSV(`40% Split: P${(filteredRecoveryTotal * USER_SPLIT_PERCENT).toFixed(2)} | 60% Split: P${(filteredRecoveryTotal * PARTNER_SPLIT_PERCENT).toFixed(2)}`)
    ].join(',');

    const csvContent = '\uFEFF' + [headers.join(','), ...rows, summaryRow].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `96works_report_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 font-sans">
        Loading 96 Works...
      </div>
    );
  }

  // LOGIN SCREEN
  if (!session) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl w-full max-w-sm border border-slate-700/80">
          <div className="text-center mb-6 flex flex-col items-center">
            <Image
              src="/logo.png"
              alt="96 Works Logo"
              width={140}
              height={60}
              className="h-14 w-auto object-contain mx-auto mb-2"
              priority
            />
            <p className="text-slate-400 text-xs">Shop Tracker & ROI System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-900/40 border border-red-500/50 rounded-xl text-red-300 text-xs">
                {authError}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors shadow-lg shadow-amber-500/20 text-sm active:scale-[0.98]"
            >
              Sign In
            </button>
          </form>
        </div>
      </main>
    );
  }

  // DASHBOARD & LOG BOOK VIEW
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-28 print:bg-white print:text-black print:pb-0">
      {/* Header with Hamburger Menu Button */}
      <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800/80 px-4 py-3 sticky top-0 z-30 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-2.5">
          {/* Hamburger Icon */}
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 text-slate-300 hover:text-white rounded-xl active:bg-slate-800 transition -ml-1.5"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Image
            src="/logo.png"
            alt="96 Works Logo"
            width={95}
            height={38}
            className="h-8 sm:h-9 w-auto object-contain"
            priority
          />
          <span className="text-[10px] sm:text-xs text-slate-400 border-l border-slate-700 pl-2 hidden min-[380px]:inline">
            Shop Tracker
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetJobForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 bg-amber-500 active:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs sm:text-sm shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log Job</span>
          </button>
        </div>
      </header>

      {/* SLIDE-OUT MOBILE / DESKTOP NAVIGATION DRAWER */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          <div className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 h-full p-5 flex flex-col justify-between shadow-2xl z-10">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <Image
                  src="/logo.png"
                  alt="96 Works Logo"
                  width={110}
                  height={45}
                  className="h-9 w-auto object-contain"
                  priority
                />
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1 text-sm font-semibold">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition text-left"
                >
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <span>Dashboard & ROI</span>
                </button>

                <button
                  onClick={() => {
                    resetJobForm();
                    setMenuOpen(false);
                    setShowAddModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition text-left"
                >
                  <PlusCircle className="w-4 h-4 text-amber-500" />
                  <span>Add New Log</span>
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    const historyElement = document.getElementById('log-history-section');
                    if (historyElement) {
                      historyElement.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition text-left"
                >
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span>View History Logs</span>
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setShowPricingModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition text-left"
                >
                  <Tag className="w-4 h-4 text-amber-400" />
                  <span>Labor Pricing & Presets</span>
                </button>
              </nav>
            </div>

            {/* Logout Footer */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-950/30 rounded-xl transition text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({session.user?.email})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LABOR PRICING MODAL */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Labor Pricing & Services</h3>
              </div>
              <button
                onClick={() => {
                  setShowPricingModal(false);
                  setEditingPreset(null);
                  setPresetName('');
                  setPresetBaseLabor('');
                  setPresetRecoveryFee(50);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Add / Edit Form */}
              <form onSubmit={handleSavePreset} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide block">
                  {editingPreset ? 'Edit Service Preset' : 'Add New Service Preset'}
                </span>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Service Name</label>
                  <input
                    type="text"
                    placeholder="e.g. CVT Cleaning & Tuning"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-base sm:text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Base Labor (₱)</label>
                    <input
                      type="number"
                      placeholder="e.g. 300"
                      value={presetBaseLabor}
                      onChange={(e) => setPresetBaseLabor(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-base sm:text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Recovery Cut (₱)</label>
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={presetRecoveryFee}
                      onChange={(e) => setPresetRecoveryFee(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-base sm:text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="pt-1 flex gap-2">
                  {editingPreset && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPreset(null);
                        setPresetName('');
                        setPresetBaseLabor('');
                        setPresetRecoveryFee(50);
                      }}
                      className="w-1/3 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-amber-500 active:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition"
                  >
                    {editingPreset ? 'Update Price' : '+ Add Service Preset'}
                  </button>
                </div>
              </form>

              {/* Service List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">
                  Active Price List ({presetServices.length})
                </span>

                {presetServices.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-white text-sm">{preset.name}</div>
                      <div className="text-xs text-slate-400">
                        Base: ₱{preset.base_labor} | Rec: ₱{preset.recovery_fee} | Total: <span className="text-amber-400 font-semibold">₱{preset.customer_labor}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleEditPresetClick(preset)}
                        className="p-2 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition"
                        title="Edit Price"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePreset(preset.id)}
                        className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                        title="Delete Preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Dashboard */}
      <div className="max-w-4xl mx-auto p-3.5 sm:p-5 space-y-4 sm:space-y-6 print:hidden">
        {/* All-time ROI Card */}
        <section className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> ROI Progress
            </span>
            <span className="text-xs font-extrabold text-amber-400">{progressPercent.toFixed(1)}%</span>
          </div>

          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-3">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 pt-2 border-t border-slate-800/80">
            <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/50">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Target</div>
              <div className="text-sm sm:text-base font-bold">₱{SHOP_TARGET.toLocaleString()}</div>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/50">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Recovered</div>
              <div className="text-sm sm:text-base font-bold text-emerald-400">₱{totalRecovered.toLocaleString()}</div>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/50">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Remaining</div>
              <div className="text-sm sm:text-base font-bold text-amber-400">₱{remainingTarget.toLocaleString()}</div>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/50">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Total Jobs</div>
              <div className="text-sm sm:text-base font-bold">{jobs.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300">
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Your Share (40%)</span>
              <span className="font-bold text-emerald-400 text-sm">₱{(totalRecovered * USER_SPLIT_PERCENT).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 block">Cap: ₱10,000</span>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Partner Share (60%)</span>
              <span className="font-bold text-emerald-400 text-sm">₱{(totalRecovered * PARTNER_SPLIT_PERCENT).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 block">Cap: ₱15,000</span>
            </div>
          </div>
        </section>

        {/* Date Filter Bar */}
        <section className="bg-slate-900 border border-slate-800/90 rounded-2xl p-3.5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Date Filter
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'}
              </span>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/20 active:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
              { id: 'custom', label: 'Custom' },
              { id: 'all', label: 'All' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id as DateFilterType)}
                className={`py-2 text-xs font-semibold rounded-xl transition ${
                  dateFilter === tab.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-950 text-slate-400 active:text-white border border-slate-800/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {dateFilter === 'custom' && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-base sm:text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-base sm:text-xs"
                />
              </div>
            </div>
          )}
        </section>

        {/* Filtered Period Revenue Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mb-0.5">
              <Wrench className="w-3 h-3 text-amber-500" /> Labor
            </span>
            <div className="text-sm sm:text-lg font-bold">₱{filteredLaborRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mb-0.5">
              <DollarSign className="w-3 h-3 text-blue-400" /> Parts
            </span>
            <div className="text-sm sm:text-lg font-bold">₱{filteredPartsRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mb-0.5">
              <TrendingUp className="w-3 h-3 text-emerald-400" /> Shop Cut
            </span>
            <div className="text-sm sm:text-lg font-bold text-emerald-400">₱{filteredRecoveryTotal.toLocaleString()}</div>
          </div>
        </div>

        {/* Log History Section */}
        <section id="log-history-section" className="space-y-2.5">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Log History ({filteredJobs.length})
            </h2>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="bg-slate-900 border border-dashed border-slate-800 p-8 text-center rounded-2xl text-slate-500 text-xs">
              No entries logged for this period.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredJobs.map((job) => {
                const isExpanded = expandedJobId === job.id;
                return (
                  <div
                    key={job.id}
                    className="bg-slate-900 border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5 transition active:border-slate-700"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div
                        onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                        className="cursor-pointer flex-1 select-none"
                      >
                        <div className="font-bold text-white text-base leading-tight flex items-center gap-1.5">
                          {job.customer_name}
                          <span className="text-slate-500 text-xs">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />}
                          </span>
                        </div>
                        <div className="text-xs text-amber-400 font-medium mt-0.5">{job.service_name}</div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <div className="text-right">
                          <div className="text-base font-black text-white">₱{Number(job.total_sale).toLocaleString()}</div>
                          <div className="text-[11px] text-emerald-400 font-semibold">+₱{Number(job.recovery_fee)} ROI</div>
                        </div>
                        <button
                          onClick={() => setReceiptJob(job)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 active:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    </div>

                    <div
                      onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                      className="cursor-pointer space-y-1.5 select-none"
                    >
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-500" /> {job.job_date || new Date(job.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Bike className="w-3 h-3 text-slate-500" /> {job.unit || 'N/A'}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3 text-slate-500" /> Mech: {job.mechanic || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between text-xs text-slate-400 bg-slate-950/50 px-2.5 py-1.5 rounded-xl border border-slate-800/40">
                        <span>Labor: ₱{Number(job.customer_labor).toLocaleString()}</span>
                        <span>Parts: ₱{Number(job.parts_sales).toLocaleString()}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
                        <div>
                          <span className="font-semibold text-amber-400 block mb-1">Parts Sold:</span>
                          {job.parts_breakdown && job.parts_breakdown.length > 0 ? (
                            <ul className="space-y-1 pl-2 border-l-2 border-slate-800">
                              {job.parts_breakdown.map((part, pIdx) => (
                                <li key={pIdx} className="flex justify-between">
                                  <span>{part.name || 'Unnamed part'}</span>
                                  <span className="font-medium text-slate-200">₱{Number(part.price).toLocaleString()}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-slate-500 italic pl-2">No individual parts recorded</div>
                          )}
                        </div>

                        {job.services_breakdown && job.services_breakdown.length > 0 && (
                          <div>
                            <span className="font-semibold text-amber-400 block mb-1">Services Breakdown:</span>
                            <ul className="space-y-1 pl-2 border-l-2 border-slate-800">
                              {job.services_breakdown.map((srv, sIdx) => (
                                <li key={sIdx} className="flex justify-between">
                                  <span>{srv.name}</span>
                                  <span className="font-medium text-slate-200">₱{Number(srv.customer_labor).toLocaleString()}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {job.notes && (
                          <div className="bg-slate-950 p-2 rounded-xl text-slate-400 italic">
                            Notes: {job.notes}
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                          <button
                            onClick={() => openEditModal(job)}
                            className="flex items-center gap-1 px-3 py-2 bg-slate-800 active:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={(e) => handleDeleteJob(job.id, e)}
                            className="flex items-center gap-1 px-3 py-2 bg-red-950/40 active:bg-red-900/60 text-red-400 rounded-xl text-xs font-semibold transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Floating Add Job Button */}
      <button
        onClick={() => {
          resetJobForm();
          setShowAddModal(true);
        }}
        className="fixed bottom-6 right-6 sm:hidden bg-amber-500 active:bg-amber-400 text-slate-950 p-4 rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-95 transition"
      >
        <PlusCircle className="w-7 h-7" />
      </button>

      {/* DIGITAL THERMAL RECEIPT MODAL */}
      {receiptJob && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white text-slate-950 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto print:p-0 print:shadow-none print:w-full">
            <div id="thermal-receipt" className="font-mono text-xs space-y-3">
              <div className="text-center pb-3 border-b-2 border-dashed border-slate-300 flex flex-col items-center">
                <Image
                  src="/logo.png"
                  alt="96 Works Logo"
                  width={120}
                  height={48}
                  className="h-10 w-auto object-contain mx-auto mb-1"
                  priority
                />
                <div className="text-[10px] uppercase tracking-wide text-slate-600 font-semibold">Motorcycle Service & Parts</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Official Shop Receipt</div>
              </div>

              <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{receiptJob.job_date || new Date(receiptJob.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold">{receiptJob.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit:</span>
                  <span>{receiptJob.unit || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mechanic:</span>
                  <span>{receiptJob.mechanic || 'Unassigned'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-[10px] tracking-wider uppercase text-slate-600 block">Labor & Services</span>
                {receiptJob.services_breakdown && receiptJob.services_breakdown.length > 0 ? (
                  receiptJob.services_breakdown.map((s, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate pr-2">{s.name}</span>
                      <span className="font-semibold">₱{Number(s.customer_labor).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between">
                    <span>{receiptJob.service_name}</span>
                    <span className="font-semibold">₱{Number(receiptJob.customer_labor).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {receiptJob.parts_breakdown && receiptJob.parts_breakdown.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-dashed border-slate-200">
                  <span className="font-bold text-[10px] tracking-wider uppercase text-slate-600 block">Parts & Consumables</span>
                  {receiptJob.parts_breakdown.map((p, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate pr-2">{p.name || 'Part item'}</span>
                      <span className="font-semibold">₱{Number(p.price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t-2 border-dashed border-slate-300 space-y-1">
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Subtotal Labor:</span>
                  <span>₱{Number(receiptJob.customer_labor).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Subtotal Parts:</span>
                  <span>₱{Number(receiptJob.parts_sales).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-black pt-1 border-t border-slate-900 text-black">
                  <span>TOTAL PAID:</span>
                  <span>₱{Number(receiptJob.total_sale).toLocaleString()}</span>
                </div>
              </div>

              {receiptJob.notes && (
                <div className="text-[10px] text-slate-500 italic pt-1 border-t border-dashed border-slate-200">
                  Remarks: {receiptJob.notes}
                </div>
              )}

              <div className="text-center pt-3 border-t-2 border-dashed border-slate-300 text-[10px] text-slate-500">
                <div>Ride safe and thank you!</div>
                <div>Keep receipt for warranty.</div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200 print:hidden font-sans">
              <button
                onClick={() => copyReceiptToClipboard(receiptJob)}
                className="w-full py-3 bg-blue-600 active:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                {copiedReceipt ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copiedReceipt ? 'Copied to Clipboard!' : 'Copy for Messenger / SMS'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.print()}
                  className="py-2.5 bg-slate-900 active:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={() => setReceiptJob(null)}
                  className="py-2.5 bg-slate-200 active:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT JOB DRAWER */}
      {(showAddModal || editingJob) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-slate-800/80">
              <h3 className="text-base font-bold text-white">
                {editingJob ? 'Edit Log Entry' : 'Log New Job'}
              </h3>
              <button
                onClick={() => {
                  resetJobForm();
                  setShowAddModal(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={jobDate}
                    onChange={(e) => setJobDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-base sm:text-xs focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mechanic</label>
                  <input
                    type="text"
                    placeholder="e.g. Kuya Dan / Weweng"
                    value={mechanic}
                    onChange={(e) => setMechanic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-base sm:text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Santos"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-base sm:text-xs focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Motorcycle Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. Aerox 155 / Click 125"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-base sm:text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Services Section */}
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Services ({validServices.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddServiceRow}
                    className="text-xs text-amber-400 active:text-amber-300 font-semibold flex items-center gap-1 py-1 px-2"
                  >
                    + Add Service
                  </button>
                </div>

                {selectedServices.map((srv, index) => (
                  <div key={index} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex gap-2 items-center">
                      <select
                        value={srv.is_custom ? '__custom__' : srv.id || ''}
                        onChange={(e) => handlePresetSelect(index, e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-base sm:text-xs focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">-- Select Preset Service --</option>
                        {presetServices.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₱{p.customer_labor})
                          </option>
                        ))}
                        <option value="__custom__">⚙️ + Custom Service / Price</option>
                      </select>

                      {selectedServices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveServiceRow(index)}
                          className="text-slate-500 active:text-red-400 p-2"
                          title="Remove service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {srv.is_custom && (
                      <div className="space-y-2 pt-1 border-t border-slate-800/80">
                        <input
                          type="text"
                          placeholder="Custom service name"
                          value={srv.name}
                          onChange={(e) => handleCustomServiceChange(index, 'name', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-base sm:text-xs"
                          required
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400">Base Labor (₱)</span>
                            <input
                              type="number"
                              value={srv.base_labor || ''}
                              placeholder="0"
                              onChange={(e) => handleCustomServiceChange(index, 'base_labor', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-base sm:text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400">Recovery Fee (₱)</span>
                            <input
                              type="number"
                              value={srv.recovery_fee || ''}
                              placeholder="50"
                              onChange={(e) => handleCustomServiceChange(index, 'recovery_fee', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-base sm:text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Parts Section */}
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">Parts Sold</span>
                  <button
                    type="button"
                    onClick={handleAddPartRow}
                    className="text-xs text-amber-400 active:text-amber-300 font-semibold flex items-center gap-1 py-1 px-2"
                  >
                    + Add Part
                  </button>
                </div>

                {partsList.map((part, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Part item (e.g. Belt, Oil)"
                      value={part.name}
                      onChange={(e) => handlePartChange(index, 'name', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-base sm:text-xs"
                    />
                    <input
                      type="number"
                      placeholder="₱ Price"
                      value={part.price || ''}
                      onChange={(e) => handlePartChange(index, 'price', e.target.value)}
                      className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-base sm:text-xs text-right"
                    />
                    {partsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePartRow(index)}
                        className="text-slate-500 active:text-red-400 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 space-y-1 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Labor Total:</span>
                  <span className="font-semibold text-white">₱{currentLaborTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Parts Total:</span>
                  <span className="font-semibold text-white">₱{currentPartsTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Shop Recovery Cut:</span>
                  <span className="font-semibold text-emerald-400">+₱{currentRecoveryFee.toLocaleString()}</span>
                </div>
                <div className="border-t border-amber-500/20 pt-1 flex justify-between items-baseline text-sm font-bold text-amber-400">
                  <span>Total Customer Pay:</span>
                  <span className="text-base text-amber-300">₱{currentTotalCustomerPay.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Notes (e.g. Paid via GCash / Cash)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-base sm:text-xs"
                />
              </div>

              <div className="flex gap-2 pt-1 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    resetJobForm();
                    setShowAddModal(false);
                  }}
                  className="w-1/2 py-3 bg-slate-800 active:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-3 bg-amber-500 active:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition"
                >
                  {isSubmitting ? 'Saving...' : editingJob ? 'Update Log' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}