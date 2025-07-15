'use client'

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import OAuthButtons from './OAuthButtons';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
  const { register, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    github_username: '',
  });
  const [validationError, setValidationError] = useState('');

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }
    
    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      return false;
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(formData.password)) {
      setValidationError('Password must contain uppercase, lowercase, and number');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await register({
        email: formData.email,
        password: formData.password,
        github_username: formData.github_username || undefined,
      });
      onClose();
      // Reset form
      setFormData({ email: '', password: '', confirmPassword: '', github_username: '' });
      setValidationError('');
    } catch (error) {
      // Error is handled by AuthContext
    }
  };

  const handleClose = () => {
    clearError();
    setValidationError('');
    setFormData({ email: '', password: '', confirmPassword: '', github_username: '' });
    onClose();
  };

  const displayError = error || validationError;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {displayError && (
          <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3 text-red-400 text-sm">
            {displayError}
          </div>
        )}
        
        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <input
            type="email"
            id="reg-email"
            required
            className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>
        
        <div>
          <label htmlFor="github-username" className="block text-sm font-medium text-gray-300 mb-2">
            GitHub Username (Optional)
          </label>
          <input
            type="text"
            id="github-username"
            className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your GitHub username"
            value={formData.github_username}
            onChange={(e) => setFormData(prev => ({ ...prev, github_username: e.target.value }))}
          />
        </div>
        
        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <input
            type="password"
            id="reg-password"
            required
            className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">
            Must be 8+ characters with uppercase, lowercase, and number
          </p>
        </div>
        
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirm-password"
            required
            className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
          />
        </div>
        
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoading}
          className="w-full"
        >
          Create Account
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-900 text-gray-400">Or continue with</span>
          </div>
        </div>
        
        <OAuthButtons />
        
        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            Already have an account? Sign in
          </button>
        </div>
      </form>
    </Modal>
  );
}