import { useEffect, useImperativeHandle, useMemo, useState, forwardRef } from 'react';
import { Filter, X, Calendar, DollarSign } from 'lucide-react';
import Button from './Button';
import Select from './Select';
import Input from './Input';
import Modal from './Modal';
import {
  BUSINESS_UNITS,
  TYPES_OF_EXPENSE,
  COST_CENTERS,
  APPROVED_BY,
  RECURRING_OPTIONS,
  STATUS_OPTIONS,
} from '../../utils/constants';

export const ADVANCED_FILTER_DEFAULTS = {
  businessUnit: '',
  cardNumber: '',
  status: '',
  typeOfService: '',
  costCenter: '',
  approvedBy: '',
  recurring: '',
  startDate: '',
  endDate: '',
  disableStartDate: '',
  disableEndDate: '',
  month: '',
  minAmount: '',
  maxAmount: '',
  duplicateStatus: '',
  sharedOnly: '',
};

const AdvancedFilter = forwardRef(({
  onApplyFilters,
  onClearFilters,
  showBusinessUnit = true,
  showDuplicateStatusFilter = false,
  appliedFilters = ADVANCED_FILTER_DEFAULTS,
  label = 'Hyper Filter',
  variant = 'outline',
  hideTrigger = false,
}, ref) => {
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ ...ADVANCED_FILTER_DEFAULTS, ...appliedFilters });

  useEffect(() => {
    setFilters({ ...ADVANCED_FILTER_DEFAULTS, ...appliedFilters });
  }, [appliedFilters]);

  useImperativeHandle(ref, () => ({
    open: () => setShowModal(true),
    close: () => setShowModal(false),
    reset: () => setFilters({ ...ADVANCED_FILTER_DEFAULTS }),
  }));

  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleApply = () => {
    // Remove empty filters
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    );
    if (onApplyFilters) {
      onApplyFilters(activeFilters);
    }
    setShowModal(false);
  };

  const handleClear = () => {
    const resetFilters = { ...ADVANCED_FILTER_DEFAULTS };
    setFilters(resetFilters);
    if (onClearFilters) {
      onClearFilters();
    }
    setShowModal(false);
  };

  const activeFilterCount = useMemo(() => {
    const source = appliedFilters || filters;
    return Object.values(source).filter((value) => value !== '' && value !== null && value !== undefined).length;
  }, [appliedFilters, filters]);

  return (
    <>
      {!hideTrigger && (
        <Button onClick={() => setShowModal(true)} variant={variant} className="relative">
          <Filter size={18} className="mr-2" />
          {label}
          {activeFilterCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-primary-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </Button>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Advanced Filters"
        size="lg"
      >
        <div className="max-h-[70vh] overflow-y-auto px-1 sm:px-2 subtle-scrollbar space-y-6">
          <div className="rounded-2xl border border-slate-700 bg-black text-white p-4 text-sm sticky top-0 z-10">
            Apply precise, combinational filters to interrogate the global sheet. Every control stacks with the rest for surgical visibility.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Business Unit */}
            {showBusinessUnit && (
              <Select
                label="Business Unit"
                name="businessUnit"
                value={filters.businessUnit}
                onChange={handleChange}
                options={BUSINESS_UNITS}
              />
            )}

            {/* Card Number */}
            <Input
              label="Card Number"
              name="cardNumber"
              value={filters.cardNumber}
              onChange={handleChange}
              placeholder="e.g., M003, C002"
            />

            {/* Status */}
            <Select
              label="Status"
              name="status"
              value={filters.status}
              onChange={handleChange}
              options={STATUS_OPTIONS}
            />

            {/* Type of Service */}
            <Select
              label="Type of Service"
              name="typeOfService"
              value={filters.typeOfService}
              onChange={handleChange}
              options={TYPES_OF_EXPENSE}
            />

            {/* Cost Center */}
            <Select
              label="Cost Center"
              name="costCenter"
              value={filters.costCenter}
              onChange={handleChange}
              options={COST_CENTERS}
            />

            {/* Approved By */}
            <Select
              label="Approved By"
              name="approvedBy"
              value={filters.approvedBy}
              onChange={handleChange}
              options={APPROVED_BY}
            />

            {/* Recurring */}
            <Select
              label="Recurring Type"
              name="recurring"
              value={filters.recurring}
              onChange={handleChange}
              options={RECURRING_OPTIONS}
            />

            {/* Duplicate Status */}
            {showDuplicateStatusFilter && (
              <Select
                label="Duplicate Status"
                name="duplicateStatus"
                value={filters.duplicateStatus}
                onChange={handleChange}
                options={['Unique', 'Merged']}
              />
            )}

            {/* Month */}
            <Input
              label="Month"
              name="month"
              value={filters.month}
              onChange={handleChange}
              placeholder="e.g., Jan-2025"
            />
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                id="sharedOnly"
                name="sharedOnly"
                checked={filters.sharedOnly === 'true'}
                onChange={(e) => setFilters({ ...filters, sharedOnly: e.target.checked ? 'true' : '' })}
              />
              <label htmlFor="sharedOnly" className="text-sm text-slate-700 font-semibold">Shared only</label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3 flex items-center">
              <Calendar size={16} className="mr-2" />
              Date Range
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="From Date"
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleChange}
              />
              <Input
                label="To Date"
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3 flex items-center">
              <Calendar size={16} className="mr-2" />
              Disable Date Range
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Disabled From"
                type="date"
                name="disableStartDate"
                value={filters.disableStartDate}
                onChange={handleChange}
              />
              <Input
                label="Disabled To"
                type="date"
                name="disableEndDate"
                value={filters.disableEndDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3 flex items-center">
              <DollarSign size={16} className="mr-2" />
              Amount Range (INR)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Minimum Amount"
                type="number"
                name="minAmount"
                value={filters.minAmount}
                onChange={handleChange}
                placeholder="0"
              />
              <Input
                label="Maximum Amount"
                type="number"
                name="maxAmount"
                value={filters.maxAmount}
                onChange={handleChange}
                placeholder="999999"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center pt-6 pb-2 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={handleClear}>
              <X size={18} className="mr-2" />
              Clear All Filters
            </Button>
            <div className="flex flex-wrap gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleApply}>
                <Filter size={18} className="mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
});

export default AdvancedFilter;
