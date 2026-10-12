'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { PlusCircle, LogOut, TrendingUp, DollarSign, Wrench, Trash2, Calendar, User, Bike, Edit, ChevronDown, ChevronUp, Filter, Receipt, Copy, Printer, Check, Download } from 'lucide-react';
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

  // Receipt Modal State
  const [receiptJob, setReceiptJob] = useState<Job | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Date Filtering State
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Editing state
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Form states
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
    await supabase.auth.signOut();
  };

  const resetForm = () => {
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
    if (confirm('Are you sure you want to delete this job log? This action cannot be undone.')) {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (!error) {
        setJobs(jobs.filter((j) => j.id !== id));
      } else {
        alert('Error deleting: ' + error.message);
      }
    }
  };

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
    if (serviceId === '__custom__') {
      updated[index] = {
        name: '',
        base_labor: 0,
        recovery_fee: 50,
        customer_labor: 50,
        is_custom: true,
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
      resetForm();
      setShowAddModal(false);
      loadData();
    } else {
      alert('Error saving job: ' + responseError.message);
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

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredJobs.length === 0) {
      alert('No jobs to export for the selected period.');
      return;
    }

    const headers = [
      'Date',
      'Customer',
      'Unit',
      'Mechanic',
      'Services',
      'Parts Sold',
      'Labor (PHP)',
      'Parts (PHP)',
      'Shop Cut / ROI (PHP)',
      'Total Paid (PHP)',
      'Notes'
    ];

    const escapeCSV = (val: any) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

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

    // Summary Totals Row at the bottom
    const summaryRow = [
      escapeCSV('TOTALS'),
      escapeCSV(`Total Jobs: ${filteredJobs.length}`),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Loading 96 Works...
      </div>
    );
  }

  // LOGIN SCREEN
  if (!session) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-700">
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
              <div className="p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-xs">
                {authError}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base sm:text-sm"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base sm:text-sm"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors shadow-lg shadow-amber-500/20 text-sm"
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
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-24 print:bg-white print:text-black print:pb-0">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="96 Works Logo"
            width={100}
            height={40}
            className="h-9 w-auto object-contain"
            priority
          />
          <span className="text-[11px] text-slate-400 border-l border-slate-700 pl-2.5 hidden sm:inline">
            Shop Tracker & Log Book
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-sm shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Log New Job</span>
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6 print:hidden">
        {/* Target Progress Card */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-amber-500" /> ROI Recovery Progress (All-Time)
            </span>
            <span className="text-xs font-bold text-amber-400">{progressPercent.toFixed(1)}%</span>
          </div>

          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mb-3">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4 pt-2 border-t border-slate-800/80">
            <div>
              <div className="text-xs text-slate-400">Target</div>
              <div className="text-base font-bold">₱{SHOP_TARGET.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Recovered</div>
              <div className="text-base font-bold text-emerald-400">₱{totalRecovered.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Remaining</div>
              <div className="text-base font-bold text-amber-400">₱{remainingTarget.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Total Jobs</div>
              <div className="text-base font-bold">{jobs.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/60">
              <span className="text-slate-400 block mb-0.5">Your Share (40%):</span>
              <span className="font-semibold text-emerald-400">₱{(totalRecovered * USER_SPLIT_PERCENT).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 block">Target: ₱10,000</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/60">
              <span className="text-slate-400 block mb-0.5">Partner Share (60%):</span>
              <span className="font-semibold text-emerald-400">₱{(totalRecovered * PARTNER_SPLIT_PERCENT).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 block">Target: ₱15,000</span>
            </div>
          </div>
        </section>

        {/* Date Filter & Export Bar */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filter by Period
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                <span className="text-white font-medium">{filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'}</span>
              </span>
              {/* CSV Export Button */}
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-semibold transition shadow-sm"
                title="Download CSV Spreadsheet Report"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span> CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
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
                className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                  dateFilter === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {dateFilter === 'custom' && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                />
              </div>
            </div>
          )}
        </section>

        {/* Filtered Period Revenue Summary */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center sm:text-left">
            <span className="text-[10px] sm:text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1 mb-0.5">
              <Wrench className="w-3 h-3 text-amber-500" /> Labor Total
            </span>
            <div className="text-base sm:text-lg font-bold">₱{filteredLaborRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center sm:text-left">
            <span className="text-[10px] sm:text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1 mb-0.5">
              <DollarSign className="w-3 h-3 text-blue-400" /> Parts Total
            </span>
            <div className="text-base sm:text-lg font-bold">₱{filteredPartsRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center sm:text-left">
            <span className="text-[10px] sm:text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1 mb-0.5">
              <TrendingUp className="w-3 h-3 text-emerald-400" /> ROI Cut
            </span>
            <div className="text-base sm:text-lg font-bold text-emerald-400">₱{filteredRecoveryTotal.toLocaleString()}</div>
          </div>
        </div>

        {/* Log History */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Log History ({filteredJobs.length})
            </h2>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="bg-slate-900 border border-dashed border-slate-800 p-8 text-center rounded-xl text-slate-500 text-sm">
              No entries found for the selected period.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => {
                const isExpanded = expandedJobId === job.id;
                return (
                  <div
                    key={job.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl space-y-2 transition"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div
                        onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                        className="cursor-pointer flex-1"
                      >
                        <div className="font-bold text-white text-base flex items-center gap-2">
                          {job.customer_name}
                          <span className="text-slate-500 text-xs">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />}
                          </span>
                        </div>
                        <div className="text-xs text-amber-400 font-semibold">{job.service_name}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setReceiptJob(job)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-bold transition shadow-sm"
                          title="Generate Receipt"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>

                        <div className="text-right pl-1">
                          <div className="text-base font-extrabold text-white">₱{Number(job.total_sale).toLocaleString()}</div>
                          <div className="text-xs text-emerald-400 font-medium">+₱{Number(job.recovery_fee)} ROI</div>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-500" /> {job.job_date || new Date(job.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Bike className="w-3 h-3 text-slate-500" /> {job.unit || 'N/A'}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3 text-slate-500" /> Mech: {job.mechanic || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between text-xs text-slate-400 pt-1 bg-slate-950/40 px-2 py-1 rounded mt-1">
                        <span>Labor: ₱{Number(job.customer_labor).toLocaleString()}</span>
                        <span>Parts: ₱{Number(job.parts_sales).toLocaleString()}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
                        <div>
                          <span className="font-semibold text-amber-400 block mb-1">Parts Sold Breakdown:</span>
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
                            <div className="text-slate-500 italic pl-2">No individual parts recorded (₱{Number(job.parts_sales).toLocaleString()})</div>
                          )}
                        </div>

                        {job.services_breakdown && job.services_breakdown.length > 0 && (
                          <div>
                            <span className="font-semibold text-amber-400 block mb-1">Services Breakdown:</span>
                            <ul className="space-y-1 pl-2 border-l-2 border-slate-800">
                              {job.services_breakdown.map((srv, sIdx) => (
                                <li key={sIdx} className="flex justify-between">
                                  <span>{srv.name}</span>
                                  <span className="font-medium text-slate-200">₱{Number(srv.customer_labor).toLocaleString()} (Rec: ₱{srv.recovery_fee})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {job.notes && (
                          <div className="bg-slate-950 p-2 rounded text-slate-400 italic">
                            Notes: {job.notes}
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                          <button
                            onClick={() => openEditModal(job)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={(e) => handleDeleteJob(job.id, e)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg text-xs font-semibold transition"
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
          resetForm();
          setShowAddModal(true);
        }}
        className="fixed bottom-5 right-5 sm:hidden bg-amber-500 text-slate-950 p-3.5 rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-95 transition print:hidden"
      >
        <PlusCircle className="w-7 h-7" />
      </button>

      {/* DIGITAL THERMAL RECEIPT MODAL */}
      {receiptJob && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white text-slate-950 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 print:p-0 print:shadow-none print:w-full">
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
                <div>Keep receipt for service warranty.</div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200 print:hidden font-sans">
              <button
                onClick={() => copyReceiptToClipboard(receiptJob)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                {copiedReceipt ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copiedReceipt ? 'Copied to Clipboard!' : 'Copy for Messenger / SMS'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.print()}
                  className="py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" /> Print Receipt
                </button>
                <button
                  onClick={() => setReceiptJob(null)}
                  className="py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Job Modal */}
      {(showAddModal || editingJob) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-3">
              {editingJob ? 'Edit Log Entry' : 'Log New Job & Calculate'}
            </h3>

            <form onSubmit={handleSaveJob} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={jobDate}
                    onChange={(e) => setJobDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-xs focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Mechanic</label>
                  <input
                    type="text"
                    placeholder="e.g. Dan / Dedel"
                    value={mechanic}
                    onChange={(e) => setMechanic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-xs focus:ring-2 focus:ring-amber-500"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-xs focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Unit / Motorcycle</label>
                  <input
                    type="text"
                    placeholder="e.g. Aerox 155 / Click 125"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Services Section */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Services ({validServices.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddServiceRow}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                  >
                    + Add Another Service
                  </button>
                </div>

                {selectedServices.map((srv, index) => (
                  <div key={index} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                    <div className="flex gap-2 items-center">
                      <select
                        value={srv.is_custom ? '__custom__' : srv.id || ''}
                        onChange={(e) => handlePresetSelect(index, e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-xs focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">-- Select Preset Service --</option>
                        {presetServices.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Labor: ₱{p.customer_labor} | Rec: ₱{p.recovery_fee})
                          </option>
                        ))}
                        <option value="__custom__">⚙️ + Custom Service / Custom Price</option>
                      </select>

                      {selectedServices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveServiceRow(index)}
                          className="text-slate-500 hover:text-red-400 p-2"
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
                          placeholder="Custom service name (e.g. Engine Repaint / FI Cleaning)"
                          value={srv.name}
                          onChange={(e) => handleCustomServiceChange(index, 'name', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-xs"
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
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400">Recovery Fee (₱)</span>
                            <input
                              type="number"
                              value={srv.recovery_fee || ''}
                              placeholder="50"
                              onChange={(e) => handleCustomServiceChange(index, 'recovery_fee', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Parts Section */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">Parts Sold</span>
                  <button
                    type="button"
                    onClick={handleAddPartRow}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                  >
                    + Add Part
                  </button>
                </div>

                {partsList.map((part, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Part item (e.g. Yamalube Oil, Belt)"
                      value={part.name}
                      onChange={(e) => handlePartChange(index, 'name', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-xs"
                    />
                    <input
                      type="number"
                      placeholder="₱ Price"
                      value={part.price || ''}
                      onChange={(e) => handlePartChange(index, 'price', e.target.value)}
                      className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-xs text-right"
                    />
                    {partsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePartRow(index)}
                        className="text-slate-500 hover:text-red-400 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Labor Total:</span>
                  <span className="font-semibold text-white">₱{currentLaborTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Parts Total:</span>
                  <span className="font-semibold text-white">₱{currentPartsTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Total Shop Recovery Cut:</span>
                  <span className="font-semibold text-emerald-400">+₱{currentRecoveryFee.toLocaleString()}</span>
                </div>
                <div className="border-t border-amber-500/20 pt-1.5 flex justify-between items-baseline text-sm font-bold text-amber-400">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowAddModal(false);
                  }}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20"
                >
                  {isSubmitting ? 'Saving...' : editingJob ? 'Update Log' : 'Save & Record Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}