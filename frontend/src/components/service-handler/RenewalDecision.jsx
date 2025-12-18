import { CheckCircle, XCircle } from 'lucide-react';
import Button from '../common/Button';

const RenewalDecision = ({
  reason,
  onReasonChange,
  onConfirm,
  onReject,
  onClose,
}) => {
  return (
    <>
      <div>
        <p className="text-gray-700 mb-4">
          Do you want to continue with this service subscription?
        </p>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          rows="4"
          placeholder="Please provide a reason for your decision..."
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
        />
      </div>
      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onReject}>
          <XCircle size={18} className="mr-2" />
          No, Cancel Service
        </Button>
        <Button variant="success" onClick={onConfirm}>
          <CheckCircle size={18} className="mr-2" />
          Yes, Continue
        </Button>
      </div>
    </>
  );
};

export default RenewalDecision;
