import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Button from '../components/common/Button';
import { createExpense } from '../services/expenseService';
import { useAuth } from '../context/AuthContext';
import {
  BUSINESS_UNITS,
  TYPES_OF_EXPENSE,
  COST_CENTERS,
  APPROVED_BY,
  RECURRING_OPTIONS,
  CURRENCIES,
  STATUS_OPTIONS,
} from '../utils/constants';
import { getMonthYear } from '../utils/formatters';
import toast from 'react-hot-toast';

const AddExpense = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const isBusinessUnitLocked = ['business_unit_admin', 'spoc'].includes(user?.role);
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardAssignedTo: '',
    date: '',
    month: '',
    status: 'Active',
    particulars: '',
    narration: '',
    currency: 'USD',
    billStatus: '',
    amount: '',
    typeOfService: '',
    businessUnit: user?.businessUnit || '',
    costCenter: '',
    approvedBy: '',
    serviceHandler: '',
    recurring: 'One-time',
    isShared: false,
    sharedAllocations: [],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Auto-generate month when date changes
    if (name === 'date' && value) {
      setFormData((prev) => ({
        ...prev,
        month: getMonthYear(value),
      }));
    }

    // Auto-fill narration with particulars if empty
    if (name === 'particulars' && !formData.narration) {
      setFormData((prev) => ({
        ...prev,
        narration: value,
      }));
    }
  };

  const handleSharedToggle = (checked) => {
    setFormData((prev) => {
      if (!checked) {
        return { ...prev, isShared: false, sharedAllocations: [] };
      }
      // Seed with current BU row if missing
      const existing = prev.sharedAllocations || [];
      const hasCurrentBU = existing.some((s) => s.businessUnit === prev.businessUnit);
      const baseAllocations = hasCurrentBU
        ? existing
        : [...existing, { businessUnit: prev.businessUnit || '', amount: '' }];
      return { ...prev, isShared: true, sharedAllocations: baseAllocations };
    });
  };

  const updateSharedAllocation = (businessUnit, amount) => {
    setFormData((prev) => {
      const allocations = [...(prev.sharedAllocations || [])];
      const idx = allocations.findIndex((a) => a.businessUnit === businessUnit);
      if (idx >= 0) {
        allocations[idx] = { ...allocations[idx], amount };
      } else {
        allocations.push({ businessUnit, amount });
      }
      return { ...prev, sharedAllocations: allocations };
    });
  };

  const toggleAllocation = (businessUnit, enabled) => {
    setFormData((prev) => {
      let allocations = [...(prev.sharedAllocations || [])];
      if (!enabled) {
        allocations = allocations.filter((a) => a.businessUnit !== businessUnit);
      } else {
        const exists = allocations.find((a) => a.businessUnit === businessUnit);
        if (!exists) {
          allocations.push({ businessUnit, amount: '' });
        }
      }
      return { ...prev, sharedAllocations: allocations };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amountValue = parseFloat(formData.amount) || 0;
      const sharedAllocations = (formData.sharedAllocations || [])
        .map((item) => ({
          businessUnit: item.businessUnit,
          amount: parseFloat(item.amount) || 0,
        }))
        .filter((item) => item.amount > 0 && item.businessUnit);

      if (formData.isShared) {
        const totalShared = sharedAllocations.reduce((sum, item) => sum + item.amount, 0);
        if (sharedAllocations.length === 0) {
          toast.error('Please enter at least one shared allocation amount.');
          setLoading(false);
          return;
        }
        if (totalShared > amountValue) {
          toast.error('Shared allocations cannot exceed total amount.');
          setLoading(false);
          return;
        }
      }

      const response = await createExpense({
        ...formData,
        amount: amountValue,
        sharedAllocations,
      });
      if (response.success) {
        toast.success('Expense entry submitted for approval!');
        navigate('/expenses');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create expense entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <Card title="Add New Expense Entry">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Card Number"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleChange}
                  placeholder="e.g., M003"
                  required
                />
                <Input
                  label="Card Assigned To"
                  name="cardAssignedTo"
                  value={formData.cardAssignedTo}
                  onChange={handleChange}
                  placeholder="e.g., John Doe"
                  required
                />
              </div>
            </div>

            {/* Date and Status */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Date & Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Date"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Month"
                  name="month"
                  value={formData.month}
                  onChange={handleChange}
                  placeholder="Auto-generated"
                  required
                />
                <Select
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={STATUS_OPTIONS}
                  required
                />
              </div>
            </div>

            {/* Service Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Particulars (Service Name)"
                  name="particulars"
                  value={formData.particulars}
                  onChange={handleChange}
                  placeholder="e.g., ChatGPT"
                  required
                />
                <Input
                  label="Narration"
                  name="narration"
                  value={formData.narration}
                  onChange={handleChange}
                  placeholder="e.g., ChatGPT Subscription"
                  required
                />
                <Select
                  label="Type of Service"
                  name="typeOfService"
                  value={formData.typeOfService}
                  onChange={handleChange}
                  options={TYPES_OF_EXPENSE}
                  required
                />
                <Input
                  label="Bill Status"
                  name="billStatus"
                  value={formData.billStatus}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Amount Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Amount Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="e.g., 200"
                  required
                />
                <Select
                  label="Currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  options={CURRENCIES}
                  required
                />
              </div>
            </div>

            {/* Shared Expense */}
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Shared Expense</h3>
                  <p className="text-sm text-slate-500">
                    Toggle if this cost is split across business units. Total shared amounts cannot exceed the entry amount.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={formData.isShared}
                    onChange={(e) => handleSharedToggle(e.target.checked)}
                  />
                  Mark as shared
                </label>
              </div>
              {formData.isShared && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {BUSINESS_UNITS.map((bu) => {
                    const alloc = formData.sharedAllocations?.find((a) => a.businessUnit === bu);
                    const enabled = Boolean(alloc) || bu === formData.businessUnit;
                    return (
                      <div key={bu} className="border border-slate-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{bu}</span>
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => toggleAllocation(bu, e.target.checked)}
                            disabled={bu === formData.businessUnit}
                            title={bu === formData.businessUnit ? 'Primary business unit always included' : 'Include this BU in the split'}
                          />
                        </div>
                        {enabled && (
                          <Input
                            label="Amount"
                            type="number"
                            step="0.01"
                            name={`shared-${bu}`}
                            value={alloc?.amount || ''}
                            onChange={(e) => updateSharedAllocation(bu, e.target.value)}
                            placeholder="e.g., 200"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Business Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Business Unit"
                  name="businessUnit"
                  value={formData.businessUnit}
                  onChange={handleChange}
                  options={BUSINESS_UNITS}
                  disabled={isBusinessUnitLocked}
                  placeholder="Select Business Unit"
                  required
                />
                <Select
                  label="Cost Center"
                  name="costCenter"
                  value={formData.costCenter}
                  onChange={handleChange}
                  options={COST_CENTERS}
                  required
                />
                <Select
                  label="Approved By"
                  name="approvedBy"
                  value={formData.approvedBy}
                  onChange={handleChange}
                  options={APPROVED_BY}
                  required
                />
                <Input
                  label="Service Handler"
                  name="serviceHandler"
                  value={formData.serviceHandler}
                  onChange={handleChange}
                  placeholder="e.g., Raghav"
                  required
                />
              </div>
            </div>

            {/* Recurring */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Type</h3>
              <Select
                label="Recurring"
                name="recurring"
                value={formData.recurring}
                onChange={handleChange}
                options={RECURRING_OPTIONS}
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/expenses')}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Info Card */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> After submission, this entry will be sent to your Business Unit Admin for approval.
            You will be notified once it's approved or rejected.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default AddExpense;
