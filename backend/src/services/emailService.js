import nodemailer from 'nodemailer';

// Create transporter (Gmail app-password friendly)
const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

// Send expense entry approval email to Business Unit Admin
export const sendApprovalEmail = async (adminEmail, entryDetails, approvalToken) => {
  const transporter = createTransporter();

  const backendBase = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
  const approveUrl = `${backendBase}/api/expenses/approve/${approvalToken}`;
  const rejectUrl = `${backendBase}/api/expenses/reject/${approvalToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9fafb; padding: 20px; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; color: #6b7280; }
        .detail-value { color: #111827; }
        .button-container { text-align: center; margin: 30px 0; }
        .button { display: inline-block; padding: 12px 30px; margin: 0 10px; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .approve-btn { background-color: #10b981; color: white; }
        .reject-btn { background-color: #ef4444; color: white; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Expense Entry Approval Required</h1>
        </div>
        <div class="content">
          <p>Dear Business Unit Admin,</p>
          <p>A new expense entry has been submitted by your SPOC and requires your approval.</p>
          
          <div class="details">
            <h3>Expense Entry Details:</h3>
            <div class="detail-row">
              <span class="detail-label">Card Number:</span>
              <span class="detail-value">${entryDetails.cardNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Card Assigned To:</span>
              <span class="detail-value">${entryDetails.cardAssignedTo}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${new Date(entryDetails.date).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Service/Tool:</span>
              <span class="detail-value">${entryDetails.particulars}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value">${entryDetails.amount} ${entryDetails.currency}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount in INR:</span>
              <span class="detail-value">INR ${entryDetails.amountInINR.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Business Unit:</span>
              <span class="detail-value">${entryDetails.businessUnit}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Type of Service:</span>
              <span class="detail-value">${entryDetails.typeOfService}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Service Handler:</span>
              <span class="detail-value">${entryDetails.serviceHandler}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Recurring:</span>
              <span class="detail-value">${entryDetails.recurring}</span>
            </div>
          </div>

          <div class="button-container">
            <a href="${approveUrl}" class="button approve-btn">Approve Entry</a>
            <a href="${rejectUrl}" class="button reject-btn">Reject Entry</a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            Click the appropriate button above to approve or reject this expense entry.
          </p>
        </div>
        <div class="footer">
          <p>This is an automated email from Expense Management System. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: adminEmail,
    subject: `Expense Entry Approval Required - ${entryDetails.particulars}`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Approval email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending approval email:', error);
    return false;
  }
};

// Inform BU Admin of a SPOC entry (no approval required)
export const sendBUEntryNoticeEmail = async (adminEmail, entryDetails, spocName) => {
  const transporter = createTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0f172a; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9fafb; padding: 20px; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; color: #6b7280; }
        .detail-value { color: #111827; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Expense Logged by SPOC</h1>
        </div>
        <div class="content">
          <p>Dear Business Unit Admin,</p>
          <p>${spocName || 'Your SPOC'} has logged a new expense entry. No approval is required; this item is already active in the sheet.</p>
          
          <div class="details">
            <h3>Entry Details:</h3>
            <div class="detail-row">
              <span class="detail-label">Submitted By:</span>
              <span class="detail-value">${spocName || 'SPOC'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Card Number:</span>
              <span class="detail-value">${entryDetails.cardNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Card Assigned To:</span>
              <span class="detail-value">${entryDetails.cardAssignedTo}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${new Date(entryDetails.date).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Service/Tool:</span>
              <span class="detail-value">${entryDetails.particulars}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value">${entryDetails.amount} ${entryDetails.currency}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount in INR:</span>
              <span class="detail-value">INR ${entryDetails.amountInINR.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Business Unit:</span>
              <span class="detail-value">${entryDetails.businessUnit}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Recurring:</span>
              <span class="detail-value">${entryDetails.recurring}</span>
            </div>
          </div>

          <p style="margin-top: 10px;">If anything looks off, please coordinate with MIS.</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from the Expense Management Ecosystem.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: adminEmail,
    subject: 'New Expense Logged by SPOC (Info Only)',
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending BU entry notice email:', error);
    return false;
  }
};

// Send notification to MIS Manager when entry is approved
export const sendMISNotificationEmail = async (misEmail, entryDetails, spocName) => {
  const transporter = createTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9fafb; padding: 20px; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; color: #6b7280; }
        .detail-value { color: #111827; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Expense Entry Added to Global Sheet</h1>
        </div>
        <div class="content">
          <p>Dear MIS Manager,</p>
          <p>A new expense entry has been approved and added to the global expense sheet.</p>
          
          <div class="details">
            <h3>Entry Details:</h3>
            <div class="detail-row">
              <span class="detail-label">Submitted By:</span>
              <span class="detail-value">${spocName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Business Unit:</span>
              <span class="detail-value">${entryDetails.businessUnit}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Card Number:</span>
              <span class="detail-value">${entryDetails.cardNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Service/Tool:</span>
              <span class="detail-value">${entryDetails.particulars}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${new Date(entryDetails.date).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value">${entryDetails.amount} ${entryDetails.currency} (INR ${entryDetails.amountInINR.toFixed(2)})</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Service Handler:</span>
              <span class="detail-value">${entryDetails.serviceHandler}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Recurring:</span>
              <span class="detail-value">${entryDetails.recurring}</span>
            </div>
          </div>

          <p>Please review this entry in the global expense sheet for any discrepancies.</p>
        </div>
        <div class="footer">
          <p>This is an automated email from Expense Management System. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: misEmail,
    subject: `New Expense Entry - ${entryDetails.businessUnit} - ${entryDetails.particulars}`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('MIS notification email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending MIS notification email:', error);
    return false;
  }
};

// Send renewal reminder to Service Handler
export const sendRenewalReminderEmail = async (handlerEmail, serviceDetails) => {
  const transporter = createTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9fafb; padding: 20px; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; color: #6b7280; }
        .detail-value { color: #111827; }
        .warning { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Service Renewal Reminder</h1>
        </div>
        <div class="content">
          <p>Dear Service Handler,</p>
          
          <div class="warning">
            <strong>Important:</strong> Your subscription for the following service is due for renewal in 5 days.
          </div>
          
          <div class="details">
            <h3>Service Details:</h3>
            <div class="detail-row">
              <span class="detail-label">Service/Tool:</span>
              <span class="detail-value">${serviceDetails.particulars}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Business Unit:</span>
              <span class="detail-value">${serviceDetails.businessUnit}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value">${serviceDetails.amount} ${serviceDetails.currency}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Renewal Date:</span>
              <span class="detail-value">${new Date(serviceDetails.nextRenewalDate).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Recurring:</span>
              <span class="detail-value">${serviceDetails.recurring}</span>
            </div>
          </div>

          <p><strong>Action Required:</strong></p>
          <p>Please log in to your dashboard and confirm whether you want to continue with this service or cancel it.</p>
          <p>If you wish to cancel, please ensure you cancel the subscription manually before clicking the disable button in your dashboard.</p>
        </div>
        <div class="footer">
          <p>This is an automated email from Expense Management System. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: handlerEmail,
    subject: `Service Renewal Reminder - ${serviceDetails.particulars}`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Renewal reminder email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending renewal reminder email:', error);
    return false;
  }
};

// Send auto-cancellation notice due to no response
export const sendAutoCancellationNoticeEmail = async (recipientEmail, serviceDetails, daysBefore = 2) => {
  const transporter = createTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 640px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ef4444; color: white; padding: 16px; text-align: center; }
        .content { background-color: #f9fafb; padding: 20px; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; color: #6b7280; }
        .detail-value { color: #111827; }
        .warning { background-color: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>No Response Received - Auto Cancellation Notice</h2>
        </div>
        <div class="content">
          <p>We did not receive a response to the renewal reminder for the service below. As the renewal is in ${daysBefore} days, please disable/cancel this subscription.</p>
          <div class="warning">
            <strong>Action Required:</strong> Cancel/disable this service before renewal to avoid charges.
          </div>
          <div class="details">
            <h3>Service Details</h3>
            <div class="detail-row"><span class="detail-label">Service/Tool:</span><span class="detail-value">${serviceDetails.particulars}</span></div>
            <div class="detail-row"><span class="detail-label">Business Unit:</span><span class="detail-value">${serviceDetails.businessUnit}</span></div>
            <div class="detail-row"><span class="detail-label">Service Handler:</span><span class="detail-value">${serviceDetails.serviceHandler}</span></div>
            <div class="detail-row"><span class="detail-label">Purchase Date:</span><span class="detail-value">${new Date(serviceDetails.date).toLocaleDateString()}</span></div>
            <div class="detail-row"><span class="detail-label">Next Renewal Date:</span><span class="detail-value">${serviceDetails.nextRenewalDate ? new Date(serviceDetails.nextRenewalDate).toLocaleDateString() : 'N/A'}</span></div>
            <div class="detail-row"><span class="detail-label">Amount:</span><span class="detail-value">${serviceDetails.amount} ${serviceDetails.currency}</span></div>
            <div class="detail-row"><span class="detail-label">Recurring:</span><span class="detail-value">${serviceDetails.recurring}</span></div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: recipientEmail,
    subject: `Auto Cancellation Notice - ${serviceDetails.particulars}`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Auto-cancellation notice sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending auto-cancellation notice:', error);
    return false;
  }
};

// Send service cancellation notification to MIS
export const sendCancellationNotificationEmail = async (misEmail, serviceDetails, reason) => {
  const transporter = createTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9fafb; padding: 20px; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; color: #6b7280; }
        .detail-value { color: #111827; }
        .reason-box { background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Service Cancellation Request</h1>
        </div>
        <div class="content">
          <p>Dear MIS Manager,</p>
          <p>A service handler has requested to cancel the following service subscription:</p>
          
          <div class="details">
            <h3>Service Details:</h3>
            <div class="detail-row">
              <span class="detail-label">Service/Tool:</span>
              <span class="detail-value">${serviceDetails.particulars}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Business Unit:</span>
              <span class="detail-value">${serviceDetails.businessUnit}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Service Handler:</span>
              <span class="detail-value">${serviceDetails.serviceHandler}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Card Number:</span>
              <span class="detail-value">${serviceDetails.cardNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Purchase Date:</span>
              <span class="detail-value">${new Date(serviceDetails.date).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value">${serviceDetails.amount} ${serviceDetails.currency}</span>
            </div>
          </div>

          <div class="reason-box">
            <h4>Cancellation Reason:</h4>
            <p>${reason || 'No reason provided'}</p>
          </div>

          <p><strong>Action Required:</strong></p>
          <p>Please update the status of this service to "Deactive" in the global expense sheet.</p>
        </div>
        <div class="footer">
          <p>This is an automated email from Expense Management System. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: misEmail,
    subject: `Service Cancellation Request - ${serviceDetails.particulars}`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Cancellation notification email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending cancellation notification email:', error);
    return false;
  }
};

export default {
  sendApprovalEmail,
  sendBUEntryNoticeEmail,
  sendMISNotificationEmail,
  sendRenewalReminderEmail,
  sendCancellationNotificationEmail,
};
