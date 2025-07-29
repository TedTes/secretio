'use client'

import { useState,useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './contexts/AuthContext';
import LoginModal from './components/auth/LoginModal';
import RegisterModal from './components/auth/RegisterModal';
import UserMenu from './components/auth/UserMenu';
export default function Home() {
  const [scanStatus, setScanStatus] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const { isAuthenticated, isLoading} = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);
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
      setShowLoginModal(true);
      return;
    }
    setScanStatus('Installing CLI...')
    setTimeout(() => {
      setScanStatus('CLI Installed! Run: secretio scan')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-slate-900/90 backdrop-blur-md border-b border-gray-800 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => router.push(isAuthenticated ? '/dashboard' : '/')} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
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
  
  <button onClick={() => setShowLoginModal(true)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
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
            <span className="text-red-500 text-sm font-medium">Found 1.2M+ exposed API keys in public repos</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Stop scattering<br/>
            <span className="text-blue-500">API keys</span> everywhere
          </h1>
          
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Give your applications <strong>ONE</strong> secure access point for all external service credentials. 
            No more scattered keys across codebases, config files, and environment variables.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button 
              onClick={handleScanClick}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105"
            >
              {scanStatus || 'Scan My Repos'}
            </button>
            <button 
  onClick={() => isAuthenticated ? window.location.href = '/dashboard' : setShowLoginModal(true)}
  className="border border-gray-600 hover:border-gray-400 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
>
  Start Clean
</button>
          </div>
          
          {/* Terminal Demo */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 max-w-2xl mx-auto text-left">
            <div className="flex items-center mb-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <span className="text-gray-400 text-sm ml-4">Terminal</span>
            </div>
            <div className="font-mono text-sm space-y-1">
              <div className="text-green-400">$ npm install -g secretio</div>
              <div className="text-green-400">$ secretio scan</div>
              <div className="text-gray-300">🔍 Scanning repositories...</div>
              <div className="text-red-500">❌ Found 23 exposed API keys across 8 repos</div>
              <div className="text-yellow-400">⚠️  STRIPE_SECRET_KEY in src/config.js</div>
              <div className="text-yellow-400">⚠️  AWS_ACCESS_KEY in .env.example</div>
              <div className="text-yellow-400">⚠️  OPENAI_API_KEY in README.md</div>
              <div className="text-green-400">$ secretio fix-all</div>
              <div className="text-green-400">✅ All keys secured in vault</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">The API Key Chaos</h2>
            <p className="text-xl text-gray-300">With AI making everyone a developer, credential sprawl is out of control</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-6 hover:transform hover:-translate-y-1 transition-all">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="text-xl font-semibold mb-3">Scattered Everywhere</h3>
              <p className="text-gray-300">Config files, environment variables, hardcoded in source, shared in Slack...</p>
            </div>
            
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-6 hover:transform hover:-translate-y-1 transition-all">
              <div className="text-4xl mb-4">🚨</div>
              <h3 className="text-xl font-semibold mb-3">Publicly Exposed</h3>
              <p className="text-gray-300">GitHub, GitLab, and public repos are littered with live API keys in plain text</p>
            </div>
            
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-6 hover:transform hover:-translate-y-1 transition-all">
              <div className="text-4xl mb-4">😰</div>
              <h3 className="text-xl font-semibold mb-3">No Visibility</h3>
              <p className="text-gray-300">You have no idea where your keys are, who is using them, or when they expire</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">One Vault. All Your Keys.</h2>
            <p className="text-xl text-gray-300">Built for the AI-powered developer explosion</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                🔍 <span className="ml-3">Git Scanner</span>
              </h3>
              <p className="text-gray-300 mb-6">
                Automatically discover exposed credentials across all your repositories. 
                Pattern recognition for Stripe, AWS, OpenAI, and 15+ other services.
              </p>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                <div className="text-green-400">$ secretio scan --all-repos</div>
                <div className="text-red-500 mt-1">Found: sk_live_51H... in payments.js</div>
                <div className="text-red-500">Found: AKIA... in config/aws.json</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                🔐 <span className="ml-3">Encrypted Vault</span>
              </h3>
              <p className="text-gray-300 mb-6">
                AES-256 encrypted storage with environment separation. 
                Your keys never touch your code again.
              </p>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                <div className="text-green-400">const stripe = new Stripe(</div>
                <div className="text-blue-400 ml-4">await secretio.get('STRIPE_KEY')</div>
                <div className="text-green-400">);</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                🔄 <span className="ml-3">Auto Rotation</span>
              </h3>
              <p className="text-gray-300 mb-6">
                Automated key rotation with zero downtime. 
                Get notified before keys expire.
              </p>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                <div className="text-yellow-400">⚠️ AWS key expires in 7 days</div>
                <div className="text-green-400">✅ Auto-rotation scheduled</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                👥 <span className="ml-3">Team Ready</span>
              </h3>
              <p className="text-gray-300 mb-6">
                Role-based access controls, audit logs, and team collaboration built-in.
              </p>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                <div className="text-blue-400">john@team.com: read-only</div>
                <div className="text-green-400">sarah@team.com: admin</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Simple, Developer-First Pricing</h2>
            <p className="text-xl text-gray-300">Start free, scale as you grow</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Tier */}
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-2">Free Scanner</h3>
              <div className="text-4xl font-bold mb-6">$0<span className="text-lg text-gray-400">/month</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Unlimited repo scanning
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Vulnerability reports
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> CLI tool
                </li>
                <li className="flex items-center">
                  <span className="text-gray-400 mr-2">✗</span> Vault storage
                </li>
              </ul>
              <button className="w-full border border-gray-600 hover:border-gray-400 py-3 rounded-lg transition-colors">
                Start Scanning
              </button>
            </div>
            
            {/* Pro Tier */}
            <div className="bg-slate-900 border border-blue-500 rounded-lg p-8 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro Vault</h3>
              <div className="text-4xl font-bold mb-6">$15<span className="text-lg text-gray-400">/user/month</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Everything in Free
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Encrypted vault storage
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> API access
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Basic key rotation
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Team collaboration
                </li>
              </ul>
              <button className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg transition-colors">
                Start Free Trial
              </button>
            </div>
            
            {/* Enterprise Tier */}
            <div className="bg-slate-900 border border-gray-700 rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <div className="text-4xl font-bold mb-6">$5K<span className="text-lg text-gray-400">/year</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Everything in Pro
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> SOC2 compliance
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Advanced analytics
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Custom integrations
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span> Dedicated support
                </li>
              </ul>
              <button className="w-full border border-gray-600 hover:border-gray-400 py-3 rounded-lg transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">Ready to secure your API keys?</h2>
          <p className="text-xl text-gray-300 mb-12">
            Join thousands of developers who have stopped scattering secrets
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105">
              Download CLI
            </button>
            <button className="border border-gray-600 hover:border-gray-400 px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
              View Documentation
            </button>
          </div>
          
          <p className="text-gray-400 mt-8">Free scanner. No credit card required.</p>
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
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <span className="text-xl font-bold">secretio</span>
              </div>
              <p className="text-gray-400">Secure API key management for modern developers.</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Developers</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">CLI Guide</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Examples</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400">© 2025 Secretio. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
      <LoginModal 
  isOpen={showLoginModal} 
  onClose={() => setShowLoginModal(false)}
  onSwitchToRegister={() => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  }}
/>
<RegisterModal 
  isOpen={showRegisterModal} 
  onClose={() => setShowRegisterModal(false)}
  onSwitchToLogin={() => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  }}
/>
    </div>
  )
}