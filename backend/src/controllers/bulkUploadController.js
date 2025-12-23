import ExcelJS from 'exceljs';
import csvParser from 'csv-parser';
import path from 'path';
import fs from 'fs';
import ExpenseEntry from '../models/ExpenseEntry.js';
import { convertToINR } from '../services/currencyService.js';

const parseFilterDate = (value, endOfDay = false) => {
  if (!value) return undefined;
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split('-');
    const iso = `${yyyy}-${mm}-${dd}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`;
    return new Date(iso);
  }
  return new Date(value);
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseMultiValues = (value) =>
  value
    ?.toString()
    .split(',')
    .map((val) => val.trim())
    .filter(Boolean) || [];

const buildRegexList = (values) => values.map((val) => new RegExp(escapeRegex(val), 'i'));

const applyMultiValueFilter = (query, field, rawValue) => {
  const values = parseMultiValues(rawValue);
  if (values.length === 0) return;
  const regexes = buildRegexList(values);
  const clause = regexes.length === 1 ? regexes[0] : { $in: regexes };

  if (query[field]) {
    const existing = query[field];
    delete query[field];
    query.$and = query.$and ? [...query.$and, { [field]: existing }, { [field]: clause }] : [{ [field]: existing }, { [field]: clause }];
  } else {
    query[field] = clause;
  }
};

// @desc    Bulk upload expense entries
// @route   POST /api/expenses/bulk-upload
// @access  Private (MIS, Super Admin)
const parseExcelFile = async (filePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return [];
  }

  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = cell.text?.trim() || (typeof cell.value === 'string' ? cell.value.trim() : cell.value);
  });

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const rowData = {};

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;

      let value = cell.value;
      if (value && typeof value === 'object') {
        if (value.text) {
          value = value.text;
        } else if (value.result) {
          value = value.result;
        } else if (value.richText) {
          value = value.richText.map((item) => item.text).join('');
        } else if (value instanceof Date) {
          value = value;
        }
      }

      rowData[header] = value;
    });

    if (Object.values(rowData).some((val) => val !== undefined && val !== null && `${val}`.trim() !== '')) {
      rows.push(rowData);
    }
  });

  return rows;
};

const parseCSVFile = (filePath) =>
  new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => rows.push(data))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });

const excelSerialToDate = (serial) => {
  if (typeof serial !== 'number') return null;
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const days = Math.floor(serial);
  const milliseconds = days * 86400000;
  const fractionalDay = serial - days;
  const seconds = Math.round(fractionalDay * 86400);
  const date = new Date(excelEpoch.getTime() + milliseconds + seconds * 1000);
  return date;
};

