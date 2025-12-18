import { useState, useEffect } from 'react';
import { AlertCircle, XCircle, CheckCircle, History } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import Modal from '../components/common/Modal';
import RenewalDecision from '../components/service-handler/RenewalDecision';
import { getMyServices, respondToRenewal, requestServiceDisable } from '../services/serviceHandlerService';
import { getRenewalLogs } from '../services/renewalLogService';
import { formatCurrency, formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';

const ServiceHandler = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'renewal' or 'cancel'
  const [selectedService, setSelectedService] = useState(null);
  const [reason, setReason] = useState('');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [confirmCancellation, setConfirmCancellation] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await getMyServices();
      if (response.success) {
        setServices(response.data);
      }
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (service, type) => {
    setSelectedService(service);
    setModalType(type);
    setShowModal(true);
    setReason('');
    setConfirmCancellation(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedService(null);
    setModalType('');
    setReason('');
    setConfirmCancellation(false);
  };

  const handleRenewalResponse = async (willRenew) => {
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      await respondToRenewal(selectedService._id, willRenew, reason);
      toast.success(
        willRenew
          ? 'Renewal confirmed successfully'
          : 'Cancellation request sent to MIS'
      );
      handleCloseModal();
      fetchServices();
    } catch (error) {
      toast.error('Failed to submit response');
    }
  };

  const handleCancellation = async () => {
    if (!reason.trim()) {
      toast.error('Please add service details (include login/credentials)');
      return;
    }

    if (!confirmCancellation) {
      toast.error('Please confirm you want to send this cancellation request');
      return;
    }

    try {
      await requestServiceDisable(selectedService._id, confirmCancellation, reason);
      toast.success('Cancellation request sent to MIS');
      handleCloseModal();
      fetchServices();
    } catch (error) {
      toast.error('Failed to request cancellation');
    }
  };

  const handleViewLogs = async (service) => {
    setSelectedService(service);
    setShowLogsModal(true);
    setLogsLoading(true);
    try {
      const response = await getRenewalLogs(service._id);
      if (response.success) {
        setLogs(response.data);
      }
    } catch (error) {
      toast.error('Failed to load logs');
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      Active: 'success',
      Declined: 'danger',
      Deactive: 'warning',
      Pending: 'warning',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Services</h1>
          <p className="text-gray-600">Manage your assigned services and subscriptions</p>
        </div>

        {/* Services List */}
        {loading ? (
          <Card>
            <Loading />
          </Card>
        ) : services.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No services assigned to you</p>
            </div>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Card No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Card Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount (INR)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recurring
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Renewal Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {services.map((service) => (
                  <tr key={service._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {service.cardNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {service.cardAssignedTo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(service.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {service.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(service.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{service.particulars}</div>
                      <div className="text-gray-500 text-xs">{service.narration}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {service.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(service.amount, service.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(service.amountInINR, 'INR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {service.typeOfService}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {service.businessUnit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {service.recurring}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {service.nextRenewalDate ? formatDate(service.nextRenewalDate) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenModal(service, 'renewal')}
                          disabled={service.status !== 'Active'}
                        >
                          <CheckCircle size={16} className="mr-1" />
                          Renewal
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLogs(service)}
                        >
                          <History size={16} className="mr-1" />
                          Logs
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleOpenModal(service, 'cancel')}
                          disabled={service.status === 'Deactive'}
                        >
                          <XCircle size={16} className="mr-1" />
                          Disable
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Renewal/Cancellation Modal */}
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={modalType === 'renewal' ? 'Service Renewal' : 'Request Service Cancellation'}
          size="md"
        >
          <div className="space-y-4">
            {selectedService && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Service Details</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Service:</strong> {selectedService.particulars}
                  </p>
                  <p>
                    <strong>Business Unit:</strong> {selectedService.businessUnit}
                  </p>
                  <p>
                    <strong>Amount:</strong> {formatCurrency(selectedService.amount, selectedService.currency)}
                  </p>
                  <p>
                    <strong>Recurring:</strong> {selectedService.recurring}
                  </p>
                </div>
              </div>
            )}

            {modalType === 'renewal' ? (
              <RenewalDecision
                reason={reason}
                onReasonChange={setReason}
                onConfirm={() => handleRenewalResponse(true)}
                onReject={() => handleRenewalResponse(false)}
                onClose={handleCloseModal}
              />
            ) : (
              <>
                <div>
                  <p className="text-gray-700 mb-2">
                    Include service access details (login email, IDs, credentials or steps) so MIS can disable it quickly.
                  </p>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows="4"
                    placeholder="Add service credentials/IDs, account email, and any notes MIS needs to disable this service..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <label className="flex items-center space-x-2 mt-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={confirmCancellation}
                      onChange={(e) => setConfirmCancellation(e.target.checked)}
                    />
                    <span>Yes, send this cancellation request to MIS.</span>
                  </label>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button variant="secondary" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={handleCancellation} disabled={!confirmCancellation}>
                    <XCircle size={18} className="mr-2" />
                    Request Cancellation
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>

        {/* Renewal Logs Modal */}
        <Modal
          isOpen={showLogsModal}
          onClose={() => setShowLogsModal(false)}
          title="Renewal Response History"
          size="lg"
        >
          <div className="space-y-4">
            {selectedService && (
              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Service Details</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Service:</strong> {selectedService.particulars}
                  </p>
                  <p>
                    <strong>Business Unit:</strong> {selectedService.businessUnit}
                  </p>
                  <p>
                    <strong>Recurring:</strong> {selectedService.recurring}
                  </p>
                </div>
              </div>
            )}

            {logsLoading ? (
              <div className="text-center py-8">
                <Loading />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No renewal history found for this service</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log, index) => (
                  <div
                    key={log._id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {log.action === 'Continue' ? (
                          <CheckCircle size={20} className="text-green-600" />
                        ) : (
                          <XCircle size={20} className="text-red-600" />
                        )}
                        <span className="font-semibold text-gray-900">
                          {log.action === 'Continue' ? 'Continued Service' : 'Requested Cancellation'}
                        </span>
                      </div>
                      <Badge variant={log.action === 'Continue' ? 'success' : 'danger'}>
                        {log.action}
                      </Badge>
                    </div>
                    <div className="ml-7 space-y-1 text-sm">
                      <p className="text-gray-700">
                        <strong>Reason:</strong> {log.reason}
                      </p>
                      <p className="text-gray-500">
                        <strong>Renewal Date:</strong> {formatDate(log.renewalDate)}
                      </p>
                      <p className="text-gray-500">
                        <strong>Response Date:</strong> {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setShowLogsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default ServiceHandler;
