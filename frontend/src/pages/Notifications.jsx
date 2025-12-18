import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, AlertCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import Modal from '../components/common/Modal';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../services/notificationService';
import { respondToRenewal } from '../services/serviceHandlerService';
import { formatDateTime, formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // continue or cancel
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const isRead = filter === 'all' ? undefined : filter === 'read';
      const response = await getNotifications(isRead);
      if (response.success) {
        setNotifications(response.data);
      }
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      toast.success('Notification marked as read');
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('All notifications marked as read');
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      try {
        await deleteNotification(id);
        toast.success('Notification deleted');
        fetchNotifications();
      } catch (error) {
        toast.error('Failed to delete notification');
      }
    }
  };

  const openActionModal = (notification, type) => {
    setSelectedNotification(notification);
    setActionType(type);
    setActionReason('');
    setShowActionModal(true);
  };

  const handleRenewalAction = async () => {
    if (!selectedNotification) return;
    if (!actionReason.trim()) {
      toast.error('Please add a note (include credentials/details if needed)');
      return;
    }
    const entryId =
      selectedNotification.relatedEntry?._id ||
      selectedNotification.actionData?.entryId ||
      selectedNotification.relatedEntry;

    if (!entryId) {
      toast.error('Missing service reference for this notification');
      return;
    }

    try {
      setActionLoading(true);
      await respondToRenewal(entryId, actionType === 'continue', actionReason);
      toast.success(
        actionType === 'continue'
          ? 'Renewal confirmed'
          : 'Cancellation request sent to MIS'
      );
      setShowActionModal(false);
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to submit response');
    } finally {
      setActionLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'renewal_reminder':
        return <AlertCircle className="text-yellow-600" size={24} />;
      case 'service_cancellation':
        return <AlertCircle className="text-red-600" size={24} />;
      case 'approval_request':
        return <Bell className="text-blue-600" size={24} />;
      default:
        return <Bell className="text-gray-600" size={24} />;
    }
  };

  const getToneClasses = (type, isRead) => {
    const base = isRead ? 'bg-white' : '';
    switch (type) {
      case 'approval_request':
        return `${base} border-l-4 border-blue-500 bg-blue-50`;
      case 'renewal_reminder':
        return `${base} border-l-4 border-amber-500 bg-amber-50`;
      case 'service_cancellation':
        return `${base} border-l-4 border-rose-500 bg-rose-50`;
      default:
        return `${base} border-l-4 border-slate-200 bg-white`;
    }
  };

  return (
    <>
      <Layout>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <Button onClick={handleMarkAllAsRead} variant="secondary" size="sm">
            <CheckCheck size={18} className="mr-2" />
            Mark All as Read
          </Button>
        </div>

        {/* Filter Tabs */}
        <Card>
          <div className="flex space-x-4 border-b border-gray-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === 'all'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === 'unread'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === 'read'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Read
            </button>
          </div>
        </Card>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <Card>
              <Loading />
            </Card>
          ) : notifications.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <Bell size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No notifications found</p>
              </div>
            </Card>
          ) : (
            notifications.map((notification) => {
              const toneClasses = getToneClasses(notification.type, notification.isRead);
              return (
                <Card
                  key={notification._id}
                  className={`transition-all hover:shadow-card-hover ${toneClasses}`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-gray-900 mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                          <div className="flex items-center space-x-3 text-xs text-gray-500">
                            <span>{formatDateTime(notification.createdAt)}</span>
                            {!notification.isRead && (
                              <Badge variant="info" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification._id)}
                              className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="Mark as read"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Action Data (if any) */}
                      {notification.actionData && (
                        <div className="mt-3 p-3 bg-gray-100 rounded-lg space-y-2 text-xs text-gray-700">
                          {notification.actionData.service && (
                            <div>
                              <strong>Service:</strong> {notification.actionData.service}
                            </div>
                          )}
                          {notification.actionData.businessUnit && (
                            <div>
                              <strong>Business Unit:</strong> {notification.actionData.businessUnit}
                            </div>
                          )}
                          {notification.actionData.serviceHandler && (
                            <div>
                              <strong>Service Handler:</strong> {notification.actionData.serviceHandler}
                            </div>
                          )}
                          {notification.actionData.purchaseDate && (
                            <div>
                              <strong>Purchase Date:</strong>{' '}
                              {formatDate(notification.actionData.purchaseDate)}
                            </div>
                          )}
                          {(notification.actionData.amount || notification.actionData.currency) && (
                            <div>
                              <strong>Amount:</strong>{' '}
                              {notification.actionData.amount} {notification.actionData.currency}
                            </div>
                          )}
                          {notification.actionData.recurring && (
                            <div>
                              <strong>Recurring:</strong> {notification.actionData.recurring}
                            </div>
                          )}
                          {notification.actionData.reason && (
                            <div>
                              <strong>Reason:</strong> {notification.actionData.reason}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Renewal reminder actions for Service Handler */}
                      {notification.type === 'renewal_reminder' && (
                        <div className="mt-3 flex flex-wrap gap-3">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => openActionModal(notification, 'continue')}
                          >
                            Yes, Continue
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openActionModal(notification, 'cancel')}
                          >
                            No, Disable
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
    <Modal
      isOpen={showActionModal}
      onClose={() => setShowActionModal(false)}
      title={
        actionType === 'continue'
          ? 'Confirm you are using this service'
          : 'Request to disable this service'
      }
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Please add a short note (include access details/credentials if MIS needs to disable it).
        </p>
        <textarea
          className="w-full min-h-[120px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          placeholder={
            actionType === 'continue'
              ? 'Why you still need this service...'
              : 'Why this should be disabled (include login/credentials if needed)...'
          }
          value={actionReason}
          onChange={(e) => setActionReason(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowActionModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleRenewalAction} disabled={actionLoading}>
            {actionLoading ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
    </Modal>
    </>
  );
};

export default Notifications;
