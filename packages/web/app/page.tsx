'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './contexts/AuthContext';
import LoginModal from './components/auth/LoginModal';
import RegisterModal from './components/auth/RegisterModal';
import UserMenu from './components/auth/UserMenu';

export default function Home() {
  const [scanStatus, setScanStatus] = useState('')
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [currentDemo, setCurrentDemo] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);
  
  const { isAuthenticated, isLoading} = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Demo cycling animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Demo switching
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDemo(prev => (prev + 1) % 3);
      setAnimationPhase(0);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>;
  }
  if (isAuthenticated) {
    return null; // Will redirect
  }
  
  const handleScanClick = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setScanStatus('Installing CLI...')
    setTimeout(() => {
      setScanStatus('CLI Installed! Run: secretio scan')
    }, 2000)
  }

  const demoTitles = ['Scan Results', 'Dashboard Overview', 'Vault Storage'];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-slate-900/90 backdrop-blur-md border-b border-gray-800 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => router.push(isAuthenticated ? '/dashboard' : '/')} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd"></path>
                </svg>
              </div>
              <span className="text-xl font-bold">secretio</span>
            </button>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#docs" className="text-gray-300 hover:text-white transition-colors">Docs</a>
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <button onClick={() => router.push("/login")} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
                  Get Started
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center bg-red-600/10 border border-red-600/20 rounded-full px-4 py-2 mb-8">
            <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
            </svg>
            <span className="text-red-500 text-sm font-medium">API keys exposed in repos daily</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Find exposed<br/>
            <span className="text-blue-500">API keys</span> in your code
          </h1>
          
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Scan your repositories for exposed credentials. 
            Detect API keys from Stripe, AWS, OpenAI, and other services scattered across your codebase.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button 
              onClick={handleScanClick}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105"
            >
              {scanStatus || 'Try Live Demo'}
            </button>
            <button 
              onClick={() => isAuthenticated ? window.location.href = '/dashboard' : router.push('/login')}
              className="border border-gray-600 hover:border-gray-400 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              Start Clean
            </button>
          </div>

      

          {/* Demo Container */}
          <div>
  <div className="mb-8">
    <div className="text-center mb-4">
      <div className="inline-flex items-center space-x-8">
        {demoTitles.map((title, index) => (
          <div
            key={index}
            className={`relative px-2 py-1 text-sm transition-all duration-500 cursor-default ${
              currentDemo === index 
                ? 'text-white' 
                : 'text-gray-400'
            }`}
          >
            {title}
            {currentDemo === index && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 rounded transition-all duration-500"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>

  <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 max-w-5xl mx-auto text-left overflow-hidden" style={{minHeight: '500px'}}>
    <div className="relative h-full">
      
      {/* Demo 1: Scan Results */}
      <div className={`absolute inset-0 transition-all duration-700 ease-in-out transform ${
        currentDemo === 0 
          ? 'translate-y-0 opacity-100' 
          : currentDemo < 0 
            ? 'translate-y-full opacity-0' 
            : '-translate-y-full opacity-0'
      }`}>
        <div className="h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="flex space-x-2 mr-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <span className="text-gray-400 text-sm">myproject/frontend-app</span>
            </div>
            <div className={`px-2 py-1 text-xs rounded transition-all duration-1000 ${
              animationPhase >= 2 
                ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
            }`}>
              {animationPhase >= 2 ? 'COMPLETED' : 'SCANNING...'}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 rounded p-3 text-center">
              <div className={`text-xl font-bold text-red-400 transition-all duration-1000 ${
                animationPhase >= 1 ? 'scale-110' : ''
              }`}>
                {animationPhase >= 1 ? '3' : '0'}
              </div>
              <div className="text-xs text-gray-400">Keys Found</div>
            </div>
            <div className="bg-slate-800 rounded p-3 text-center">
              <div className={`text-xl font-bold text-blue-400 transition-all duration-1000 ${
                animationPhase >= 1 ? 'scale-110' : ''
              }`}>
                {animationPhase >= 1 ? '47' : '0'}
              </div>
              <div className="text-xs text-gray-400">Files Scanned</div>
            </div>
            <div className="bg-slate-800 rounded p-3 text-center">
              <div className={`text-xl font-bold text-yellow-400 transition-all duration-1000 ${
                animationPhase >= 1 ? 'scale-110' : ''
              }`}>
                {animationPhase >= 1 ? '2' : '0'}
              </div>
              <div className="text-xs text-gray-400">High Severity</div>
            </div>
            <div className="bg-slate-800 rounded p-3 text-center">
              <div className={`text-xl font-bold text-green-400 transition-all duration-1000 ${
                animationPhase >= 2 ? 'scale-110' : ''
              }`}>
                {animationPhase >= 2 ? '1.2s' : '...'}
              </div>
              <div className="text-xs text-gray-400">Scan Time</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className={`bg-red-900/30 border border-red-500/50 rounded p-4 transition-all duration-1000 transform ${
              animationPhase >= 1 ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="bg-red-500 text-white px-2 py-1 text-xs rounded font-bold">HIGH</span>
                  <span className="text-white font-mono text-sm">src/config/payments.js</span>
                  <span className="text-red-400 text-xs">Line 12</span>
                </div>
                <span className={`text-blue-400 px-3 py-1 text-xs rounded border border-blue-500/30 cursor-default ${
                  animationPhase >= 3 ? 'opacity-100' : 'opacity-60'
                }`}>
                  Store in Vault
                </span>
              </div>
              <div className="text-xs text-gray-300 mb-2">Stripe Secret Key detected</div>
              <div className="font-mono text-xs bg-black/30 p-2 rounded text-red-300">sk_live_51H***************</div>
            </div>
            
            <div className={`bg-red-900/30 border border-red-500/50 rounded p-4 transition-all duration-1000 delay-300 transform ${
              animationPhase >= 1 ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="bg-red-500 text-white px-2 py-1 text-xs rounded font-bold">HIGH</span>
                  <span className="text-white font-mono text-sm">config/aws.json</span>
                  <span className="text-red-400 text-xs">Line 3</span>
                </div>
                <span className={`text-blue-400 px-3 py-1 text-xs rounded border border-blue-500/30 cursor-default ${
                  animationPhase >= 3 ? 'opacity-100' : 'opacity-60'
                }`}>
                  Store in Vault
                </span>
              </div>
              <div className="text-xs text-gray-300 mb-2">AWS Access Key detected</div>
              <div className="font-mono text-xs bg-black/30 p-2 rounded text-red-300">AKIA***************</div>
            </div>
            
            <div className={`bg-yellow-900/30 border border-yellow-500/50 rounded p-4 transition-all duration-1000 delay-500 transform ${
              animationPhase >= 1 ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="bg-yellow-500 text-black px-2 py-1 text-xs rounded font-bold">MED</span>
                  <span className="text-white font-mono text-sm">README.md</span>
                  <span className="text-yellow-400 text-xs">Line 23</span>
                </div>
                <span className="text-gray-500 px-3 py-1 text-xs rounded border border-gray-600/30 cursor-default opacity-60">
                  Ignore
                </span>
              </div>
              <div className="text-xs text-gray-300 mb-2">OpenAI API Key in documentation</div>
              <div className="font-mono text-xs bg-black/30 p-2 rounded text-yellow-300">sk-proj-***************</div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo 2: Dashboard */}
      <div className={`absolute inset-0 transition-all duration-700 ease-in-out transform ${
        currentDemo === 1 
          ? 'translate-y-0 opacity-100' 
          : currentDemo < 1 
            ? 'translate-y-full opacity-0' 
            : '-translate-y-full opacity-0'
      }`}>
        <div className="h-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Dashboard Overview</h3>
            <div className="flex items-center space-x-2">
              <span className="text-blue-400 px-3 py-1 rounded text-sm border border-blue-500/30 cursor-default opacity-60">
                New Scan
              </span>
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                <span className="text-sm">JD</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 rounded p-4 text-center">
              <div className={`text-2xl font-bold text-blue-400 transition-all duration-1000 ${
                animationPhase >= 1 ? 'scale-110' : ''
              }`}>
                {animationPhase >= 1 ? (animationPhase >= 2 ? '13' : '12') : '11'}
              </div>
              <div className="text-sm text-gray-400">Total Scans</div>
            </div>
            <div className="bg-slate-800 rounded p-4 text-center">
              <div className={`text-2xl font-bold text-red-400 transition-all duration-1000 ${
                animationPhase >= 1 ? 'scale-110' : ''
              }`}>
                {animationPhase >= 1 ? (animationPhase >= 2 ? '26' : '23') : '20'}
              </div>
              <div className="text-sm text-gray-400">Keys Found</div>
            </div>
            <div className="bg-slate-800 rounded p-4 text-center">
              <div className={`text-2xl font-bold text-green-400 transition-all duration-1000 ${
                animationPhase >= 1 ? 'scale-110' : ''
              }`}>
                {animationPhase >= 1 ? (animationPhase >= 2 ? '894' : '847') : '803'}
              </div>
              <div className="text-sm text-gray-400">Files Scanned</div>
            </div>
            <div className="bg-slate-800 rounded p-4 text-center">
              <div className={`text-2xl font-bold text-purple-400 transition-all duration-1000 ${
                animationPhase >= 2 ? 'scale-110' : ''
              }`}>
                {animationPhase >= 2 ? '89%' : '85%'}
              </div>
              <div className="text-sm text-gray-400">Security Score</div>
            </div>
          </div>
          
          <div className="space-y-2">
            {animationPhase >= 1 && (
              <div className={`flex items-center justify-between bg-slate-800 rounded p-3 transition-all duration-500 transform ${
                animationPhase >= 1 ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
              }`}>
                <div className="flex items-center space-x-3">
                  <span className="text-gray-300">new-feature-branch</span>
                  <span className="text-xs text-gray-500">2 min ago</span>
                  <span className={`px-2 py-1 text-xs rounded transition-all duration-1000 ${
                    animationPhase >= 2 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {animationPhase >= 2 ? 'COMPLETED' : 'SCANNING'}
                  </span>
                </div>
                <span className={`px-2 py-1 text-xs rounded transition-all duration-1000 ${
                  animationPhase >= 2 ? 'bg-red-600/20 text-red-400' : 'bg-gray-600/20 text-gray-400'
                }`}>
                  {animationPhase >= 2 ? '3 keys' : '...'}
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between bg-slate-800 rounded p-3">
              <div className="flex items-center space-x-3">
                <span className="text-gray-300">frontend-app</span>
                <span className="text-xs text-gray-500">2 hours ago</span>
              </div>
              <span className="bg-red-600/20 text-red-400 px-2 py-1 text-xs rounded">3 keys</span>
            </div>
            <div className="flex items-center justify-between bg-slate-800 rounded p-3">
              <div className="flex items-center space-x-3">
                <span className="text-gray-300">api-server</span>
                <span className="text-xs text-gray-500">1 day ago</span>
              </div>
              <span className="bg-yellow-600/20 text-yellow-400 px-2 py-1 text-xs rounded">1 key</span>
            </div>
            <div className="flex items-center justify-between bg-slate-800 rounded p-3">
              <div className="flex items-center space-x-3">
                <span className="text-gray-300">mobile-app</span>
                <span className="text-xs text-gray-500">3 days ago</span>
              </div>
              <span className="bg-green-600/20 text-green-400 px-2 py-1 text-xs rounded">0 keys</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo 2: Dashboard Overview */}
      <div className={`absolute inset-0 transition-all duration-700 ease-in-out transform ${
        currentDemo === 1 
          ? 'translate-y-0 opacity-100' 
          : currentDemo < 1 
            ? 'translate-y-full opacity-0' 
            : '-translate-y-full opacity-0'
      }`}>
        <div className="h-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Dashboard Overview</h3>
            <div className="flex items-center space-x-2">
              <span className="text-blue-400 px-3 py-1 rounded text-sm border border-blue-500/30 cursor-default opacity-60">
                New Scan
              </span>
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                <span className="text-sm">JD</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 rounded p-4 text-center">
              <div className={`text-2xl font-bold text-blue-400 transition-all duration-1000 ${
                animationPhase >= 1 ? 'scale-110' : ''
              }`}>
                {animationPhase >= 1 ? (animationPhase >= 2 ? '13' : '12') : '11'}
              </div>
              <div className="text-sm text-gray-400">Total Scans</div>
            </div>
            <div className="bg-slate-800 rounded p-4 text-center">
              <div className={`text-2xl font-bold text-red-400 transition-all duration-1000 ${
                animationPhase >= 1 ? 'scale-110' : ''
              }`}>
                {animationPhase >= 1 ? (animationPhase >= 2 ? '26' : '23') : '20'}
              </div>
              <div className="text-sm text-gray-400">Keys Found</div>
            </div>
            <div className="bg-slate-800 rounded p-4 text-center">
              <div className={`text-2xl font-bold text-green-400 transition-all duration-1000 ${
                animationPhase >= 1 ? 'scale-110' : ''
              }`}>
                {animationPhase >= 1 ? (animationPhase >= 2 ? '894' : '847') : '803'}
              </div>
              <div className="text-sm text-gray-400">Files Scanned</div>
            </div>
            <div className="bg-slate-800 rounded p-4 text-center">
              <div className={`text-2xl font-bold text-purple-400 transition-all duration-1000 ${
                animationPhase >= 2 ? 'scale-110' : ''
              }`}>
                {animationPhase >= 2 ? '89%' : '85%'}
              </div>
              <div className="text-sm text-gray-400">Security Score</div>
            </div>
          </div>
          
          <div className="space-y-2">
            {animationPhase >= 1 && (
              <div className={`flex items-center justify-between bg-slate-800 rounded p-3 transition-all duration-500 transform ${
                animationPhase >= 1 ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
              }`}>
                <div className="flex items-center space-x-3">
                  <span className="text-gray-300">new-feature-branch</span>
                  <span className="text-xs text-gray-500">2 min ago</span>
                  <span className={`px-2 py-1 text-xs rounded transition-all duration-1000 ${
                    animationPhase >= 2 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {animationPhase >= 2 ? 'COMPLETED' : 'SCANNING'}
                  </span>
                </div>
                <span className={`px-2 py-1 text-xs rounded transition-all duration-1000 ${
                  animationPhase >= 2 ? 'bg-red-600/20 text-red-400' : 'bg-gray-600/20 text-gray-400'
                }`}>
                  {animationPhase >= 2 ? '3 keys' : '...'}
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between bg-slate-800 rounded p-3">
              <div className="flex items-center space-x-3">
                <span className="text-gray-300">frontend-app</span>
                <span className="text-xs text-gray-500">2 hours ago</span>
              </div>
              <span className="bg-red-600/20 text-red-400 px-2 py-1 text-xs rounded">3 keys</span>
            </div>
            <div className="flex items-center justify-between bg-slate-800 rounded p-3">
              <div className="flex items-center space-x-3">
                <span className="text-gray-300">api-server</span>
                <span className="text-xs text-gray-500">1 day ago</span>
              </div>
              <span className="bg-yellow-600/20 text-yellow-400 px-2 py-1 text-xs rounded">1 key</span>
            </div>
            <div className="flex items-center justify-between bg-slate-800 rounded p-3">
              <div className="flex items-center space-x-3">
                <span className="text-gray-300">mobile-app</span>
                <span className="text-xs text-gray-500">3 days ago</span>
              </div>
              <span className="bg-green-600/20 text-green-400 px-2 py-1 text-xs rounded">0 keys</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo 3: Vault Storage */}
      <div className={`absolute inset-0 transition-all duration-700 ease-in-out transform ${
        currentDemo === 2 
          ? 'translate-y-0 opacity-100' 
          : currentDemo < 2 
            ? 'translate-y-full opacity-0' 
            : '-translate-y-full opacity-0'
      }`}>
        <div className="h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-white">Vault Storage</h3>
              <select className={`bg-slate-700 border border-gray-600 text-white rounded px-3 py-1 text-sm cursor-default transition-all duration-500 ${
                animationPhase >= 1 ? 'ring-1 ring-blue-500/50' : ''
              }`}>
                <option>production</option>
                <option>staging</option>
                <option>development</option>
              </select>
            </div>
            <span className={`text-blue-400 px-3 py-1 rounded text-sm border border-blue-500/30 cursor-default transition-all duration-500 ${
              animationPhase >= 2 ? 'opacity-100' : 'opacity-60'
            }`}>
              + Add Key
            </span>
          </div>
          
          <div className="space-y-3">
            {animationPhase >= 1 && (
              <div className={`bg-slate-800 rounded p-4 transition-all duration-500 transform ${
                animationPhase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">NEW_STRIPE_KEY</div>
                    <div className="text-sm text-gray-400">Just added • Never accessed</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-green-600/20 text-green-400 px-2 py-1 text-xs rounded">Active</span>
                    <span className="text-gray-400 cursor-default">⋯</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-slate-800 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">STRIPE_SECRET_KEY</div>
                  <div className={`text-sm text-gray-400 transition-all duration-500 ${
                    animationPhase >= 3 ? 'text-green-400' : ''
                  }`}>
                    Added 2 days ago • Last accessed {animationPhase >= 3 ? 'just now' : '4 hours ago'}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="bg-green-600/20 text-green-400 px-2 py-1 text-xs rounded">Active</span>
                  <span className="text-gray-400 cursor-default">⋯</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">AWS_ACCESS_KEY_ID</div>
                  <div className="text-sm text-gray-400">Added 1 week ago • Last accessed 2 hours ago</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="bg-green-600/20 text-green-400 px-2 py-1 text-xs rounded">Active</span>
                  <span className="text-gray-400 cursor-default">⋯</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">OPENAI_API_KEY</div>
                  <div className="text-sm text-gray-400">Added 3 days ago • Last accessed 1 hour ago</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="bg-green-600/20 text-green-400 px-2 py-1 text-xs rounded">Active</span>
                  <span className="text-gray-400 cursor-default">⋯</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className={`text-sm text-gray-400 transition-all duration-500 ${
              animationPhase >= 1 ? 'text-blue-400' : ''
            }`}>
              {animationPhase >= 1 ? '4 keys stored • AES-256 encrypted • Environment: production' : '3 keys stored • AES-256 encrypted • Environment: production'}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">The Credential Sprawl Problem</h2>
            <p className="text-xl text-gray-300">Modern development creates security gaps</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-6 hover:transform hover:-translate-y-1 transition-all">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="text-xl font-semibold mb-3">Hidden in Plain Sight</h3>
              <p className="text-gray-300">API keys scattered in config files, .env files, and accidentally committed to repos</p>
            </div>
            
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-6 hover:transform hover:-translate-y-1 transition-all">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-3">Hard to Track</h3>
              <p className="text-gray-300">No visibility into where credentials are used across your repositories and projects</p>
            </div>
            
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-6 hover:transform hover:-translate-y-1 transition-all">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold mb-3">Security Risk</h3>
              <p className="text-gray-300">Exposed credentials can lead to unauthorized access and potential data breaches</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">What Secretio Does</h2>
            <p className="text-xl text-gray-300">Currently available features</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                🔍 <span className="ml-3">Repository Scanner</span>
              </h3>
              <p className="text-gray-300 mb-6">
                CLI tool and web interface that scans your local directories and GitHub repositories for exposed API keys. 
                Detects patterns for major services including Stripe, AWS, OpenAI, and more.
              </p>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                <div className="text-green-400">$ secretio scan</div>
                <div className="text-gray-300 mt-1">Scanning 47 files...</div>
                <div className="text-red-500">HIGH: sk_live_51H... (Stripe)</div>
                <div className="text-yellow-400">MED: AKIA... (AWS)</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                📊 <span className="ml-3">GitHub Integration</span>
              </h3>
              <p className="text-gray-300 mb-6">
                Connect your GitHub account to scan repositories remotely. 
                Analyze multiple repos and get consolidated security reports with detailed vulnerability tracking.
              </p>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                <div className="text-blue-400">Scanning: user/repo@main</div>
                <div className="text-green-400">✅ Analysis complete</div>
                <div className="text-gray-300">View detailed results →</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                🔐 <span className="ml-3">Basic Vault Storage</span>
                <span className="ml-2 bg-blue-600/20 text-blue-400 px-2 py-1 text-xs rounded">BETA</span>
              </h3>
              <p className="text-gray-300 mb-6">
                Store API keys securely with environment separation. 
                CLI integration for retrieving keys without hardcoding them in your source code.
              </p>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                <div className="text-green-400">$ secretio vault store stripe_key</div>
                <div className="text-green-400">$ secretio vault get stripe_key</div>
                <div className="text-gray-300">Environment: production</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                📈 <span className="ml-3">Security Dashboard</span>
              </h3>
              <p className="text-gray-300 mb-6">
                Track your security posture over time with scan history, 
                vulnerability trends, and repository-level security scores.
              </p>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                <div className="text-blue-400">Security Score: 85%</div>
                <div className="text-green-400">23 keys secured</div>
                <div className="text-gray-300">12 repos monitored</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's Coming Section */}
      <section className="py-20 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Roadmap</h2>
            <p className="text-xl text-gray-300">Features in development</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-3">🔄</div>
                <h3 className="text-xl font-semibold">Automated Key Rotation</h3>
                <span className="ml-auto bg-yellow-600/20 text-yellow-400 px-2 py-1 text-xs rounded">PLANNED</span>
              </div>
              <p className="text-gray-300">Automatically rotate API keys with supported services to maintain security without manual intervention.</p>
            </div>
            
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-3">👥</div>
                <h3 className="text-xl font-semibold">Team Management</h3>
                <span className="ml-auto bg-yellow-600/20 text-yellow-400 px-2 py-1 text-xs rounded">PLANNED</span>
              </div>
              <p className="text-gray-300">Role-based access controls, team collaboration features, and audit logging.</p>
            </div>
            
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-3">📈</div>
                <h3 className="text-xl font-semibold">Usage Analytics</h3>
                <span className="ml-auto bg-yellow-600/20 text-yellow-400 px-2 py-1 text-xs rounded">PLANNED</span>
              </div>
              <p className="text-gray-300">Track API key usage patterns and get insights into your credential management.</p>
            </div>
            
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-3">🔌</div>
                <h3 className="text-xl font-semibold">SDK Libraries</h3>
                <span className="ml-auto bg-yellow-600/20 text-yellow-400 px-2 py-1 text-xs rounded">PLANNED</span>
              </div>
              <p className="text-gray-300">SDKs for Python, JavaScript, Go, and other languages to integrate vault access into your applications.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Start with Free Scanning</h2>
            <p className="text-xl text-gray-300">Try the scanner, upgrade when you need vault storage</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Tier */}
            <div className="bg-slate-900 border border-green-500 rounded-lg p-8 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 px-4 py-1 rounded-full text-sm font-medium">
                Available Now
              </div>
              <h3 className="text-2xl font-bold mb-2">Free Scanner</h3>
              <div className="text-4xl font-bold mb-6">$0<span className="text-lg text-gray-400">/month</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> CLI scanning tool
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> GitHub repository scanning
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Vulnerability reports
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Scan history tracking
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Multiple API key patterns
                </li>
              </ul>
              <button 
                onClick={handleScanClick}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg transition-colors font-semibold"
              >
                Try Live Demo
              </button>
            </div>
            
            {/* Pro Tier */}
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-2">Pro Vault</h3>
              <div className="text-4xl font-bold mb-6">$15<span className="text-lg text-gray-400">/user/month</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Everything in Free
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">○</span> Encrypted vault storage
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">○</span> API access for apps
                </li>
                <li className="flex items-center">
                  <span className="text-gray-400 mr-2">○</span> Key rotation (coming)
                </li>
                <li className="flex items-center">
                  <span className="text-gray-400 mr-2">○</span> Team features (coming)
                </li>
              </ul>
              <button className="w-full border border-gray-600 hover:border-gray-400 py-3 rounded-lg transition-colors">
                Join Waitlist
              </button>
            </div>
            
            {/* Enterprise Tier */}
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <div className="text-4xl font-bold mb-6">Custom<span className="text-lg text-gray-400"></span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Everything in Pro
                </li>
                <li className="flex items-center">
                  <span className="text-gray-400 mr-2">○</span> SOC2 compliance
                </li>
                <li className="flex items-center">
                  <span className="text-gray-400 mr-2">○</span> Advanced analytics
                </li>
                <li className="flex items-center">
                  <span className="text-gray-400 mr-2">○</span> Custom integrations
                </li>
                <li className="flex items-center">
                  <span className="text-gray-400 mr-2">○</span> Dedicated support
                </li>
              </ul>
              <button className="w-full border border-gray-600 hover:border-gray-400 py-3 rounded-lg transition-colors">
                Contact Us
              </button>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-400 text-sm">
              • ✓ = Available now • ○ = In development • ○ = Planned feature
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">Start scanning your repos today</h2>
          <p className="text-xl text-gray-300 mb-12">
            See the tool in action or get started with your own account
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleScanClick}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105"
            >
              Try Live Demo
            </button>
            <button 
              onClick={() => router.push("/login")}
              className="border border-gray-600 hover:border-gray-400 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              Create Account
            </button>
          </div>
          
          <p className="text-gray-400 mt-8">Free to try. No credit card required.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <span className="text-xl font-bold">secretio</span>
              </div>
              <p className="text-gray-400">API key security scanning for developers.</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">CLI Guide</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Issue Tracker</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400">© 2025 Secretio. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}