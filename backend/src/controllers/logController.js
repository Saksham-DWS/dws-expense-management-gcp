import ExpenseEntry from '../models/ExpenseEntry.js';
import RenewalLog from '../models/RenewalLog.js';

// Normalize a log record for UI
const mapPurchaseLog = (entry) => ({
  id: entry._id,
  type: 'purchase',
  action: 'Purchase',
  service: entry.particulars,
  businessUnit: entry.businessUnit,
  serviceHandler: entry.serviceHandler,
  spoc: entry.createdBy?.name || 'Unknown',
  cardNumber: entry.cardNumber,
  cardAssignedTo: entry.cardAssignedTo,
  purchaseDate: entry.date,
  disableDate: entry.disabledAt || null,
  amount: entry.amount,
  currency: entry.currency,
  recurring: entry.recurring,
  reason: '',
  createdAt: entry.createdAt,
  isShared: entry.isShared || false,
  sharedAllocations: entry.sharedAllocations || [],
});

const mapRenewalLog = (log) => {
  const entry = log.expenseEntry;
  const isCancel = log.action === 'Cancel';
  const isMisDisable = log.action === 'DisableByMIS';
  const isSharedEdit = log.action === 'SharedEdit';
  return {
    id: log._id,
    type: isSharedEdit ? 'shared_edit' : isMisDisable ? 'disabled_by_mis' : isCancel ? 'disable_request' : 'continue',
    action: isSharedEdit ? 'Shared allocation update' : isMisDisable ? 'Disabled by MIS' : isCancel ? 'Disable Request' : 'Continue Service',
    status: isSharedEdit ? entry?.status : isMisDisable ? 'Deactive' : 'Active',
    service: entry?.particulars,
    businessUnit: entry?.businessUnit,
    serviceHandler: log.serviceHandler,
    spoc: entry?.createdBy?.name || 'Unknown',
    cardNumber: entry?.cardNumber,
    cardAssignedTo: entry?.cardAssignedTo,
    purchaseDate: entry?.date,
    disableDate: isMisDisable ? log.createdAt : undefined,
    amount: entry?.amount,
    currency: entry?.currency,
    recurring: entry?.recurring,
    reason: log.reason,
    createdAt: log.createdAt,
    isShared: entry?.isShared || false,
    sharedAllocations: entry?.sharedAllocations || [],
  };
};

const includesBusinessUnit = (entry, businessUnit) => {
  if (!entry || !businessUnit) return false;
  if (entry.businessUnit === businessUnit) return true;
  return (entry.sharedAllocations || []).some((alloc) => alloc.businessUnit === businessUnit);
};

// @desc    Get combined logs (purchases + renewal/cancel actions)
// @route   GET /api/logs
// @access  Private (Super Admin, MIS Manager, BU Admin)
export const getLogs = async (req, res) => {
  try {
    const isBUAdmin = req.user.role === 'business_unit_admin';
    const buFilter = isBUAdmin
      ? { $or: [{ businessUnit: req.user.businessUnit }, { 'sharedAllocations.businessUnit': req.user.businessUnit }] }
      : {};

    // Purchases (expense entries)
    const entries = await ExpenseEntry.find(buFilter)
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    // Renewal / cancel logs joined with entries
    const renewalLogs = await RenewalLog.find({})
      .sort({ createdAt: -1 })
      .populate({
        path: 'expenseEntry',
        populate: { path: 'createdBy', select: 'name role' },
      })
      .lean();

    const filteredRenewal = renewalLogs.filter((log) => {
      if (!log.expenseEntry) return true; // keep orphan logs for visibility
      if (isBUAdmin) {
        return includesBusinessUnit(log.expenseEntry, req.user.businessUnit);
      }
      return true;
    });

    const purchaseLogs = entries.map(mapPurchaseLog);
    const renewalMapped = filteredRenewal.map(mapRenewalLog);

    const combined = [...purchaseLogs, ...renewalMapped].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json({
      success: true,
      count: combined.length,
      data: combined,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  getLogs,
};
