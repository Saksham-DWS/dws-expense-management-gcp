import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';

// @desc    Check if a Super Admin already exists
// @route   GET /api/auth/bootstrap-status
// @access  Public
export const getBootstrapStatus = async (req, res) => {
  try {
    const superAdminExists = await User.exists({ role: 'super_admin' });

    res.status(200).json({
      success: true,
      data: {
        hasSuperAdmin: Boolean(superAdminExists),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bootstrap the very first Super Admin
// @route   POST /api/auth/bootstrap-super-admin
// @access  Public (guarded by setup key)
export const bootstrapSuperAdmin = async (req, res) => {
  try {
    const { name, email, password, setupKey } = req.body;

    if (!process.env.SUPER_ADMIN_SETUP_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Server misconfiguration: SUPER_ADMIN_SETUP_KEY missing',
      });
    }

    if (!name || !email || !password || !setupKey) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password and setup key are required',
      });
    }

    if (setupKey !== process.env.SUPER_ADMIN_SETUP_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Invalid setup key',
      });
    }

    const superAdminExists = await User.exists({ role: 'super_admin' });
    if (superAdminExists) {
      return res.status(400).json({
        success: false,
        message: 'A Super Admin already exists. Please use the login page.',
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A user already exists with this email',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'super_admin',
    });

    res.status(201).json({
      success: true,
      message: 'Super Admin account created successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Alias endpoint for initial Super Admin signup (same logic as bootstrap)
export const superAdminSignup = bootstrapSuperAdmin;

// @desc    Register user
// @route   POST /api/auth/register
// @access  Private (Super Admin, Business Unit Admin)
export const register = async (req, res) => {
  try {
    const { name, email, password, role, businessUnit, cardNumber } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Validate role-based permissions
    const currentUserRole = req.user.role;
    
    // Super Admin can create any user
    // Business Unit Admin can only create SPOC and Service Handler for their business unit
    if (currentUserRole === 'business_unit_admin') {
      if (!['spoc', 'service_handler'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Business Unit Admin can only create SPOC and Service Handler accounts',
        });
      }
      
      if (businessUnit !== req.user.businessUnit) {
        return res.status(403).json({
          success: false,
          message: 'You can only create users for your own business unit',
        });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      businessUnit: businessUnit || null,
      cardNumber: cardNumber || null,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessUnit: user.businessUnit,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password, role: requestedRole } = req.body;
    const roleLabel = {
      super_admin: 'Super Admin',
      mis_manager: 'MIS Manager',
      business_unit_admin: 'BU Admin',
      spoc: 'SPOC',
      service_handler: 'Service Handler',
    };

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    if (!requestedRole) {
      return res.status(400).json({
        success: false,
        message: 'Please select your role to sign in.',
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Enforce role match with the selected role
    if (requestedRole && user.role !== requestedRole) {
      return res.status(401).json({
        success: false,
        message: `This account belongs to ${roleLabel[user.role] || 'another role'}. Please choose ${roleLabel[user.role] || 'the correct role'} from the role selector.`,
      });
    }

    // Create token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessUnit: user.businessUnit,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all users (filtered by role)
// @route   GET /api/auth/users
// @access  Private (Super Admin, Business Unit Admin)
export const getUsers = async (req, res) => {
  try {
    let query = {};

    // Business Unit Admin can only see users from their business unit
    if (req.user.role === 'business_unit_admin') {
      query.businessUnit = req.user.businessUnit;
    }

    const users = await User.find(query).select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user
// @route   PUT /api/auth/users/:id
// @access  Private (Super Admin)
export const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private (Super Admin)
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update current user's profile (name/email) and password
// @route   PUT /api/auth/me
// @access  Private
export const updateMe = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Enforce unique email if changed
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A user already exists with this email',
        });
      }
      user.email = email;
    }

    if (name) {
      user.name = name;
    }

    // Handle password change
    if (newPassword || currentPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current and new password are required to change password',
        });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }
      user.password = newPassword;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessUnit: user.businessUnit,
        cardNumber: user.cardNumber,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  getBootstrapStatus,
  bootstrapSuperAdmin,
  superAdminSignup,
  register,
  login,
  getMe,
  updateMe,
  getUsers,
  updateUser,
  deleteUser,
};
