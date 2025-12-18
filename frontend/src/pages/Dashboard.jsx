import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  Filter,
  IndianRupee,
  PieChart,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  ComposedChart,
} from 'recharts';
import { format, isSameMonth, subMonths } from 'date-fns';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import AdvancedFilter, { ADVANCED_FILTER_DEFAULTS } from '../components/common/AdvancedFilter';
import { getExpenseStats, getExpenses, exportExpenses } from '../services/expenseService';
import { downloadFile, formatCurrency, formatDate, getRoleName } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

const statusStyles = {
  Active: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  Pending: 'bg-amber-50 text-amber-700 border border-amber-100',
  Declined: 'bg-rose-50 text-rose-700 border border-rose-100',
  default: 'bg-slate-50 text-slate-700 border border-slate-200',
};

const chartColors = ['#5b21ff', '#0ea5e9', '#10b981', '#f97316', '#f43f5e', '#06b6d4', '#8b5cf6', '#22c55e', '#0ea5e9'];

const toggleButtonClass = (active) =>
  `px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
    active
      ? 'bg-slate-900 text-white shadow shadow-slate-300 border border-slate-900'
      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
  }`;

const formatCompactNumber = (value = 0) =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const formatCompactCurrency = (value = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const getSafeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const EmptyChartState = ({ message }) => (
  <div className="flex h-full flex-col items-center justify-center text-sm text-slate-500">
    <Activity size={20} className="mb-2 text-slate-400" />
    {message}
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const filterRef = useRef(null);
  const createDefaultFilters = useCallback(() => ({ ...ADVANCED_FILTER_DEFAULTS }), []);
  const [stats, setStats] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(createDefaultFilters);
  const [exportLimit, setExportLimit] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pieGrouping, setPieGrouping] = useState('businessUnit');
  const [serviceMetric, setServiceMetric] = useState('expense');
  const [serviceView, setServiceView] = useState('total');
  const [recurringMetric, setRecurringMetric] = useState('count');
  const [costMetric, setCostMetric] = useState('expense');
  const [sharedOnly, setSharedOnly] = useState(false);
  const [sharedChartType, setSharedChartType] = useState('bar'); // 'bar' | 'pie'
  const [sharedMetric, setSharedMetric] = useState('expense'); // 'expense' | 'count'
  const itemsPerPage = 8;

  const loadInitialDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [statsResponse, expenseResponse] = await Promise.all([
        getExpenseStats(),
        getExpenses({ ...createDefaultFilters(), search: '' }),
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (expenseResponse.success) {
        setExpenses(expenseResponse.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [createDefaultFilters]);

  useEffect(() => {
    loadInitialDashboard();
  }, [loadInitialDashboard]);

  const fetchExpenses = async (customFilters = filters, customSearchTerm = searchTerm) => {
    try {
      setLoading(true);
      const response = await getExpenses({
        ...customFilters,
        ...(sharedOnly ? { isShared: 'true' } : {}),
        search: customSearchTerm,
      });
      if (response.success) {
        setExpenses(response.data);
      }
    } catch (error) {
      console.error('Failed to load expenses', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchExpenses(filters, searchTerm);
  };

  const handleApplyFilters = (newFilters) => {
    const mergedFilters = { ...createDefaultFilters(), ...newFilters };
    if (mergedFilters.sharedOnly === 'true') {
      setSharedOnly(true);
    } else {
      setSharedOnly(false);
    }
    setFilters(mergedFilters);
    setCurrentPage(1);
    fetchExpenses(mergedFilters, searchTerm);
  };

  const handleClearFilters = () => {
    const resetFilters = createDefaultFilters();
    setFilters(resetFilters);
    setSharedOnly(false);
    setSearchTerm('');
    setExportLimit('');
    setCurrentPage(1);
    fetchExpenses(resetFilters, '');
  };

  const handleExport = async () => {
    try {
      const exportFilters = { ...filters, search: searchTerm };
      if (sharedOnly) {
        exportFilters.isShared = 'true';
      }
      if (exportLimit) {
        exportFilters.limit = exportLimit;
      }
      const blob = await exportExpenses(exportFilters);
      downloadFile(blob, `expenses-${Date.now()}.xlsx`);
      toast.success('Expenses exported successfully');
    } catch (error) {
      console.error('Failed to export expenses', error);
      toast.error('Failed to export expenses');
    }
  };

  const enhancedExpenses = useMemo(
    () =>
      expenses.map((expense) => {
        const amountValue = Number(expense.amountInINR ?? expense.amount ?? 0);
        const dateObj = getSafeDate(expense.date);
        const monthLabel = dateObj ? format(dateObj, 'MMM-yyyy') : expense.month || 'Unknown';

        return {
          ...expense,
          amountValue,
          amountBase: Number(expense.amount) || 0,
          dateObj,
          monthLabel,
          recurringType: expense.recurring || 'One-time',
          statusLabel: expense.status || 'Unknown',
          businessUnitLabel: expense.businessUnit || 'Not tagged',
          serviceLabel: expense.typeOfService || 'Other',
          costCenterLabel: expense.costCenter || 'Not tagged',
        };
      }),
    [expenses]
  );

  const buildAggregatedMetrics = (list, keySelector) => {
    const map = {};

    list.forEach((exp) => {
      const key = keySelector(exp);
      if (!map[key]) {
        map[key] = {
          totalExpense: 0,
          count: 0,
          activeExpense: 0,
          deactiveExpense: 0,
          activeCount: 0,
          deactiveCount: 0,
        };
      }

      map[key].totalExpense += exp.amountValue;
      map[key].count += 1;

      if (exp.statusLabel === 'Active') {
        map[key].activeExpense += exp.amountValue;
        map[key].activeCount += 1;
      }
      if (exp.statusLabel === 'Deactive') {
        map[key].deactiveExpense += exp.amountValue;
        map[key].deactiveCount += 1;
      }
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        ...data,
        totalExpense: Number(data.totalExpense.toFixed(2)),
        activeExpense: Number(data.activeExpense.toFixed(2)),
        deactiveExpense: Number(data.deactiveExpense.toFixed(2)),
      }))
      .sort((a, b) => b.totalExpense - a.totalExpense);
  };

  const pieData = useMemo(() => {
    const selector =
      pieGrouping === 'service'
        ? (exp) => exp.serviceLabel
        : pieGrouping === 'status'
          ? (exp) => exp.statusLabel
          : (exp) => exp.businessUnitLabel;

    return buildAggregatedMetrics(enhancedExpenses, selector).map(({ name, totalExpense }) => ({
      name,
      value: totalExpense,
    }));
  }, [enhancedExpenses, pieGrouping]);

  const serviceAgg = useMemo(
    () => buildAggregatedMetrics(enhancedExpenses, (exp) => exp.serviceLabel),
    [enhancedExpenses]
  );

  const serviceChartData = useMemo(
    () =>
      serviceAgg.map((item) => ({
        name: item.name,
        total: serviceMetric === 'expense' ? item.totalExpense : item.count,
        active: serviceMetric === 'expense' ? item.activeExpense : item.activeCount,
        deactive: serviceMetric === 'expense' ? item.deactiveExpense : item.deactiveCount,
      })),
    [serviceAgg, serviceMetric]
  );

  const recurringData = useMemo(() => {
    const base = {
      'One-time': { count: 0, expense: 0 },
      Monthly: { count: 0, expense: 0 },
      Yearly: { count: 0, expense: 0 },
    };

    enhancedExpenses.forEach((exp) => {
      const key = base[exp.recurringType] ? exp.recurringType : 'One-time';
      base[key].count += 1;
      base[key].expense += exp.amountValue;
    });

    return Object.entries(base).map(([name, data]) => ({
      name,
      count: data.count,
      expense: Number(data.expense.toFixed(2)),
      value: recurringMetric === 'expense' ? Number(data.expense.toFixed(2)) : data.count,
    }));
  }, [enhancedExpenses, recurringMetric]);

  const trendData = useMemo(() => {
    const map = {};

    enhancedExpenses.forEach((exp) => {
      const key = exp.monthLabel;
      const sortKey = exp.dateObj ? Number(format(exp.dateObj, 'yyyyMM')) : 99999999;

      if (!map[key]) {
        map[key] = { totalExpense: 0, count: 0, sortKey };
      }

      map[key].totalExpense += exp.amountValue;
      map[key].count += 1;
      map[key].sortKey = Math.min(map[key].sortKey, sortKey);
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        expense: Number(data.totalExpense.toFixed(2)),
        count: data.count,
        sortKey: data.sortKey,
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [enhancedExpenses]);

  const costCenterAgg = useMemo(
    () => buildAggregatedMetrics(enhancedExpenses, (exp) => exp.costCenterLabel),
    [enhancedExpenses]
  );

  const costCenterChartData = useMemo(
    () =>
      costCenterAgg.map((item) => ({
        name: item.name,
        value:
          costMetric === 'active'
            ? item.activeCount
            : costMetric === 'deactive'
              ? item.deactiveCount
              : item.totalExpense,
      })),
    [costCenterAgg, costMetric]
  );

  const sharedAllocationsAgg = useMemo(() => {
    const map = {};
    enhancedExpenses.forEach((exp) => {
      if (!exp.isShared || !exp.sharedAllocations || exp.sharedAllocations.length === 0) return;
      exp.sharedAllocations.forEach((alloc) => {
        if (!alloc.businessUnit) return;
        const baseAmount = Number(alloc.amount) || 0;
        if (baseAmount <= 0) return;
        const ratio = exp.amountBase > 0 ? baseAmount / exp.amountBase : 0;
        const allocInInr = ratio > 0 ? exp.amountValue * ratio : 0;
        if (!map[alloc.businessUnit]) {
          map[alloc.businessUnit] = { name: alloc.businessUnit, totalExpense: 0, count: 0 };
        }
        map[alloc.businessUnit].totalExpense += allocInInr;
        map[alloc.businessUnit].count += 1;
      });
    });
    return Object.values(map)
      .map((item) => ({ ...item, totalExpense: Number(item.totalExpense.toFixed(2)) }))
      .sort((a, b) => b.totalExpense - a.totalExpense);
  }, [enhancedExpenses]);

  const sharedStats = useMemo(() => {
    const sharedList = enhancedExpenses.filter((e) => e.isShared);
    const sharedAmount = sharedList.reduce((sum, e) => sum + e.amountValue, 0);
    const now = new Date();
    const sharedThisMonth = sharedList.filter((e) => e.dateObj && isSameMonth(e.dateObj, now));
    const sharedThisMonthAmount = sharedThisMonth.reduce((sum, e) => sum + e.amountValue, 0);
    return {
      count: sharedList.length,
      amount: sharedAmount,
      monthCount: sharedThisMonth.length,
      monthAmount: sharedThisMonthAmount,
    };
  }, [enhancedExpenses]);

  const visibleExpenses = enhancedExpenses;
  const paginatedExpenses = visibleExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(visibleExpenses.length / itemsPerPage));
  const startRow = visibleExpenses.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRow = visibleExpenses.length === 0 ? 0 : Math.min(currentPage * itemsPerPage, visibleExpenses.length);
  const activeFilterCount = Object.values(filters).filter((value) => value !== '' && value !== null && value !== undefined).length;
  const canFilterBusinessUnit = ['mis_manager', 'super_admin'].includes(user?.role);
  const canSeeDuplicateControls = user?.role === 'mis_manager';

  const totals = {
    totalExpenses: enhancedExpenses.reduce((sum, exp) => sum + exp.amountValue, 0),
    expenseCount: enhancedExpenses.length,
  };

  const now = new Date();
  const currentMonthKey = format(now, 'MMM-yyyy');
  const previousMonthKey = format(subMonths(now, 1), 'MMM-yyyy');
  const trendLookup = Object.fromEntries(trendData.map((item) => [item.name, item]));
  const currentMonthExpense = trendLookup[currentMonthKey]?.expense || 0;
  const previousMonthExpense = trendLookup[previousMonthKey]?.expense || 0;
  const currentMonthCount = trendLookup[currentMonthKey]?.count || 0;
  const previousMonthCount = trendLookup[previousMonthKey]?.count || 0;

  const monthExpenseDeltaPct =
    previousMonthExpense === 0 ? null : (((currentMonthExpense - previousMonthExpense) / previousMonthExpense) * 100).toFixed(1);
  const monthCountDelta = currentMonthCount - previousMonthCount;

  const newActiveThisMonth = enhancedExpenses.filter(
    (exp) => exp.statusLabel === 'Active' && exp.dateObj && isSameMonth(exp.dateObj, now)
  ).length;
  const deactiveThisMonth = enhancedExpenses.filter(
    (exp) => exp.statusLabel === 'Deactive' && exp.dateObj && isSameMonth(exp.dateObj, now)
  ).length;

  const summaryCards = [
    {
      title: 'Total Expenses',
      value: formatCurrency(totals.totalExpenses),
      helper:
        monthExpenseDeltaPct === null
          ? 'vs prev month: n/a'
          : `vs prev month: ${monthExpenseDeltaPct > 0 ? '+' : ''}${monthExpenseDeltaPct}%`,
      icon: IndianRupee,
      tone: 'text-indigo-700 bg-indigo-50',
    },
    {
      title: 'Expense Count',
      value: totals.expenseCount,
      helper: `vs prev month: ${monthCountDelta > 0 ? '+' : ''}${monthCountDelta}`,
      icon: BarChart3,
      tone: 'text-emerald-700 bg-emerald-50',
    },
    {
      title: 'New Active Tools',
      value: newActiveThisMonth,
      helper: 'Activated this month',
      icon: CheckCircle2,
      tone: 'text-amber-700 bg-amber-50',
    },
    {
      title: 'Deactive Tools',
      value: deactiveThisMonth,
      helper: 'Deactivated this month',
      icon: Building2,
      tone: 'text-slate-700 bg-slate-50',
    },
    {
      title: 'Shared Expense',
      value: formatCurrency(sharedStats.amount),
      helper: `${sharedStats.count} shared entries · ${formatCurrency(sharedStats.monthAmount)} this month`,
      icon: PieChart,
      tone: 'text-indigo-700 bg-indigo-50',
    },
  ];

  const canAddEntry = ['mis_manager', 'super_admin', 'spoc', 'business_unit_admin'].includes(user?.role);
  const canBulkUpload = ['mis_manager', 'super_admin'].includes(user?.role);
  const canExport = ['mis_manager', 'super_admin', 'business_unit_admin', 'spoc', 'service_handler'].includes(user?.role);

  const systemTotals = {
    totalExpenses: stats?.overall?.totalExpenses || 0,
    totalEntries: stats?.overall?.totalEntries || 0,
  };

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  return (
    <Layout>
      <AdvancedFilter
        ref={filterRef}
        hideTrigger
        appliedFilters={filters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        showBusinessUnit={canFilterBusinessUnit}
        showDuplicateStatusFilter={canSeeDuplicateControls}
      />
      <div className="space-y-6">
        <div className="rounded-3xl bg-white/95 border border-slate-100 shadow-[0_16px_40px_rgba(15,23,42,0.08)] px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Dashboard</p>
            <h1 className="text-3xl font-semibold text-slate-900">{getRoleName(user?.role)} Dashboard</h1>
            <p className="text-sm text-slate-500">
              Analytics-first view of the global expense sheet. Filters, exports, and KPIs update in lockstep with your selections.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => filterRef.current?.open()} className="relative">
              <Filter size={16} />
              Hyper Filter
              {activeFilterCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-primary-600 text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {canExport && (
              <Button variant="secondary" onClick={handleExport}>
                <Download size={16} />
                Export Sheet
              </Button>
            )}
            {canAddEntry && (
              <Button onClick={() => navigate('/add-expense')}>
                <Plus size={16} />
                Add New Entry
              </Button>
            )}
            {canBulkUpload && (
              <Button variant="secondary" onClick={() => navigate('/bulk-upload')}>
                <Upload size={16} />
                Bulk Add
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const { title, value, helper, icon: IconComponent, tone } = card;
            return (
              <div key={title} className="rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500">{helper}</p>
                  </div>
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                    <IconComponent size={18} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <Card
          title="Analytics Controls"
          subtitle="Filters, search, and exports drive every KPI and chart below. Use the hyper filter for precision."
          className="shadow-[0_16px_40px_rgba(15,23,42,0.08)] border border-slate-100"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <div className="flex w-full md:w-96 items-center rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
              <Search size={16} className="text-slate-400 mr-2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Search by Card No, Date, Service, Business Unit..."
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSearch}>
                <Search size={16} />
                Apply search
              </Button>
              <Button variant="secondary" onClick={handleClearFilters}>
                Clear
              </Button>
              <Button variant="outline" onClick={() => filterRef.current?.open()} className="relative">
                <Filter size={16} />
                Advanced Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-primary-600 text-white rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              {canExport && (
                <Button variant="secondary" onClick={handleExport}>
                  <Download size={16} />
                  Export sheet
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
              <span>Rows to export</span>
              <input
                type="number"
                min="1"
                className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                placeholder="All"
                value={exportLimit}
                onChange={(e) => setExportLimit(e.target.value)}
              />
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
              <input
                type="checkbox"
                checked={sharedOnly}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSharedOnly(checked);
                  const nextFilters = { ...filters, sharedOnly: checked ? 'true' : '' };
                  setFilters(nextFilters);
                  fetchExpenses(nextFilters, searchTerm);
                }}
              />
              <span>Shared only</span>
            </label>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              <PieChart size={14} />
              System total: {formatCompactCurrency(systemTotals.totalExpenses)} · {formatCompactNumber(systemTotals.totalEntries)} entries
            </span>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card
            title="Expense Composition"
            subtitle="Share of spend from the filtered global sheet"
            headerAction={
              <div className="flex items-center gap-2">
                <button className={toggleButtonClass(pieGrouping === 'businessUnit')} onClick={() => setPieGrouping('businessUnit')}>
                  Business Unit
                </button>
                <button className={toggleButtonClass(pieGrouping === 'service')} onClick={() => setPieGrouping('service')}>
                  Service
                </button>
                <button className={toggleButtonClass(pieGrouping === 'status')} onClick={() => setPieGrouping('status')}>
                  Status
                </button>
              </div>
            }
          >
            <div className="h-80">
              {pieData.length === 0 ? (
                <EmptyChartState message="No data available for the selected filters." />
              ) : (
                <ResponsiveContainer>
                  <RePieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`slice-${entry.name}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card
            title="Service Type Mix"
            subtitle="Track expense or count by service with active vs deactive breakdown"
            headerAction={
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Metric</span>
                  <button className={toggleButtonClass(serviceMetric === 'expense')} onClick={() => setServiceMetric('expense')}>
                    Expense
                  </button>
                  <button className={toggleButtonClass(serviceMetric === 'count')} onClick={() => setServiceMetric('count')}>
                    Count
                  </button>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">View</span>
                  <button className={toggleButtonClass(serviceView === 'total')} onClick={() => setServiceView('total')}>
                    Total
                  </button>
                  <button className={toggleButtonClass(serviceView === 'stacked')} onClick={() => setServiceView('stacked')}>
                    Stacked
                  </button>
                </div>
              </div>
            }
          >
            <div className="h-80">
              {serviceChartData.length === 0 ? (
                <EmptyChartState message="No services match the current filters." />
              ) : (
                <ResponsiveContainer>
                  <BarChart data={serviceChartData} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} height={60} interval={0} angle={-20} textAnchor="end" />
                    <YAxis tickFormatter={serviceMetric === 'expense' ? formatCompactCurrency : formatCompactNumber} />
                    <Tooltip
                      formatter={(value) => (serviceMetric === 'expense' ? formatCurrency(value) : `${value} entries`)}
                      cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                    />
                    <Legend />
                    {serviceView === 'total' ? (
                      <Bar dataKey="total" fill={chartColors[0]} radius={[10, 10, 0, 0]} />
                    ) : (
                      <>
                        <Bar dataKey="active" stackId="status" fill={chartColors[2]} radius={[10, 10, 0, 0]} />
                        <Bar dataKey="deactive" stackId="status" fill={chartColors[4]} radius={[10, 10, 0, 0]} />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card
            title="Recurring Mix"
            subtitle="One-time vs Monthly vs Yearly distribution"
            headerAction={
              <div className="flex items-center gap-2">
                <button className={toggleButtonClass(recurringMetric === 'count')} onClick={() => setRecurringMetric('count')}>
                  Count
                </button>
                <button className={toggleButtonClass(recurringMetric === 'expense')} onClick={() => setRecurringMetric('expense')}>
                  Expense
                </button>
              </div>
            }
          >
            <div className="h-56">
              {recurringData.length === 0 ? (
                <EmptyChartState message="No recurring data available." />
              ) : (
                <ResponsiveContainer>
                  <BarChart data={recurringData} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={recurringMetric === 'expense' ? formatCompactCurrency : formatCompactNumber} />
                    <Tooltip
                      formatter={(value) => (recurringMetric === 'expense' ? formatCurrency(value) : `${value} entries`)}
                      cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                    />
                    <Bar dataKey="value" fill={chartColors[1]} radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card
            title="Expense Trend"
            subtitle="Month-over-month total with entry count overlay"
            className="xl:col-span-2"
          >
            <div className="h-96">
              {trendData.length === 0 ? (
                <EmptyChartState message="No trend data yet. Try broadening the filter range." />
              ) : (
                <ResponsiveContainer>
                  <ComposedChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={formatCompactCurrency}
                      label={{ value: 'Expense', angle: -90, position: 'insideLeft', offset: 10 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={formatCompactNumber}
                      label={{ value: 'Count', angle: 90, position: 'insideRight', offset: 0 }}
                    />
                    <Tooltip
                      formatter={(value, name) =>
                        name === 'count' ? [`${value} entries`, 'Entries'] : [formatCurrency(value), 'Expense']
                      }
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="expense" fill={chartColors[0]} radius={[10, 10, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="count" stroke={chartColors[3]} strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card
            title="Shared Split"
            subtitle="Allocation by business unit across shared expenses (filtered)"
            className="shadow-[0_16px_40px_rgba(15,23,42,0.08)] border border-slate-100"
            headerAction={
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-700">
                  {sharedStats.count} shared entr{sharedStats.count === 1 ? 'y' : 'ies'} · {formatCompactCurrency(sharedStats.amount)}
                </div>
                <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Metric</span>
                  <button className={toggleButtonClass(sharedMetric === 'expense')} onClick={() => setSharedMetric('expense')}>
                    Expense
                  </button>
                  <button className={toggleButtonClass(sharedMetric === 'count')} onClick={() => setSharedMetric('count')}>
                    Count
                  </button>
                </div>
                <button className={toggleButtonClass(sharedChartType === 'bar')} onClick={() => setSharedChartType('bar')}>
                  Bar
                </button>
                <button className={toggleButtonClass(sharedChartType === 'pie')} onClick={() => setSharedChartType('pie')}>
                  Pie
                </button>
              </div>
            }
        >
            <div className="h-96">
              {sharedAllocationsAgg.length === 0 ? (
                <EmptyChartState message="No shared expenses in this view." />
              ) : sharedChartType === 'bar' ? (
                <ResponsiveContainer>
                  <BarChart data={sharedAllocationsAgg} margin={{ left: -5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={sharedMetric === 'expense' ? formatCompactCurrency : formatCompactNumber} />
                    <Tooltip
                      formatter={(value) =>
                        sharedMetric === 'expense' ? formatCurrency(value) : `${value} shared allocations`
                      }
                      labelFormatter={(label) => `BU: ${label}`}
                    />
                    <Bar
                      dataKey={sharedMetric === 'expense' ? 'totalExpense' : 'count'}
                      fill={chartColors[6]}
                      radius={[10, 10, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer>
                  <RePieChart>
                    <Pie
                      data={sharedAllocationsAgg}
                      dataKey={sharedMetric === 'expense' ? 'totalExpense' : 'count'}
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {sharedAllocationsAgg.map((entry, index) => (
                        <Cell key={`shared-slice-${entry.name}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        sharedMetric === 'expense' ? formatCurrency(value) : `${value} shared allocations`
                      }
                    />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card
            title="Cost Center Performance"
            subtitle="Switch metrics to see spend vs activation health"
            headerAction={
              <div className="flex items-center gap-2">
                <button className={toggleButtonClass(costMetric === 'expense')} onClick={() => setCostMetric('expense')}>
                  Total Expense
                </button>
                <button className={toggleButtonClass(costMetric === 'active')} onClick={() => setCostMetric('active')}>
                  Active Tools
                </button>
                <button className={toggleButtonClass(costMetric === 'deactive')} onClick={() => setCostMetric('deactive')}>
                  Deactive Tools
                </button>
              </div>
            }
          >
            <div className="h-64">
              {costCenterChartData.length === 0 ? (
                <EmptyChartState message="No cost center signals for these filters." />
              ) : (
                <ResponsiveContainer>
                  <BarChart data={costCenterChartData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tickFormatter={costMetric === 'expense' ? formatCompactCurrency : formatCompactNumber} />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip
                      formatter={(value) =>
                        costMetric === 'expense' ? formatCurrency(value) : `${value} ${value === 1 ? 'tool' : 'tools'}`
                      }
                    />
                    <Bar dataKey="value" fill={chartColors[5]} radius={[0, 10, 10, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        <Card
          title="Filtered Detail Slice"
          subtitle="Lean view of the filtered global sheet (drill down without exposing the full sheet)"
          className="shadow-[0_16px_40px_rgba(15,23,42,0.08)] border border-slate-100"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">Card No</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">Card Assigned To</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">Month</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">Particulars</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">Cost Center</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">Amount ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                      No expense entries found for these filters.
                    </td>
                  </tr>
                ) : (
                  paginatedExpenses.map((expense) => (
                    <tr key={expense._id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-900 font-semibold">{expense.cardNumber || '-'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        <div className="font-medium">{expense.cardAssignedTo || '-'}</div>
                        <div className="text-xs text-slate-500">Handler: {expense.serviceHandler || 'N/A'}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(expense.date)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{expense.monthLabel || '-'}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[expense.status] || statusStyles.default}`}>
                          {expense.status || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        <div className="font-semibold">{expense.particulars || '-'}</div>
                        <div className="text-xs text-slate-500">{expense.typeOfService || '-'}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{expense.costCenter || '-'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-900 font-semibold">
                        {expense.amountValue ? formatCurrency(expense.amountValue) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <span>
              Showing {startRow} to {endRow} of {visibleExpenses.length} entries
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
              <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
