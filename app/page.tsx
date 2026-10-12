'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PlusCircle, LogOut, TrendingUp, DollarSign, Wrench, Trash2, Calendar, User, Bike, Edit, ChevronDown, ChevronUp } from 'lucide-react';
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
    setJobDate(new Date().toISOString().split('T')[0]);

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

  const totalRecovered = jobs.reduce((sum, j) => sum + Number(j.recovery_fee || 0), 0);
  const totalLaborRevenue = jobs.reduce((sum, j) => sum + Number(j.customer_labor || 0), 0);
  const totalPartsRevenue = jobs.reduce((sum, j) => sum + Number(j.parts_sales || 0), 0);
  const remainingTarget = Math.max(0, SHOP_TARGET - totalRecovered);
  const progressPercent = Math.min(100, (totalRecovered / SHOP_TARGET) * 100);

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
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex justify-between items-center">
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

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Target Progress Card */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-amber-500" /> ROI Recovery Progress
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

        {/* Revenue Counters */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Wrench className="w-3.5 h-3.5 text-amber-500" /> Labor Total
            </span>
            <div className="text-xl font-bold">₱{totalLaborRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-blue-400" /> Parts Total
            </span>
            <div className="text-xl font-bold">₱{totalPartsRevenue.toLocaleString()}</div>
          </div>
        </div>

        {/* Log History */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Log History ({jobs.length}) <span className="text-xs font-normal lowercase text-slate-500">(tap log to view items)</span>
            </h2>
          </div>

          {jobs.length === 0 ? (
            <div className="bg-slate-900 border border-dashed border-slate-800 p-8 text-center rounded-xl text-slate-500 text-sm">
              No entries logged yet. Tap "Log New Job" above.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const isExpanded = expandedJobId === job.id;
                return (
                  <div
                    key={job.id}
                    onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl space-y-2 cursor-pointer transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white text-base">{job.customer_name}</div>
                        <div className="text-xs text-amber-400 font-semibold">{job.service_name}</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="text-right">
                          <div className="text-base font-extrabold text-white">₱{Number(job.total_sale).toLocaleString()}</div>
                          <div className="text-xs text-emerald-400 font-medium">+₱{Number(job.recovery_fee)} ROI</div>
                        </div>
                        <div className="text-slate-500 pt-1">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-500" /> {job.job_date || new Date(job.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Bike className="w-3 h-3 text-slate-500" /> {job.unit || 'N/A'}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3 text-slate-500" /> Mech: {job.mechanic || 'N/A'}</span>
                    </div>

                    <div className="flex justify-between text-xs text-slate-400 pt-1 bg-slate-950/40 px-2 py-1 rounded">
                      <span>Labor: ₱{Number(job.customer_labor).toLocaleString()}</span>
                      <span>Parts: ₱{Number(job.parts_sales).toLocaleString()}</span>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(job);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-semibold transition"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit Log
                          </button>
                          <button
                            onClick={(e) => handleDeleteJob(job.id, e)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg text-xs font-semibold transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Log
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
        className="fixed bottom-5 right-5 sm:hidden bg-amber-500 text-slate-950 p-3.5 rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-95 transition"
      >
        <PlusCircle className="w-7 h-7" />
      </button>

      {/* Create / Edit Job Modal */}
      {(showAddModal || editingJob) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-3">
              {editingJob ? 'Edit Log Entry' : 'Log New Job & Calculate'}
            </h3>

            <form onSubmit={handleSaveJob} className="space-y-4">
              {/* Date & Mechanic */}
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
                    placeholder="e.g. Kuya Dan / Weweng"
                    value={mechanic}
                    onChange={(e) => setMechanic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Customer Name & Unit */}
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

              {/* Multiple Services Section */}
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

              {/* Multiple Parts Section */}
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

              {/* Calculator Summary */}
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

              {/* Notes */}
              <div>
                <input
                  type="text"
                  placeholder="Notes (e.g. Paid via GCash / Cash)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-xs"
                />
              </div>

              {/* Actions */}
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