import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { bulkUploadExpenses, downloadTemplate } from '../services/expenseService';
import { downloadFile } from '../utils/formatters';
import toast from 'react-hot-toast';

const BulkUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
      ];
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        toast.error('Please select a valid Excel or CSV file');
        e.target.value = '';
      }
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadTemplate();
      downloadFile(blob, 'expense-template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      const response = await bulkUploadExpenses(file);
      if (response.success) {
        setUploadResult(response.data);
        toast.success('Bulk upload completed successfully!');
        setFile(null);
        // Reset file input
        document.getElementById('file-input').value = '';
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bulk Upload Expenses</h1>
          <p className="text-gray-600">
            Upload multiple expense entries at once using an Excel or CSV file
          </p>
        </div>

        {/* Instructions */}
        <Card title="Instructions">
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </div>
              </div>
              <div>
                <p className="font-medium">Download the template</p>
                <p className="text-gray-600">
                  Click the "Download Template" button to get the Excel template with the correct format
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </div>
              </div>
              <div>
                <p className="font-medium">Fill in your expense data</p>
                <p className="text-gray-600">
                  Enter your expense entries in the template. Make sure all required fields are filled
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </div>
              </div>
              <div>
                <p className="font-medium">Upload the file</p>
                <p className="text-gray-600">
                  Select your filled template and click "Upload" to process the entries
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Download Template */}
        <Card title="Step 1: Download Template">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet size={40} className="text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Expense Entry Template</p>
                <p className="text-sm text-gray-600">Excel format with all required columns</p>
              </div>
            </div>
            <Button onClick={handleDownloadTemplate} variant="outline">
              <Download size={18} className="mr-2" />
              Download Template
            </Button>
          </div>
        </Card>

        {/* Upload File */}
        <Card title="Step 2 & 3: Upload Your File">
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <label htmlFor="file-input" className="cursor-pointer">
                <span className="text-primary-600 font-medium hover:text-primary-700">
                  Click to select a file
                </span>
                <span className="text-gray-600"> or drag and drop</span>
                <p className="text-xs text-gray-500 mt-2">Excel (.xlsx, .xls) or CSV files only</p>
              </label>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {file && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet size={24} className="text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Upload Results */}
        {uploadResult && (
          <Card title="Upload Results">
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertCircle size={18} className="text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">Total</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{uploadResult.total}</p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <CheckCircle size={18} className="text-green-600" />
                    <p className="text-sm font-medium text-green-900">Success</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{uploadResult.success}</p>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertCircle size={18} className="text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-900">Merged</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{uploadResult.merged}</p>
                </div>

                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <XCircle size={18} className="text-red-600" />
                    <p className="text-sm font-medium text-red-900">Failed</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{uploadResult.failed}</p>
                </div>
              </div>

              {/* Errors */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Errors</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {uploadResult.errors.map((error, index) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-900">
                          Row {error.row}: {error.error}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>{uploadResult.unique}</strong> unique entries were added to the global expense sheet.
                  <strong> {uploadResult.merged}</strong> duplicate entries were merged.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default BulkUpload;
