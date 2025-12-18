import { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Badge from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const ExpenseTable = ({ expenses, onEdit, onDelete, loading, showDuplicateColumn = true }) => {
  const { user } = useAuth();
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const canEdit = ['mis_manager', 'super_admin'].includes(user?.role);
  const canDelete = user?.role === 'super_admin';
  const canViewDuplicateStatus = user?.role === 'mis_manager';
  const displayDuplicateColumn = canViewDuplicateStatus && showDuplicateColumn;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'date') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No expense entries found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:block overflow-x-auto subtle-scrollbar">
        <table className="min-w-full border-separate border-spacing-y-3 text-sm">
          <thead>
            <tr>
              <th
                onClick={() => handleSort('date')}
                className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400 cursor-pointer"
              >
                Date
              </th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Card No</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Card Assigned To</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Month</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Status</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Entry Status</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Particulars</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Narration</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Currency</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Bill Status</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Amount</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">XE Rate</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Amount (INR)</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Type of Service</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Business Unit</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Cost Center</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Approved By</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Service Handler</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Recurring</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Shared</th>
              {displayDuplicateColumn && (
                <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Duplicate
                </th>
              )}
              {(canEdit || canDelete) && (
                <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedExpenses.map((expense) => (
              <tr key={expense._id} className="bg-white/90 shadow-sm rounded-2xl hover:bg-white">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900">
                  {formatDate(expense.date)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.cardNumber || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.cardAssignedTo || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.month || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  <Badge>{expense.status || '-'}</Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  <Badge variant={expense.entryStatus === 'Accepted' ? 'success' : expense.entryStatus === 'Rejected' ? 'danger' : 'warning'}>
                    {expense.entryStatus || 'Accepted'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="font-medium">{expense.particulars || '-'}</div>
                  <div className="text-xs text-gray-500">{expense.typeOfService || '-'}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-xs">
                  <div className="truncate">{expense.narration || '-'}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.currency || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.billStatus || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.amount ? `${expense.amount} ${expense.currency || ''}` : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.xeRate || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                  {expense.amountInINR ? formatCurrency(expense.amountInINR) : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.typeOfService || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.businessUnit || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.costCenter || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.approvedBy || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.serviceHandler || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.recurring || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {expense.isShared ? (
                    <div>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">Shared</span>
                      <span className="block text-[11px] text-slate-500">
                        {(expense.sharedAllocations || [])
                          .filter((s) => s.businessUnit)
                          .map((s) => `${s.businessUnit}: ${s.amount}`)
                          .join(', ')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                {displayDuplicateColumn && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {expense.duplicateStatus && (
                      <Badge variant={expense.duplicateStatus === 'Unique' ? 'success' : 'warning'}>
                        {expense.duplicateStatus}
                      </Badge>
                    )}
                  </td>
                )}
                {(canEdit || canDelete) && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      {canEdit && (
                        <button
                          onClick={() => onEdit(expense)}
                          className="rounded-full bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => onDelete(expense._id)}
                          className="rounded-full bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet cards */}
      <div className="grid gap-3 md:hidden">
        {sortedExpenses.map((expense) => (
          <div key={expense._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Date</p>
                <p className="text-base font-semibold text-slate-900">{formatDate(expense.date)}</p>
                <p className="text-sm text-slate-600 mt-1">{expense.cardNumber || '-'}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                {expense.status && <Badge>{expense.status}</Badge>}
                {expense.entryStatus && (
                  <Badge variant={expense.entryStatus === 'Accepted' ? 'success' : expense.entryStatus === 'Rejected' ? 'danger' : 'warning'}>
                    {expense.entryStatus}
                  </Badge>
                )}
                {displayDuplicateColumn && expense.duplicateStatus && (
                  <Badge variant={expense.duplicateStatus === 'Unique' ? 'success' : 'warning'}>
                    {expense.duplicateStatus}
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Particulars</p>
                <p className="font-semibold text-slate-900">{expense.particulars || '-'}</p>
                <p className="text-slate-500">{expense.typeOfService || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Narration</p>
                <p className="text-slate-700">{expense.narration || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Amount</p>
                <p className="font-semibold text-slate-900">
                  {expense.amount ? `${expense.amount} ${expense.currency || ''}` : '-'}
                </p>
                <p className="text-slate-500">{expense.amountInINR ? formatCurrency(expense.amountInINR) : '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Bill Status</p>
                <p className="text-slate-700">{expense.billStatus || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Business Unit</p>
                <p className="text-slate-700">{expense.businessUnit || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Cost Center</p>
                <p className="text-slate-700">{expense.costCenter || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Handler</p>
                <p className="text-slate-700">{expense.serviceHandler || '-'}</p>
                <p className="text-slate-500">{expense.cardAssignedTo || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recurring</p>
                <p className="text-slate-700">{expense.recurring || 'One-time'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Shared</p>
                <p className="text-slate-700">
                  {expense.isShared
                    ? (expense.sharedAllocations || [])
                        .filter((s) => s.businessUnit)
                        .map((s) => `${s.businessUnit}: ${s.amount}`)
                        .join(', ')
                    : '—'}
                </p>
              </div>
            </div>

            {(canEdit || canDelete) && (
              <div className="mt-4 flex items-center justify-end gap-2">
                {canEdit && (
                  <button
                    onClick={() => onEdit(expense)}
                    className="rounded-full bg-indigo-50 px-3 py-2 text-indigo-600 text-sm font-semibold hover:bg-indigo-100"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(expense._id)}
                    className="rounded-full bg-rose-50 px-3 py-2 text-rose-600 text-sm font-semibold hover:bg-rose-100"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpenseTable;