// Parse flexible date formats (Excel serial, mm-dd-yyyy, dd-mm-yyyy, dd-MMM-yy, etc.)
const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return excelSerialToDate(value);

  const str = value.toString().trim();
  if (!str) return null;

  // Try native parse first
  const native = new Date(str);
  if (!isNaN(native.getTime())) return native;

  // Normalize separators
  const normalized = str.replace(/\//g, '-');

  // Handle dd-MMM-yy or dd-MMM-yyyy (e.g., 05-Jan-25)
  if (/^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(normalized)) {
    const d = new Date(normalized);
    if (!isNaN(d.getTime())) return d;
  }

  // Handle numeric parts (mm-dd-yyyy or dd-mm-yyyy)
  const parts = normalized.split('-');
  if (parts.length === 3) {
    let [p1, p2, p3] = parts;
    if (p3.length === 2) p3 = `20${p3}`;

    const n1 = parseInt(p1, 10);
    const n2 = parseInt(p2, 10);
    const year = parseInt(p3, 10);

    if (!isNaN(n1) && !isNaN(n2) && !isNaN(year)) {
      let month;
      let day;
      if (n1 > 12) {
        // assume dd-mm-yyyy
        day = n1;
        month = n2;
      } else if (n2 > 12) {
        // assume mm-dd-yyyy
        month = n1;
        day = n2;
      } else {
        // default mm-dd-yyyy
        month = n1;
        day = n2;
      }
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  return null;
};

// Helper to fetch a field by multiple aliases (handles trim and lower-case match)
const getField = (row, aliases = []) => {
  const normalizedMap = Object.entries(row || {}).reduce((acc, [key, val]) => {
    const norm = key?.toString().trim().toLowerCase();
    if (norm) acc[norm] = val;
    return acc;
  }, {});

  for (const alias of aliases) {
    if (!alias) continue;
    const norm = alias.toString().trim().toLowerCase();
    if (norm && normalizedMap.hasOwnProperty(norm)) {
      return normalizedMap[norm];
    }
  }
  return undefined;
};

// Normalize enums to allowed values
const normalizeEnum = (value, map, allowedSet) => {
  if (!value) return null;
  const norm = value.toString().trim().toLowerCase();
  if (map[norm]) return map[norm];
  // direct match in allowed set (case-insensitive)
  for (const a of allowedSet) {
    if (a.toLowerCase() === norm) return a;
  }
  return null;
};

const parseBoolean = (value) => {
  if (value === undefined || value === null) return false;
  const norm = value.toString().trim().toLowerCase();
  if (!norm) return false;
  return ['true', 'yes', 'y', '1', 'shared', 'checked'].includes(norm);
};

const parseSharedAllocations = (raw, normalizeBusinessUnit) => {
  if (!raw) return [];

  // Handle JSON string or array
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        const bu = normalizeBusinessUnit(item.businessUnit || item.bu || item.unit);
        const amount = Number(item.amount ?? item.value ?? item.share);
        return bu && amount > 0 ? { businessUnit: bu, amount } : null;
      })
      .filter(Boolean);
  }

  let text = raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parseSharedAllocations(parsed, normalizeBusinessUnit);
    }
  } catch (err) {
    /* fall through to string parsing */
  }

  text = text?.toString?.() || '';
  if (!text.trim()) return [];

  const parts = text
    .split(/[,;|]/)
    .map((p) => p.trim())
    .filter(Boolean);

  const allocations = [];
  for (const part of parts) {
    const match = part.match(/(.+?)[\s:=\-]+([\d.,]+)/);
    if (!match) continue;
    const bu = normalizeBusinessUnit(match[1]);
    const amt = parseFloat(match[2].replace(/[^0-9.-]/g, ''));
    if (bu && !Number.isNaN(amt) && amt > 0) {
      allocations.push({ businessUnit: bu, amount: amt });
    }
  }

  return allocations;
};

