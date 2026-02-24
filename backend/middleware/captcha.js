const axios = require('axios');

/**
 * Middleware to verify Google reCAPTCHA v3 token.
 * Expects `captchaToken` in req.body.
 * - Skips verification in test environment.
 * - In development, logs failures but still allows the request through
 *   (Google reCAPTCHA keys often aren't configured for localhost).
 * - In production, strictly enforces verification.
 */
const verifyCaptcha = async (req, res, next) => {
  // Skip captcha in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn('RECAPTCHA_SECRET_KEY not set — skipping captcha verification');
    return next();
  }

  const isDev = process.env.NODE_ENV !== 'production';
  const { captchaToken } = req.body;

  if (!captchaToken) {
    if (isDev) {
      console.warn('No captchaToken provided — allowing in development mode');
      return next();
    }
    return res.status(400).json({
      message: 'Please complete the CAPTCHA verification',
    });
  }

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret,
          response: captchaToken,
        },
      }
    );

    if (!response.data.success) {
      console.warn('CAPTCHA verification failed:', response.data['error-codes']);
      if (isDev) {
        console.warn('Allowing request despite CAPTCHA failure (development mode)');
        return next();
      }
      return res.status(400).json({
        message: 'CAPTCHA verification failed. Please try again.',
      });
    }

    // For v3, log the score (0.0 = likely bot, 1.0 = likely human)
    if (response.data.score !== undefined) {
      console.log(`reCAPTCHA v3 score: ${response.data.score}, action: ${response.data.action}`);
      // In production, reject low scores (likely bots)
      if (!isDev && response.data.score < 0.3) {
        return res.status(400).json({
          message: 'Suspicious activity detected. Please try again.',
        });
      }
    }

    next();
  } catch (error) {
    console.error('CAPTCHA verification error:', error.message);
    if (isDev) {
      console.warn('Allowing request despite CAPTCHA error (development mode)');
      return next();
    }
    return res.status(500).json({
      message: 'Unable to verify CAPTCHA. Please try again later.',
    });
  }
};

module.exports = { verifyCaptcha };
