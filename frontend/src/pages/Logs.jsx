import { useEffect, useState, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import Badge from '../components/common/Badge';
import { getLogs } from '../services/logService';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';

const toneForAction = (type) => {
  switch (type) {
    case 'purchase':
      return { variant: 'success', label: 'Purchase' };
    case 'disable_request':
      return { variant: 'danger', label: 'Disable Request' };
    case 'disabled_by_mis':
      return { variant: 'danger', label: 'Disabled by MIS' };
    case 'continue':
      return { variant: 'info', label: 'Continue' };
    default:
      return { variant: 'default', label: type };
  }
};

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await getLogs();
        if (response.success) {
          setLogs(response.data || []);
        }
      } catch (error) {
        toast.error('Failed to load logs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const term = search.toLowerCase();
    return logs.filter((log) => {
      const fields = [
        log.service,
        log.businessUnit,
        log.serviceHandler,
        log.spoc,
        log.action,
        log.cardNumber,
        log.reason,
        log.type,
        log.status,
      ]
        .filter(Boolean)
        .map((field) => `${field}`.toLowerCase());

      // synonym match: treat "deactive"/"disable" as matches for disabled actions
      const disableMatch =
        term.includes('deactive') || term.includes('disable')
          ? log.type === 'disabled_by_mis' ||
            log.type === 'disable_request' ||
            (log.action || '').toLowerCase().includes('disable') ||
            (log.reason || '').toLowerCase().includes('disable')
          : false;

      return disableMatch || fields.some((field) => field.includes(term));
    });
  }, [logs, search]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logs</h1>
            <p className="text-gray-600">
              Track purchases, renewal decisions, and disable requests.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder="Search by service, BU, handler..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <Card>
            <Loading />
          </Card>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <div className="text-center py-10">
              <p className="text-gray-500">No logs found</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const tone = toneForAction(log.type);
              return (
                <Card key={log.id} className="hover:shadow-card-hover transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <Badge variant={tone.variant}>{tone.label}</Badge>
                        <p className="text-sm text-gray-600">{formatDateTime(log.createdAt)}</p>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {log.service}{' '}
                        <span className="text-sm font-normal text-gray-600">
                          ({log.businessUnit})
                        </span>
                      </h3>
                      <p className="text-sm text-gray-700">
                        Handler: <span className="font-medium">{log.serviceHandler || '-'}</span>{' '}
                        • Entered by: <span className="font-medium">{log.spoc || '-'}</span>
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-700 space-y-1">
                      {log.amount && (
                        <div>
                          <strong>Amount:</strong> {formatCurrency(log.amount, log.currency)}
                        </div>
                      )}
                    {log.purchaseDate && (
                      <div>
                        <strong>Purchase Date:</strong> {formatDate(log.purchaseDate)}
                      </div>
                    )}
                    {log.disableDate && (
                      <div>
                        <strong>Disable Date:</strong> {formatDate(log.disableDate)}
                      </div>
                    )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                    {log.cardNumber && (
                      <div>
                        <strong>Card:</strong> {log.cardNumber} • {log.cardAssignedTo}
                      </div>
                    )}
                {log.recurring && (
                  <div>
                    <strong>Recurring:</strong> {log.recurring}
                  </div>
                )}
                {log.reason && (
                  <div className="md:col-span-2">
                    <strong>Reason:</strong> {log.reason}
                  </div>
                )}
                {log.isShared && (
                  <div className="md:col-span-2 text-emerald-700">
                    <strong>Shared:</strong>{' '}
                    {(log.sharedAllocations || [])
                      .filter((s) => s.businessUnit)
                      .map((s) => `${s.businessUnit}: ${s.amount}`)
                      .join(', ')}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
        )}
      </div>
    </Layout>
  );
};

export default Logs;