export const bulkUploadExpenses = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }

    const filePath = req.file.path;
    const ext = path.extname(filePath).toLowerCase();
    let data = [];

    if (ext === '.csv') {
      data = await parseCSVFile(filePath);
    } else {
      data = await parseExcelFile(filePath);
    }

    if (data.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'No data found in the uploaded file',
      });
    }

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      merged: 0,
      unique: 0,
      errors: [],
    };

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];

        // Map column names (handle different naming conventions)
        const rawCardNumber = getField(row, [
          'Card Number/Payment from',
          'Card Number/Payment From',
          'Card Number/Pavment from',
          'Card Number',
          'cardNumber',
          'Card No',
        ]);
        const cardNumber = rawCardNumber?.toString().trim();

        const rawAssigned = getField(row, ['Card Assigned To', 'cardAssignedTo', 'Card assigned to']);
        const cardAssignedTo = rawAssigned?.toString().trim();
        const date = getField(row, ['Date', 'date']);
        const month = (getField(row, ['Month', 'month']) || '').toString().trim() || undefined;
        // Enum maps
        const typeMap = {
          'tool & service': 'Service',
          'tools & service': 'Service',
          'tool & services': 'Service',
          'tools & services': 'Service',
          'tool': 'Tool',
          'service': 'Service',
          'google adwords expenses': 'Google Adwords Expense',
          'google adwords expense': 'Google Adwords Expense',
        };
        const allowedTypes = [
          'Domain',
          'Google',
          'Google Adwords Expense',
          'Hosting',
          'Proxy',
          'Server',
          'Service',
          'Tool',
        ];

        const costCenterMap = {
          'ops': 'Ops',
          'oh exps': 'OH Exps',
          'oh exps.': 'OH Exps',
          'fe': 'FE',
          'support': 'Support',
          'management exps': 'Management EXPS',
          'management exps.': 'Management EXPS',
        };
        const allowedCostCenters = ['Ops', 'FE', 'OH Exps', 'Support', 'Management EXPS'];

        const businessUnitMap = {
          'dws g': 'DWSG',
          'dwsg': 'DWSG',
          'signature': 'Signature',
          'collabx': 'Collabx',
          'wytlabs': 'Wytlabs',
          'smegoweb': 'Smegoweb',
          'shared': 'Wytlabs',
          'excel forum': 'Wytlabs',
          'excel fourm': 'Wytlabs',
          'wytlabs and dws': 'Wytlabs',
        };
        const allowedBusinessUnits = ['DWSG', 'Signature', 'Collabx', 'Wytlabs', 'Smegoweb'];

        const statusMap = {
          'deactive-nextmonth': 'Deactive',
          'deactivate-nextmonth': 'Deactive',
        };
        const allowedStatus = ['Active', 'Deactive', 'Declined'];

        const approvedByMap = {
          'vaibhav': 'Vaibhav',
          'marc': 'Marc',
          'dawood': 'Dawood',
          'raghav': 'Raghav',
          'tarun': 'Tarun',
          'yulia': 'Yulia',
          'sarthak': 'Sarthak',
          'harshit': 'Harshit',
          'suspense': 'Tarun',
        };
        const allowedApprovedBy = [
          'Vaibhav',
          'Marc',
          'Dawood',
          'Raghav',
          'Tarun',
          'Yulia',
          'Sarthak',
          'Harshit',
        ];

        const statusRaw = (getField(row, ['Status', 'status']) || 'Active').toString().trim();
        const status = normalizeEnum(statusRaw, statusMap, allowedStatus) || 'Active';
        const particulars =
          getField(row, [
            'Particulars',
            'particulars',
            'Particulars - from cc statement',
            'Particulars - from the statement',
          ]) || '';
        const narrationRaw = getField(row, [
          'Narration',
          'narration',
          'Narration - from statement',
          'Narration - from the statement',
        ]);
        const narration = narrationRaw ? narrationRaw.toString().trim() : '';
        const currency = (getField(row, ['Currency', 'currency']) || 'USD').toString().trim();
        const billStatus = `${getField(row, ['Bill Status', 'billStatus']) || ''}`.trim();
        const amountRaw = getField(row, [
          'Amount',
          'amount',
          'Amount (USD/Euro/Any)',
          'Amt',
          'Amt (USD/Euro/Any)',
        ]);
        const amount = parseFloat(amountRaw ? amountRaw.toString().replace(/,/g, '') : '');
        const typeOfServiceRaw =
          getField(row, [
            'Types of Tools or Service',
            'Type of Tool or Service',
            'typeOfService',
            'Type',
            'Type of Tool or Service*',
          ]) || '';
        const typeOfService = normalizeEnum(typeOfServiceRaw, typeMap, allowedTypes);

        const businessUnitRaw = (getField(row, ['Business Unit', 'businessUnit']) || '').toString().trim();
        const businessUnit = normalizeEnum(businessUnitRaw, businessUnitMap, allowedBusinessUnits);

        const costCenterRaw = getField(row, ['Cost Center', 'costCenter']);
        const costCenter = normalizeEnum(costCenterRaw, costCenterMap, allowedCostCenters);

        const approvedByRaw = getField(row, ['Approved By', 'approvedBy']);
        const approvedBy = normalizeEnum(approvedByRaw, approvedByMap, allowedApprovedBy);
        const serviceHandler =
          getField(row, [
            'Tool or Service Handler',
            'Tool or Service Handler (User Name)',
            'serviceHandler',
            'Service Handler',
          ]) || '';
        // Normalize recurring values
        let recurringRaw = row['Recurring/One-time'] || row['Recurring/One time'] || row['recurring'] || row['Recurring'] || 'One-time';
        const recurringMap = {
          Recurring_M: 'Monthly',
          Recurring_Y: 'Yearly',
          'OneTime': 'One-time',
          'One Time': 'One-time',
          'One-time': 'One-time',
          Monthly: 'Monthly',
          Yearly: 'Yearly',
        };
        const recurring = recurringMap[recurringRaw] || 'One-time';
        // Shared fields (optional)
        const normalizeBU = (val) => normalizeEnum(val, businessUnitMap, allowedBusinessUnits);
        const isSharedRaw =
          getField(row, ['Is Shared', 'isShared', 'Shared', 'shared', 'Shared Bill?']) ?? false;
        const sharedAllocRaw =
          getField(row, ['Shared Bill', 'Shared Bills', 'sharedBill', 'sharedAllocation', 'sharedAllocations']) ??
          '';
        let sharedAllocations = parseSharedAllocations(sharedAllocRaw, normalizeBU);
        let isShared = parseBoolean(isSharedRaw) || sharedAllocations.length > 0;

        if (isShared) {
          // Ensure primary BU is present even if 0
          const hasPrimary = sharedAllocations.some((item) => item.businessUnit === businessUnit);
          if (!hasPrimary) {
            sharedAllocations.push({ businessUnit, amount: 0 });
          }
          const totalShared = sharedAllocations.reduce((sum, item) => sum + item.amount, 0);
          if (totalShared > amount) {
            results.failed++;
            const message = 'Shared allocations exceed total amount';
            results.errors.push({
              row: i + 2,
              error: message,
              data: row,
            });
            console.warn(`[Bulk Upload] Row ${i + 2} failed. ${message}`);
            continue;
          }
          sharedAllocations = sharedAllocations.filter(
            (item) => item.businessUnit && !Number.isNaN(item.amount) && item.amount >= 0
          );
          isShared = sharedAllocations.length > 0;
        } else {
          sharedAllocations = [];
        }

        // Validate required fields
        const missing = [];
        if (!cardNumber) missing.push('Card Number');
        if (!cardAssignedTo) missing.push('Card Assigned To');
        if (!date) missing.push('Date');
        if (!particulars) missing.push('Particulars');
        if (Number.isNaN(amount)) missing.push('Amount');
        if (!businessUnit) missing.push('Business Unit');

        if (missing.length) {
          results.failed++;
          const message = `Missing required fields: ${missing.join(', ')}`;
          results.errors.push({
            row: i + 2, // Excel row number (1-indexed + header)
            error: message,
            data: row,
          });
          console.warn(`[Bulk Upload] Row ${i + 2} failed. ${message}`);
          continue;
        }

        // Validate enums after normalization
        const enumErrors = [];
        if (!typeOfService) enumErrors.push(`Type of Service (value: ${typeOfServiceRaw || 'empty'})`);
        if (!businessUnit) enumErrors.push(`Business Unit (value: ${businessUnitRaw || 'empty'})`);
        if (!costCenter) enumErrors.push(`Cost Center (value: ${costCenterRaw || 'empty'})`);
        if (!approvedBy) enumErrors.push(`Approved By (value: ${approvedByRaw || 'empty'})`);

        if (enumErrors.length) {
          results.failed++;
          const message = `Invalid enum: ${enumErrors.join(', ')}`;
          results.errors.push({
            row: i + 2,
            error: message,
            data: row,
          });
          console.warn(`[Bulk Upload] Row ${i + 2} failed. ${message}`);
          continue;
        }

        // Parse date
        const parsedDate = parseDateValue(date);

        if (!parsedDate || isNaN(parsedDate.getTime())) {
          results.failed++;
          const message = 'Invalid date';
          results.errors.push({
            row: i + 2,
            error: message,
            data: row,
          });
          console.warn(`[Bulk Upload] Row ${i + 2} failed. ${message}. Value: ${date}`);
          continue;
        }

        // Exchange rate handling: prefer provided XE, else fetch
        const providedRate = parseFloat(row['XE'] || row['xe'] || row['XE Rate'] || row['xeRate']);
        let rate = providedRate;
        if (!rate || Number.isNaN(rate)) {
          const converted = await convertToINR(amount, currency);
          rate = converted.rate;
        }
        // Amount in INR handling: prefer provided, else compute
        const providedInINR = parseFloat(
          row['Amt INR'] || row['Amount in INR'] || row['amountInINR'] || row['Amount (INR)']
        );
        const amountInINR =
          providedInINR && !Number.isNaN(providedInINR) ? providedInINR : amount * rate;

        // Calculate next renewal date
        let nextRenewalDate = null;
        if (recurring === 'Monthly') {
          nextRenewalDate = new Date(parsedDate);
          nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
        } else if (recurring === 'Yearly') {
          nextRenewalDate = new Date(parsedDate);
          nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);
        }

        // Check for duplicates
        const duplicateEntry = await ExpenseEntry.findOne({
          cardNumber,
          date: parsedDate,
          particulars,
          businessUnit,
          amount,
          currency,
        });

        // If duplicate, mark existing as merged and skip creating another row
        if (duplicateEntry) {
          results.merged++;
          if (duplicateEntry.duplicateStatus !== 'Merged') {
            duplicateEntry.duplicateStatus = 'Merged';
            await duplicateEntry.save();
          }
          results.success++;
        } else {
          results.unique++;

          await ExpenseEntry.create({
            cardNumber,
            cardAssignedTo,
            date: parsedDate,
            month: month || parsedDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
            status,
            particulars,
            narration: narration || particulars,
            currency,
            billStatus,
            amount,
            xeRate: rate,
            amountInINR,
            typeOfService,
            businessUnit,
            costCenter,
            approvedBy,
            serviceHandler,
            recurring,
            entryStatus: 'Accepted', // Bulk uploads are auto-approved
            duplicateStatus: 'Unique',
            createdBy: req.user._id,
            nextRenewalDate,
            isShared,
            sharedAllocations,
          });

          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          error: error.message,
          data: data[i],
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      message: 'Bulk upload completed',
      data: results,
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Download expense template
// @route   GET /api/expenses/template
// @access  Private (MIS, Super Admin)
export const downloadTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expense Template');
        worksheet.columns = [
          { header: 'Card Number', key: 'cardNumber', width: 15 },
          { header: 'Card Assigned To', key: 'cardAssignedTo', width: 20 },
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Month', key: 'month', width: 15 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Particulars', key: 'particulars', width: 25 },
          { header: 'Narration', key: 'narration', width: 25 },
          { header: 'Currency', key: 'currency', width: 10 },
          { header: 'Bill Status', key: 'billStatus', width: 15 },
          { header: 'Amount', key: 'amount', width: 12 },
          { header: 'Types of Tools or Service', key: 'typeOfService', width: 25 },
          { header: 'Business Unit', key: 'businessUnit', width: 15 },
          { header: 'Cost Center', key: 'costCenter', width: 15 },
          { header: 'Approved By', key: 'approvedBy', width: 15 },
          { header: 'Tool or Service Handler', key: 'serviceHandler', width: 25 },
          { header: 'Recurring/One-time', key: 'recurring', width: 18 },
          { header: 'Is Shared (Yes/No)', key: 'isShared', width: 18 },
          { header: 'Shared Bill (BU:Amount, ...)', key: 'sharedBill', width: 35 },
        ];

        worksheet.addRow({
          cardNumber: 'M003',
          cardAssignedTo: 'John Doe',
          date: '2025-01-05',
          month: 'Jan-2025',
          status: 'Active',
          particulars: 'ChatGPT',
          narration: 'ChatGPT Subscription',
          currency: 'USD',
          billStatus: '',
          amount: 200,
          typeOfService: 'Tool',
          businessUnit: 'Wytlabs',
          costCenter: 'Ops',
          approvedBy: 'Raghav',
          serviceHandler: 'Raghav',
          recurring: 'Yearly',
          isShared: 'Yes',
          sharedBill: 'Wytlabs: 200, Collabx: 100',
        });

        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader('Content-Disposition', 'attachment; filename=expense-template.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Export expense entries
// @route   GET /api/expenses/export
// @access  Private
export const exportExpenses = async (req, res) => {
  try {
    const {
      businessUnit,
      cardNumber,
      cardAssignedTo,
      status,
      month,
      typeOfService,
      serviceHandler,
      search,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      costCenter,
      approvedBy,
      recurring,
      limit,
      duplicateStatus,
      includeDuplicateStatus,
      disableStartDate,
      disableEndDate,
      isShared,
    } = req.query;

    let query = {};

    // Role-based filtering
    if (['business_unit_admin', 'spoc', 'service_handler'].includes(req.user.role)) {
      query.businessUnit = req.user.businessUnit;
    }

    if (req.user.role === 'service_handler') {
      const escapedName = req.user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tokens = req.user.name
        .split(' ')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const patternParts = [escapedName, ...tokens];
      const pattern = patternParts.join('|');
      query.serviceHandler = { $regex: pattern, $options: 'i' };
    }

    // Apply filters
    if (!['business_unit_admin', 'spoc', 'service_handler'].includes(req.user.role) && businessUnit) {
      query.businessUnit = businessUnit;
    }
    if (cardNumber) query.cardNumber = cardNumber;
    if (status) query.status = status;
    if (month) query.month = month;
    if (typeOfService) query.typeOfService = typeOfService;
    if (serviceHandler) applyMultiValueFilter(query, 'serviceHandler', serviceHandler);
    if (cardAssignedTo) applyMultiValueFilter(query, 'cardAssignedTo', cardAssignedTo);
    if (costCenter) query.costCenter = costCenter;
    if (approvedBy) query.approvedBy = approvedBy;
    if (recurring) query.recurring = recurring;
    if (isShared === 'true') query.isShared = true;
    if (isShared === 'false') query.isShared = false;
    if (duplicateStatus && ['Merged', 'Unique'].includes(duplicateStatus)) {
      query.duplicateStatus = duplicateStatus;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = parseFilterDate(startDate);
      if (endDate) query.date.$lte = parseFilterDate(endDate, true);
    }

    if (disableStartDate || disableEndDate) {
      const range = {};
      if (disableStartDate) range.$gte = parseFilterDate(disableStartDate);
      if (disableEndDate) range.$lte = parseFilterDate(disableEndDate, true);

      // Default to deactive if caller didn't choose a status
      if (!status) {
        query.status = 'Deactive';
      }

      // Match entries with disabledAt in range OR (legacy) updatedAt in range if deactivated
      const disableClauses = [];
      disableClauses.push({ disabledAt: range });
      disableClauses.push({ $and: [{ status: 'Deactive' }, { updatedAt: range }] });
      query.$or = query.$or ? [...query.$or, ...disableClauses] : disableClauses;
    }

    if (minAmount || maxAmount) {
      query.amountInINR = {};
      if (minAmount) query.amountInINR.$gte = parseFloat(minAmount);
      if (maxAmount) query.amountInINR.$lte = parseFloat(maxAmount);
    }

    if (search) {
      const searchClause = [
        { particulars: { $regex: search, $options: 'i' } },
        { narration: { $regex: search, $options: 'i' } },
        { cardNumber: { $regex: search, $options: 'i' } },
        { serviceHandler: { $regex: search, $options: 'i' } },
        { cardAssignedTo: { $regex: search, $options: 'i' } },
      ];
      query.$or = query.$or ? [...query.$or, ...searchClause] : searchClause;
    }

    // Match the visibility rules used for on-screen tables
    if (req.user.role !== 'spoc' && !(disableStartDate || disableEndDate)) {
      query.entryStatus = 'Accepted';
    }

    let expenseQuery = ExpenseEntry.find(query).sort({ date: -1 });

    if (limit) {
      expenseQuery = expenseQuery.limit(parseInt(limit));
    }

    const expenses = await expenseQuery;

    // Format data for export
    const shouldIncludeDuplicateColumn = includeDuplicateStatus === 'true';
    const formatShared = (expense) => {
      if (!expense.isShared || !expense.sharedAllocations || expense.sharedAllocations.length === 0) {
        return '';
      }
      return expense.sharedAllocations
        .filter((alloc) => alloc.businessUnit)
        .map((alloc) => `${alloc.businessUnit}: ${alloc.amount}`)
        .join(', ');
    };

    const exportData = expenses.map((expense) => ({
      cardNumber: expense.cardNumber,
      cardAssignedTo: expense.cardAssignedTo,
      date: expense.date ? new Date(expense.date).toLocaleDateString() : '',
      month: expense.month,
      status: expense.status,
      particulars: expense.particulars,
      narration: expense.narration,
      currency: expense.currency,
      billStatus: expense.billStatus,
      amount: expense.amount,
      xeRate: expense.xeRate,
      amountInINR: expense.amountInINR,
      typeOfService: expense.typeOfService,
      businessUnit: expense.businessUnit,
      costCenter: expense.costCenter,
      approvedBy: expense.approvedBy,
      serviceHandler: expense.serviceHandler,
      recurring: expense.recurring,
      disabledAt: expense.disabledAt ? new Date(expense.disabledAt).toLocaleDateString() : '',
      sharedBill: formatShared(expense),
      ...(shouldIncludeDuplicateColumn
        ? { duplicateStatus: expense.duplicateStatus || 'Unique' }
        : {}),
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expenses');

    const columns = [
      { header: 'Card Number', key: 'cardNumber', width: 15 },
      { header: 'Card Assigned To', key: 'cardAssignedTo', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Month', key: 'month', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Particulars', key: 'particulars', width: 25 },
      { header: 'Narration', key: 'narration', width: 25 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Bill Status', key: 'billStatus', width: 15 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'XE Rate', key: 'xeRate', width: 12 },
      { header: 'Amount in INR', key: 'amountInINR', width: 18 },
      { header: 'Types of Tools or Service', key: 'typeOfService', width: 25 },
      { header: 'Business Unit', key: 'businessUnit', width: 15 },
      { header: 'Cost Center', key: 'costCenter', width: 15 },
      { header: 'Approved By', key: 'approvedBy', width: 15 },
      { header: 'Service Handler', key: 'serviceHandler', width: 20 },
      { header: 'Recurring', key: 'recurring', width: 15 },
      { header: 'Disable Date', key: 'disabledAt', width: 18 },
      { header: 'Shared Bill', key: 'sharedBill', width: 30 },
    ];

    if (shouldIncludeDuplicateColumn) {
      columns.push({ header: 'Duplicate Status', key: 'duplicateStatus', width: 18 });
    }

    worksheet.columns = columns;

    exportData.forEach((item) => {
      worksheet.addRow(item);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `expenses-${Date.now()}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  bulkUploadExpenses,
  downloadTemplate,
  exportExpenses,
};
