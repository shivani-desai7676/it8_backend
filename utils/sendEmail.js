// utils/sendEmail.js
const sendEmail = async (email, otp) => {
  console.log(`OTP for ${email}: ${otp}`);
  return otp; // optional, useful for debugging
};

module.exports = sendEmail;
