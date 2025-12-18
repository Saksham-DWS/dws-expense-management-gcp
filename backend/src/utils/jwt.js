import jwt from 'jsonwebtoken';

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const generateApprovalToken = (entryId) => {
  return jwt.sign({ entryId, type: 'approval' }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};
