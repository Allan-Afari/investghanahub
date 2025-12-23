/**
 * Home Page for InvestGhanaHub
 * Landing page with hero section and features
 */

import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Shield, 
  Leaf, 
  Building2, 
  Rocket,
  ArrowRight,
  CheckCircle2,
  Star
} from 'lucide-react';
import { useAuth } from '../App';

// Ghana regions for the map visualization
const ghanaRegions = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
  'Northern', 'Upper East', 'Upper West', 'Volta'
];

// Features data
const features = [
  {
    icon: Leaf,
    title: 'Agricultural Investments',
    description: 'Fund crop production and farming operations across Ghana. Support food security while earning returns.',
    color: 'ghana-green'
  },
  {
    icon: Rocket,
    title: 'Startup Funding',
    description: 'Invest in innovative Ghanaian startups. Be part of Africa\'s growing tech ecosystem.',
    color: 'ghana-gold'
  },
  {
    icon: Building2,
    title: 'Operational Businesses',
    description: 'Support established businesses looking to expand. Lower risk with proven track records.',
    color: 'blue'
  }
];

// Stats data
const stats = [
  { value: '₵2.5M+', label: 'Total Invested' },
  { value: '150+', label: 'Active Investors' },
  { value: '45+', label: 'Funded Businesses' },
  { value: '18%', label: 'Avg. Returns' }
];

// Benefits data
const benefits = [
  'Verified businesses and KYC compliance',
  'Transparent investment tracking',
  'Ghana-specific regulatory compliance',
  'Secure encrypted transactions',
  'Regular investment reports',
  'Dedicated support team'
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'BUSINESS_OWNER') return '/owner';
    return '/investor';
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative hero-gradient min-h-[90vh] flex items-center overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-ghana-pattern opacity-30" />
        
        {/* Gradient orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-ghana-gold-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-ghana-green-500/10 rounded-full blur-3xl" />
        
        <div className="container-custom relative z-10 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-ghana-gold-500/10 border border-ghana-gold-500/30 rounded-full mb-6">
                <Star className="w-4 h-4 text-ghana-gold-400" />
                <span className="text-sm text-ghana-gold-400 font-medium">Ghana's Premier Investment Platform</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight">
                Invest in
                <span className="gradient-text block">Ghana's Future</span>
              </h1>
              
              <p className="text-xl text-dark-400 mb-8 max-w-lg">
                Fund crops, startups, and operational businesses across Ghana. 
                Build wealth while supporting economic growth.
              </p>
              
              <div className="flex flex-wrap gap-4">
                {isAuthenticated ? (
                  <Link to={getDashboardLink()} className="btn-primary flex items-center gap-2">
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="btn-primary flex items-center gap-2">
                      Start Investing
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link to="/login" className="btn-secondary">
                      Sign In
                    </Link>
                  </>
                )}
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 mt-10 pt-10 border-t border-dark-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-ghana-green-500" />
                  <span className="text-sm text-dark-400">KYC Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-ghana-green-500" />
                  <span className="text-sm text-dark-400">SEC Compliant</span>
                </div>
              </div>
            </div>

            {/* Right content - Stats cards */}
            <div className="relative animate-slide-up animation-delay-200">
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, index) => (
                  <div 
                    key={stat.label}
                    className={`card glow-gold p-6 ${index === 0 ? 'col-span-2' : ''}`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`stat-value ${index === 0 ? 'text-4xl' : 'text-3xl'} gradient-text`}>
                      {stat.value}
                    </div>
                    <div className="stat-label mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
              
              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-ghana-gold-500 text-dark-950 px-4 py-2 rounded-full font-semibold text-sm shadow-lg">
                🇬🇭 Made in Ghana
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Categories Section */}
      <section className="section bg-dark-900/50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="section-title">Investment Categories</h2>
            <p className="section-subtitle mx-auto">
              Choose from diverse investment opportunities across Ghana's growing economy
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={feature.title}
                  className="card-hover group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`w-14 h-14 rounded-xl bg-${feature.color}-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-7 h-7 text-${feature.color}-500`} />
                  </div>
                  <h3 className="text-xl font-display font-semibold mb-3 text-dark-100">
                    {feature.title}
                  </h3>
                  <p className="text-dark-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="section-title">How InvestGhanaHub Works</h2>
              <p className="section-subtitle mb-10">
                Start your investment journey in four simple steps
              </p>

              <div className="space-y-8">
                {[ 
                  { step: '01', title: 'Create Account', desc: 'Sign up as an investor or business owner' },
                  { step: '02', title: 'Complete KYC', desc: 'Verify your identity with Ghana Card' },
                  { step: '03', title: 'Browse Opportunities', desc: 'Explore verified investment options' },
                  { step: '04', title: 'Invest & Earn', desc: 'Fund businesses and track returns' }
                ].map((item) => (
                  <div key={item.step} className="flex gap-6 items-start group">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-dark-800 flex items-center justify-center font-display font-bold text-ghana-gold-500 group-hover:bg-ghana-gold-500 group-hover:text-dark-950 transition-all">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-dark-100 mb-1">{item.title}</h4>
                      <p className="text-dark-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits list */}
            <div className="card bg-gradient-to-br from-dark-800/80 to-dark-900/80 p-8">
              <h3 className="text-2xl font-display font-bold mb-6 text-dark-100">
                Why Choose InvestGhanaHub?
              </h3>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-ghana-green-500 flex-shrink-0" />
                    <span className="text-dark-300">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-8 border-t border-dark-700">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div 
                        key={i}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-ghana-gold-400 to-ghana-gold-600 border-2 border-dark-800 flex items-center justify-center text-dark-950 font-bold text-sm"
                      >
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-dark-100 font-semibold">150+ Active Investors</p>
                    <p className="text-dark-500 text-sm">Join the community</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ghana Coverage Section */}
      <section className="section bg-dark-900/50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="section-title">Nationwide Coverage</h2>
            <p className="section-subtitle mx-auto">
              Investment opportunities from all regions of Ghana
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {ghanaRegions.map((region) => (
              <div 
                key={region}
                className="px-4 py-2 bg-dark-800 rounded-full text-dark-300 text-sm hover:bg-ghana-gold-500/20 hover:text-ghana-gold-400 transition-colors cursor-default"
              >
                {region}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section">
        <div className="container-custom">
          <div className="card bg-gradient-to-r from-ghana-gold-500/10 via-dark-800 to-ghana-green-500/10 border-ghana-gold-500/20 p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-dark-50">
              Ready to Start Investing?
            </h2>
            <p className="text-dark-400 mb-8 max-w-xl mx-auto">
              Join hundreds of investors building wealth while supporting Ghana's economic growth.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {isAuthenticated ? (
                <Link to={getDashboardLink()} className="btn-primary flex items-center gap-2">
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary flex items-center gap-2">
                    Create Free Account
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link to="/login" className="btn-secondary">
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-dark-800">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-ghana-gold-500" />
              <span className="font-display font-bold text-xl">InvestGhanaHub</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <Link to="/terms" className="text-dark-400 hover:text-dark-200">Terms of Service</Link>
              <Link to="/privacy" className="text-dark-400 hover:text-dark-200">Privacy Policy</Link>
            </div>
            
            <div className="flex items-center gap-6 text-dark-500 text-sm">
              <span>© 2024 InvestGhanaHub</span>
              <span className="hidden md:inline">|</span>
              <span>Made with 💛 in Ghana</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

