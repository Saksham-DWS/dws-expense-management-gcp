import { useState, useEffect } from 'react';
import { Search, Filter, Download, Upload, CheckCircle2, ListChecks } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import ExpenseTable from '../components/dashboard/ExpenseTable';
import Modal from '../components/common/Modal';
import AdvancedFilter, { ADVANCED_FILTER_DEFAULTS } from '../components/common/AdvancedFilter';
import { getExpenses, exportExpenses, deleteExpense, updateExpense } from '../services/expenseService';
import { useAuth } from '../context/AuthContext';
import {
  STATUS_OPTIONS,
  TYPES_OF_EXPENSE,
  COST_CENTERS,
  APPROVED_BY,
  RECURRING_OPTIONS,
  CURRENCIES,
} from '../utils/constants';
import { downloadFile } from '../utils/formatters';
import toast from 'react-hot-toast';
import { getMonthYear } from '../utils/formatters';

const Expenses = () => {
  const { user } = useAuth();
  const canSeeDuplicateControls = user?.role === 'mis_manager';
  const canFilterBusinessUnit = ['mis_manager', 'super_admin'].includes(user?.role);
  const canEditCardAssignedTo = user?.role === 'mis_manager';
  const createDefaultFilters = () => ({ ...ADVANCED_FILTER_DEFAULTS });
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(createDefaultFilters);
  const [showDuplicateStatus, setShowDuplicateStatus] = useState(canSeeDuplicateControls);
  const [duplicateExportMode, setDuplicateExportMode] = useState('all');
  const [exportLimit, setExportLimit] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const mergedCount = expenses.filter((e) => e.duplicateStatus === 'Merged').length;
  const uniqueCount = expenses.filter((e) => e.duplicateStatus === 'Unique').length;
  const duplicateHelp =
    'Merged = exact duplicate entries detected against existing records. Unique = entries that do not match any existing record.';
  const totalEntries = expenses.length;
  const activeServices = expenses.filter((e) => e.status === 'Active').length;

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    setShowDuplicateStatus(canSeeDuplicateControls);
  }, [user]);

  const fetchExpenses = async (customFilters = filters, customSearchTerm = searchTerm) => {
    try {
      setLoading(true);
      const payload = {
        ...customFilters,
        search: customSearchTerm,
      };
      if (customFilters.sharedOnly === 'true') {
        payload.isShared = 'true';
      }
      const response = await getExpenses(payload);
      if (response.success) {
        setExpenses(response.data);
        setCurrentPage(1);
      }
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchExpenses(filters, searchTerm);
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleClearFilters = () => {
    const clearedFilters = createDefaultFilters();
    setFilters(clearedFilters);
    setSearchTerm('');
    setCurrentPage(1);
    fetchExpenses(clearedFilters, '');
  };

  const handleExport = async () => {
    try {
      const exportFilters = { ...filters, search: searchTerm };
      if (filters.sharedOnly === 'true') {
        exportFilters.isShared = 'true';
      }
      if (canSeeDuplicateControls) {
        if (duplicateExportMode === 'merged') {
          exportFilters.duplicateStatus = 'Merged';
        } else if (duplicateExportMode === 'unique') {
          exportFilters.duplicateStatus = 'Unique';
        } else if (!filters.duplicateStatus) {
          delete exportFilters.duplicateStatus;
        }
      } else {
        delete exportFilters.duplicateStatus;
      }

      if (exportLimit) {
        exportFilters.limit = exportLimit;
      }

      const blob = await exportExpenses({
        ...exportFilters,
        includeDuplicateStatus: showDuplicateStatus && canSeeDuplicateControls ? 'true' : 'false',
      });
      downloadFile(blob, `expenses-${Date.now()}.xlsx`);
      toast.success('Expenses exported successfully');
    } catch (error) {
      toast.error('Failed to export expenses');
    }
  };

  const handleEdit = (expense) => {
    setSelectedExpense({
      ...expense,
      date: expense.date ? expense.date.substring(0, 10) : '',
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense entry?')) {
      try {
        await deleteExpense(id);
        toast.success('Expense deleted successfully');
        fetchExpenses();
      } catch (error) {
        toast.error('Failed to delete expense');
      }
    }
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        status: selectedExpense.status,
        amount: selectedExpense.amount,
        date: selectedExpense.date,
        month: selectedExpense.month,
        cardAssignedTo: selectedExpense.cardAssignedTo,
        particulars: selectedExpense.particulars,
        narration: selectedExpense.narration,
        currency: selectedExpense.currency,
        billStatus: selectedExpense.billStatus,
        typeOfService: selectedExpense.typeOfService,
        costCenter: selectedExpense.costCenter,
        approvedBy: selectedExpense.approvedBy,
        serviceHandler: selectedExpense.serviceHandler,
        recurring: selectedExpense.recurring,
      };

      await updateExpense(selectedExpense._id, payload);
      toast.success('Expense updated successfully');
      setShowEditModal(false);
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to update expense');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="brand-gradient rounded-3xl px-6 py-8 text-white shadow-lg flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/80">Global Expense Sheet</p>
            <h1 className="mt-2 text-3xl font-semibold">
              {user?.role === 'service_handler' ? 'My Services Ledger' : 'Expense Intelligence Grid'}
            </h1>
            <p className="text-white/80 text-sm max-w-2xl">
              Filter, audit and export every swipe across business units with smart duplicate detection and MIS-grade controls.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleExport}>
              <Download size={18} className="mr-2" />
              Export view
            </Button>
            {['mis_manager', 'super_admin'].includes(user?.role) && (
              <Button onClick={() => (window.location.href = '/bulk-upload')}>
                <Upload size={18} className="mr-2" />
                Bulk upload
              </Button>
            )}
          </div>
        </div>

        {/* Sheet Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Total Entries</p>
              <p className="text-2xl font-semibold text-slate-900">{totalEntries}</p>
              <p className="text-sm text-slate-500">Currently loaded</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ListChecks size={18} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Active Services</p>
              <p className="text-2xl font-semibold text-slate-900">{activeServices}</p>
              <p className="text-sm text-slate-500">Across entries</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                className="flex-1"
                placeholder="Search by card number, service, handler..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                icon={<Search size={16} />}
              />
              <div className="flex gap-3">
                <Button onClick={handleSearch}>
                  <Search size={18} className="mr-2" />
                  Apply search
                </Button>
                <Button variant="secondary" onClick={handleClearFilters}>
                  Clear
                </Button>
                <AdvancedFilter
                  appliedFilters={filters}
                  onApplyFilters={(newFilters) => {
                    const updatedFilters = { ...createDefaultFilters(), ...newFilters };
                    setFilters(updatedFilters);
                    fetchExpenses(updatedFilters, searchTerm);
                  }}
                  onClearFilters={() => {
                    const cleared = createDefaultFilters();
                    setFilters(cleared);
                    fetchExpenses(cleared, '');
                    setSearchTerm('');
                  }}
                  showBusinessUnit={canFilterBusinessUnit}
                  showDuplicateStatusFilter={canSeeDuplicateControls}
                />
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
              {canSeeDuplicateControls && (
                <>
                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={showDuplicateStatus}
                      onChange={(e) => setShowDuplicateStatus(e.target.checked)}
                      className="h-4 w-4 text-primary-600 rounded"
                    />
                    <span>Show duplicate column</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Export</span>
                    <div className="flex rounded-full border border-slate-200 bg-white/80 p-1">
                      {['all', 'merged', 'unique'].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setDuplicateExportMode(mode)}
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            duplicateExportMode === mode ? 'bg-primary-600 text-white' : 'text-slate-500'
                          }`}
                        >
                          {mode === 'merged'
                            ? `merged (${mergedCount})`
                            : mode === 'unique'
                            ? `unique (${uniqueCount})`
                            : 'all'}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        className="text-xs text-slate-500 underline decoration-dotted underline-offset-4"
                        aria-label="Duplicate help"
                        onMouseEnter={(e) => {
                          const tooltip = e.currentTarget.querySelector('.dup-tooltip');
                          if (tooltip) tooltip.style.display = 'block';
                        }}
                        onMouseLeave={(e) => {
                          const tooltip = e.currentTarget.querySelector('.dup-tooltip');
                          if (tooltip) tooltip.style.display = 'none';
                        }}
                      >
                        what’s this?
                        <span className="dup-tooltip hidden absolute z-20 left-0 mt-2 w-72 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-lg">
                          {duplicateHelp}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </Card>

        {/* Expense Table */}
        <Card>
          <ExpenseTable
            expenses={expenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
            showDuplicateColumn={canSeeDuplicateControls && showDuplicateStatus}
          />

          {!loading && expenses.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-700 md:flex-row md:items-center md:justify-between">
              <span>
                Showing{' '}
                {expenses.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, expenses.length)} of {expenses.length} entries
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
                  Page {currentPage} of {Math.max(1, Math.ceil(expenses.length / itemsPerPage))}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage >= Math.ceil(expenses.length / itemsPerPage)}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, Math.max(1, Math.ceil(expenses.length / itemsPerPage))))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Edit Modal */}
        {showEditModal && selectedExpense && (
          <Modal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            title="Edit Expense Entry"
            size="xl"
          >
            <form onSubmit={handleUpdateExpense} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Card Number" value={selectedExpense.cardNumber} disabled />
                <Input label="Business Unit" value={selectedExpense.businessUnit} disabled />
                <Input
                  label="Card Assigned To"
                  name="cardAssignedTo"
                  value={selectedExpense.cardAssignedTo}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, cardAssignedTo: e.target.value })}
                  disabled={!canEditCardAssignedTo}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Date"
                  type="date"
                  name="date"
                  value={selectedExpense.date || ''}
                  onChange={(e) =>
                    setSelectedExpense((prev) => ({
                      ...prev,
                      date: e.target.value,
                      month: getMonthYear(e.target.value),
                    }))
                  }
                  required
                />
                <Input label="Month" value={selectedExpense.month} disabled />
                <Select
                  label="Status"
                  name="status"
                  value={selectedExpense.status}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, status: e.target.value })}
                  options={STATUS_OPTIONS}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Particulars"
                  name="particulars"
                  value={selectedExpense.particulars}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, particulars: e.target.value })}
                  required
                />
                <Input
                  label="Narration"
                  name="narration"
                  value={selectedExpense.narration}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, narration: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Currency"
                  name="currency"
                  value={selectedExpense.currency}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, currency: e.target.value })}
                  options={CURRENCIES}
                  required
                />
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  value={selectedExpense.amount}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, amount: e.target.value })}
                  required
                />
                <Input
                  label="Bill Status"
                  name="billStatus"
                  value={selectedExpense.billStatus}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, billStatus: e.target.value })}
                  placeholder="e.g., Current"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Type of Service"
                  name="typeOfService"
                  value={selectedExpense.typeOfService}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, typeOfService: e.target.value })}
                  options={TYPES_OF_EXPENSE}
                  required
                />
                <Select
                  label="Cost Center"
                  name="costCenter"
                  value={selectedExpense.costCenter}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, costCenter: e.target.value })}
                  options={COST_CENTERS}
                  required
                />
                <Select
                  label="Approved By"
                  name="approvedBy"
                  value={selectedExpense.approvedBy}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, approvedBy: e.target.value })}
                  options={APPROVED_BY}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Service Handler"
                  name="serviceHandler"
                  value={selectedExpense.serviceHandler}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, serviceHandler: e.target.value })}
                  required
                />
                <Select
                  label="Recurring"
                  name="recurring"
                  value={selectedExpense.recurring}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, recurring: e.target.value })}
                  options={RECURRING_OPTIONS}
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Update
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default Expenses;
