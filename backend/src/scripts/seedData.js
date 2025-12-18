import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import User from '../models/User.js';
import ExpenseEntry from '../models/ExpenseEntry.js';

const businessUnits = ['DWSG', 'Signature', 'Collabx', 'Wytlabs', 'Smegoweb'];

const defaultPassword = 'Password123!';

dotenv.config();

const buildMonthLabel = (date) => {
  return new Date(date).toLocaleString('default', { month: 'short', year: 'numeric' });
};

const seedUsers = () => {
  const users = [
    {
      name: 'Super Admin',
      email: 'superadmin@expensems.com',
      password: defaultPassword,
      role: 'super_admin',
    },
    {
      name: 'Maya Kapoor',
      email: 'mis.manager@expensems.com',
      password: defaultPassword,
      role: 'mis_manager',
    },
  ];

  businessUnits.forEach((unit) => {
    const slug = unit.toLowerCase();
    users.push(
      {
        name: `${unit} Admin`,
        email: `admin+${slug}@expensems.com`,
        password: defaultPassword,
        role: 'business_unit_admin',
        businessUnit: unit,
      },
      {
        name: `${unit} SPOC`,
        email: `spoc+${slug}@expensems.com`,
        password: defaultPassword,
        role: 'spoc',
        businessUnit: unit,
      },
      {
        name: `${unit} Handler`,
        email: `handler+${slug}@expensems.com`,
        password: defaultPassword,
        role: 'service_handler',
        businessUnit: unit,
      }
    );
  });

  return users;
};

const sampleExpenses = ({ usersByRole }) => {
  const serviceHandlers = Object.fromEntries(
    usersByRole
      .filter((u) => u.role === 'service_handler')
      .map((u) => [u.businessUnit, u])
  );

  const spocs = Object.fromEntries(
    usersByRole
      .filter((u) => u.role === 'spoc')
      .map((u) => [u.businessUnit, u])
  );

  const entries = [
    {
      cardNumber: 'M003',
      cardAssignedTo: 'John Doe',
      date: new Date('2025-01-05'),
      status: 'Active',
      particulars: 'ChatGPT',
      narration: 'ChatGPT subscription',
      currency: 'USD',
      amount: 200,
      typeOfService: 'Tool',
      businessUnit: 'Wytlabs',
      costCenter: 'Ops',
      approvedBy: 'Raghav',
      serviceHandlerUnit: 'Wytlabs',
      recurring: 'Yearly',
      duplicateStatus: 'Merged',
    },
    {
      cardNumber: 'C002',
      cardAssignedTo: 'Priya Shah',
      date: new Date('2025-02-10'),
      status: 'Active',
      particulars: 'Ahrefs',
      narration: 'SEO suite',
      currency: 'USD',
      amount: 500,
      typeOfService: 'Service',
      businessUnit: 'DWSG',
      costCenter: 'OH Exps',
      approvedBy: 'Tarun',
      serviceHandlerUnit: 'DWSG',
      recurring: 'One-time',
      duplicateStatus: 'Unique',
    },
    {
      cardNumber: 'C003',
      cardAssignedTo: 'Akash Verma',
      date: new Date('2025-03-12'),
      status: 'Declined',
      particulars: 'GoDaddy',
      narration: 'Hosting renewal',
      currency: 'USD',
      amount: 300,
      typeOfService: 'Hosting',
      businessUnit: 'Collabx',
      costCenter: 'Support',
      approvedBy: 'Yulia',
      serviceHandlerUnit: 'Collabx',
      recurring: 'Monthly',
      duplicateStatus: 'Merged',
    },
    {
      cardNumber: 'P101',
      cardAssignedTo: 'Leo Park',
      date: new Date('2025-01-22'),
      status: 'Active',
      particulars: 'ProxyMesh',
      narration: 'Proxy infra',
      currency: 'USD',
      amount: 150,
      typeOfService: 'Proxy',
      businessUnit: 'Signature',
      costCenter: 'FE',
      approvedBy: 'Marc',
      serviceHandlerUnit: 'Signature',
      recurring: 'Monthly',
      duplicateStatus: 'Unique',
    },
    {
      cardNumber: 'S455',
      cardAssignedTo: 'Nora Iyer',
      date: new Date('2025-04-02'),
      status: 'Active',
      particulars: 'Slack Enterprise',
      narration: 'Collaboration tools',
      currency: 'USD',
      amount: 800,
      typeOfService: 'Service',
      businessUnit: 'Smegoweb',
      costCenter: 'Management EXPS',
      approvedBy: 'Vaibhav',
      serviceHandlerUnit: 'Smegoweb',
      recurring: 'Monthly',
      duplicateStatus: 'Unique',
    },
  ];

  return entries.map((entry) => {
    const xeRate = entry.currency === 'USD' ? 83.5 : 83.5;
    const amountInINR = entry.amount * xeRate;
    const serviceHandler = serviceHandlers[entry.serviceHandlerUnit];
    const spoc = spocs[entry.businessUnit];

    let nextRenewalDate = null;
    if (entry.recurring === 'Monthly') {
      nextRenewalDate = new Date(entry.date);
      nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
    } else if (entry.recurring === 'Yearly') {
      nextRenewalDate = new Date(entry.date);
      nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);
    }

    return {
      ...entry,
      month: buildMonthLabel(entry.date),
      xeRate,
      amountInINR,
      serviceHandler: serviceHandler?.name || 'Unknown Handler',
      createdBy: spoc?._id,
      entryStatus: 'Accepted',
      nextRenewalDate,
    };
  });
};

const seedDatabase = async () => {
  try {
    await connectDB();

    await ExpenseEntry.deleteMany({});
    await User.deleteMany({});

    const users = await User.insertMany(seedUsers());

    const expenses = sampleExpenses({ usersByRole: users });
    await ExpenseEntry.insertMany(expenses);

    console.log('Database seeded successfully!');
    console.log('Login accounts:');
    console.log('- Super Admin: superadmin@expensems.com / Password123!');
    console.log('- MIS Manager: mis.manager@expensems.com / Password123!');
    businessUnits.forEach((unit) => {
      const slug = unit.toLowerCase();
      console.log(`- ${unit} Admin: admin+${slug}@expensems.com / Password123!`);
      console.log(`- ${unit} SPOC: spoc+${slug}@expensems.com / Password123!`);
      console.log(`- ${unit} Handler: handler+${slug}@expensems.com / Password123!`);
    });
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seedDatabase();
