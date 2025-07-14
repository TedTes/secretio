import Joi from 'joi';

// GitHub repository validation
export const scanRepositorySchema = Joi.object({
  owner: Joi.string()
    .alphanum()
    .min(1)
    .max(39)
    .required()
    .messages({
      'string.alphanum': 'Owner must contain only alphanumeric characters',
      'string.min': 'Owner must be at least 1 character long',
      'string.max': 'Owner must be at most 39 characters long',
      'any.required': 'Owner is required'
    }),
    
  repo: Joi.string()
    .pattern(/^[a-zA-Z0-9._-]+$/)
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.pattern.base': 'Repository name contains invalid characters',
      'string.min': 'Repository name must be at least 1 character long',
      'string.max': 'Repository name must be at most 100 characters long',
      'any.required': 'Repository name is required'
    }),
    
  branch: Joi.string()
    .pattern(/^[a-zA-Z0-9._/-]+$/)
    .min(1)
    .max(250)
    .optional()
    .messages({
      'string.pattern.base': 'Branch name contains invalid characters',
      'string.min': 'Branch name must be at least 1 character long',
      'string.max': 'Branch name must be at most 250 characters long'
    }),
    
  github_token: Joi.string()
    .pattern(/^(ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36})$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid GitHub token format'
    })
});

// Multiple repositories validation
export const scanMultipleSchema = Joi.object({
  repositories: Joi.array()
    .items(
      Joi.object({
        owner: Joi.string().alphanum().min(1).max(39).required(),
        repo: Joi.string().pattern(/^[a-zA-Z0-9._-]+$/).min(1).max(100).required(),
        branch: Joi.string().pattern(/^[a-zA-Z0-9._/-]+$/).min(1).max(250).optional()
      })
    )
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least 1 repository is required',
      'array.max': 'Maximum 10 repositories allowed per request'
    }),
    
  github_token: Joi.string()
    .pattern(/^(ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36})$/)
    .optional()
});

// Query parameter validation
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});