import Joi from 'joi';

// Password validation helper
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must be at most 128 characters long',
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
    'any.required': 'Password is required'
  });

// Email validation helper
const emailSchema = Joi.string()
  .email({ tlds: { allow: false } })
  .max(254)
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'string.max': 'Email must be at most 254 characters long',
    'any.required': 'Email is required'
  });

// Login schema
export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string()
    .min(1)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password is required',
      'string.max': 'Password is too long',
      'any.required': 'Password is required'
    })
});

// Registration schema
export const registerSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  github_username: Joi.string()
    .alphanum()
    .min(1)
    .max(39)
    .optional()
    .messages({
      'string.alphanum': 'GitHub username must contain only alphanumeric characters',
      'string.min': 'GitHub username must be at least 1 character long',
      'string.max': 'GitHub username must be at most 39 characters long'
    })
});

// Refresh token schema
export const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

// Reset password schema
export const resetPasswordSchema = Joi.object({
  email: emailSchema
});

// Change password schema
export const changePasswordSchema = Joi.object({
  current_password: Joi.string()
    .min(1)
    .max(128)
    .required()
    .messages({
      'string.min': 'Current password is required',
      'string.max': 'Current password is too long',
      'any.required': 'Current password is required'
    }),
  new_password: passwordSchema
});

// Update profile schema
export const updateProfileSchema = Joi.object({
  github_username: Joi.string()
    .alphanum()
    .min(1)
    .max(39)
    .optional()
    .allow(null, '')
    .messages({
      'string.alphanum': 'GitHub username must contain only alphanumeric characters',
      'string.min': 'GitHub username must be at least 1 character long',
      'string.max': 'GitHub username must be at most 39 characters long'
    }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(254)
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email must be at most 254 characters long'
    })
});

// OAuth callback schema
export const oauthCallbackSchema = Joi.object({
  code: Joi.string()
    .required()
    .messages({
      'any.required': 'Authorization code is required'
    }),
  state: Joi.string()
    .optional(),
  provider: Joi.string()
    .valid('google', 'github')
    .required()
    .messages({
      'any.only': 'Provider must be either google or github',
      'any.required': 'Provider is required'
    })
});

// OAuth URL request schema
export const oauthUrlSchema = Joi.object({
  redirect_url: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Redirect URL must be a valid URI'
    })
});

// Session validation schema
export const sessionValidationSchema = Joi.object({
  access_token: Joi.string()
    .required()
    .messages({
      'any.required': 'Access token is required'
    })
});

// User role update schema (admin only)
export const updateUserRoleSchema = Joi.object({
  user_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required'
    }),
  role: Joi.string()
    .valid('user', 'admin')
    .required()
    .messages({
      'any.only': 'Role must be either user or admin',
      'any.required': 'Role is required'
    })
});

// Verify email schema
export const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Verification token is required'
    }),
  type: Joi.string()
    .valid('signup', 'email_change', 'recovery')
    .required()
    .messages({
      'any.only': 'Type must be signup, email_change, or recovery',
      'any.required': 'Verification type is required'
    })
});

// Resend verification email schema
export const resendVerificationSchema = Joi.object({
  email: emailSchema,
  type: Joi.string()
    .valid('signup', 'email_change')
    .default('signup')
    .messages({
      'any.only': 'Type must be signup or email_change'
    })
});