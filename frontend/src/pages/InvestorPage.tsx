/**
 * Investor Dashboard Page for InvestGhanaHub
 * Shows portfolio, available opportunities, and investment history
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Wallet, 
  PieChart, 
  Clock,
  ArrowUpRight,
  Loader2,
  Filter,
  Search,
  Leaf,
  Rocket,
  Building2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';
import { investmentAPI, kycAPI } from '../utils/api';
import DashboardTable from '../components/DashboardTable';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  minInvestment: number;
  maxInvestment: number;
  expectedReturn: number;
  duration: number;
  riskLevel: string;
  targetAmount: number;
  currentAmount: number;
  business: {
    id: string;
    name: string;
    category: string;
    location: string;
    region: string;
  };
}

interface Portfolio {
  summary: {
    totalInvested: number;
    totalExpectedReturn: number;
    totalProfit: number;
    activeCount: number;
    maturedCount: number;
    totalCount: number;
  };
  byCategory: Record<string, { count: number; amount: number }>;
  recentInvestments: any[];
}

export default function InvestorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'opportunities' | 'portfolio' | 'history'>('opportunities');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<string>('');
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Investment modal
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [investAmount, setInvestAmount] = useState('');
  const [isInvesting, setIsInvesting] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Check KYC status
      const kycResponse = await kycAPI.getStatus();
      setKycStatus(kycResponse.data.status);

      if (activeTab === 'opportunities') {
        const response = await investmentAPI.listOpportunities({
          category: categoryFilter || undefined,
          riskLevel: riskFilter || undefined,
          limit: 50
        });
        setOpportunities(response.data.opportunities || []);
      } else if (activeTab === 'portfolio') {
        const response = await investmentAPI.getPortfolio();
        setPortfolio(response.data);
      } else if (activeTab === 'history') {
        const response = await investmentAPI.getHistory({ limit: 50 });
        setInvestments(response.data.investments || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle investment
  const handleInvest = async () => {
    if (!selectedOpportunity || !investAmount) return;

    if (kycStatus !== 'APPROVED') {
      toast.error('Please complete KYC verification first');
      navigate('/kyc');
      return;
    }

    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount < selectedOpportunity.minInvestment) {
      toast.error(`Minimum investment is ₵${selectedOpportunity.minInvestment}`);
      return;
    }
    if (amount > selectedOpportunity.maxInvestment) {
      toast.error(`Maximum investment is ₵${selectedOpportunity.maxInvestment}`);
      return;
    }

    setIsInvesting(true);
    try {
      await investmentAPI.invest(selectedOpportunity.id, amount);
      toast.success('Investment successful!');
      setSelectedOpportunity(null);
      setInvestAmount('');
      fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Investment failed';
      toast.error(message);
    } finally {
      setIsInvesting(false);
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'crops': return <Leaf className="w-5 h-5 text-ghana-green-500" />;
      case 'startup': return <Rocket className="w-5 h-5 text-ghana-gold-500" />;
      case 'operational': return <Building2 className="w-5 h-5 text-blue-500" />;
      default: return <TrendingUp className="w-5 h-5 text-dark-400" />;
    }
  };

  // Get risk badge
  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low': return <span className="badge-success">Low Risk</span>;
      case 'medium': return <span className="badge-warning">Medium Risk</span>;
      case 'high': return <span className="badge-danger">High Risk</span>;
      default: return <span className="badge-neutral">{risk}</span>;
    }
  };

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opp => {
    if (searchQuery && !opp.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !opp.business.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // KYC warning banner
  const KYCWarning = () => {
    if (kycStatus === 'APPROVED') return null;
    
    return (
      <div className="mb-6 p-4 bg-ghana-gold-500/10 border border-ghana-gold-500/30 rounded-xl flex items-center gap-4">
        <AlertCircle className="w-6 h-6 text-ghana-gold-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-ghana-gold-400 font-medium">
            {kycStatus === 'PENDING' 
              ? 'Your KYC is pending approval'
              : 'Complete KYC verification to start investing'}
          </p>
          <p className="text-sm text-dark-400">
            {kycStatus === 'PENDING'
              ? 'You can browse opportunities, but cannot invest until approved.'
              : 'KYC verification is required for Ghana compliance.'}
          </p>
        </div>
        {kycStatus !== 'PENDING' && (
          <button onClick={() => navigate('/kyc')} className="btn-primary text-sm py-2">
            Complete KYC
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">
            Welcome, {user?.firstName}!
          </h1>
          <p className="text-dark-400">Manage your investments and discover new opportunities</p>
        </div>

        <KYCWarning />

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'opportunities', label: 'Opportunities', icon: TrendingUp },
            { id: 'portfolio', label: 'Portfolio', icon: PieChart },
            { id: 'history', label: 'History', icon: Clock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-ghana-gold-500 text-dark-950 font-medium'
                  : 'text-dark-400 hover:bg-dark-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-ghana-gold-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Opportunities Tab */}
            {activeTab === 'opportunities' && (
              <div>
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      type="text"
                      placeholder="Search opportunities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input pl-10"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); fetchData(); }}
                    className="select min-w-[150px]"
                  >
                    <option value="">All Categories</option>
                    <option value="crops">Agriculture</option>
                    <option value="startup">Startups</option>
                    <option value="operational">Operational</option>
                  </select>
                  <select
                    value={riskFilter}
                    onChange={(e) => { setRiskFilter(e.target.value); fetchData(); }}
                    className="select min-w-[150px]"
                  >
                    <option value="">All Risk Levels</option>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>

                {/* Opportunities Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOpportunities.map(opp => {
                    const progress = (opp.currentAmount / opp.targetAmount) * 100;
                    return (
                      <div key={opp.id} className="card-hover">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center">
                              {getCategoryIcon(opp.business.category)}
                            </div>
                            <div>
                              <p className="text-sm text-dark-400">{opp.business.name}</p>
                              <p className="text-xs text-dark-500">{opp.business.region}</p>
                            </div>
                          </div>
                          {getRiskBadge(opp.riskLevel)}
                        </div>

                        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{opp.title}</h3>
                        <p className="text-sm text-dark-400 mb-4 line-clamp-2">{opp.description}</p>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-dark-500">Expected Return</p>
                            <p className="text-lg font-bold text-ghana-green-500">{opp.expectedReturn}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-dark-500">Duration</p>
                            <p className="text-lg font-bold">{opp.duration} months</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-dark-400">Progress</span>
                            <span className="text-dark-300">₵{opp.currentAmount.toLocaleString()} / ₵{opp.targetAmount.toLocaleString()}</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-dark-700">
                          <div>
                            <p className="text-xs text-dark-500">Min. Investment</p>
                            <p className="font-semibold">₵{opp.minInvestment.toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => setSelectedOpportunity(opp)}
                            className="btn-primary py-2 px-4 text-sm flex items-center gap-1"
                          >
                            Invest <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredOpportunities.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <TrendingUp className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                      <p className="text-dark-400">No opportunities found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Portfolio Tab */}
            {activeTab === 'portfolio' && portfolio && (
              <div>
                {/* Stats */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                  <div className="stat-card">
                    <Wallet className="w-8 h-8 text-ghana-gold-500 mb-4" />
                    <div className="stat-value">₵{portfolio.summary.totalInvested.toLocaleString()}</div>
                    <div className="stat-label">Total Invested</div>
                  </div>
                  <div className="stat-card">
                    <TrendingUp className="w-8 h-8 text-ghana-green-500 mb-4" />
                    <div className="stat-value text-ghana-green-500">
                      ₵{portfolio.summary.totalExpectedReturn.toLocaleString()}
                    </div>
                    <div className="stat-label">Expected Return</div>
                  </div>
                  <div className="stat-card">
                    <ArrowUpRight className="w-8 h-8 text-ghana-gold-500 mb-4" />
                    <div className="stat-value gradient-text">
                      ₵{portfolio.summary.totalProfit.toLocaleString()}
                    </div>
                    <div className="stat-label">Expected Profit</div>
                  </div>
                  <div className="stat-card">
                    <PieChart className="w-8 h-8 text-blue-500 mb-4" />
                    <div className="stat-value">{portfolio.summary.activeCount}</div>
                    <div className="stat-label">Active Investments</div>
                  </div>
                </div>

                {/* Distribution */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="card">
                    <h3 className="font-semibold mb-4">By Category</h3>
                    {Object.entries(portfolio.byCategory).map(([category, data]) => (
                      <div key={category} className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(category)}
                          <span className="capitalize">{category}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₵{data.amount.toLocaleString()}</p>
                          <p className="text-xs text-dark-500">{data.count} investments</p>
                        </div>
                      </div>
                    ))}
                    {Object.keys(portfolio.byCategory).length === 0 && (
                      <p className="text-dark-500 text-center py-4">No investments yet</p>
                    )}
                  </div>

                  <div className="card">
                    <h3 className="font-semibold mb-4">Recent Investments</h3>
                    {portfolio.recentInvestments.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                        <div>
                          <p className="font-medium">{inv.opportunityTitle}</p>
                          <p className="text-xs text-dark-500">{inv.businessName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₵{inv.amount.toLocaleString()}</p>
                          <p className="text-xs text-dark-500">
                            {new Date(inv.investedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {portfolio.recentInvestments.length === 0 && (
                      <p className="text-dark-500 text-center py-4">No investments yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <DashboardTable
                columns={[
                  { key: 'opportunity', label: 'Opportunity' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'expectedReturn', label: 'Expected Return' },
                  { key: 'status', label: 'Status' },
                  { key: 'date', label: 'Date' }
                ]}
                data={investments.map(inv => ({
                  opportunity: (
                    <div>
                      <p className="font-medium">{inv.opportunity?.title || 'N/A'}</p>
                      <p className="text-xs text-dark-500">{inv.opportunity?.business?.name || ''}</p>
                    </div>
                  ),
                  amount: `₵${inv.amount.toLocaleString()}`,
                  expectedReturn: `₵${inv.expectedReturn.toLocaleString()}`,
                  status: (
                    <span className={`badge-${inv.status === 'ACTIVE' ? 'success' : inv.status === 'MATURED' ? 'info' : 'neutral'}`}>
                      {inv.status}
                    </span>
                  ),
                  date: new Date(inv.investedAt).toLocaleDateString()
                }))}
                emptyMessage="No investment history"
              />
            )}
          </>
        )}

        {/* Investment Modal */}
        {selectedOpportunity && (
          <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card max-w-md w-full animate-slide-up">
              <h3 className="text-xl font-display font-bold mb-2">{selectedOpportunity.title}</h3>
              <p className="text-dark-400 text-sm mb-6">{selectedOpportunity.business.name}</p>

              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-dark-800/50 rounded-xl">
                <div>
                  <p className="text-xs text-dark-500">Min Investment</p>
                  <p className="font-semibold">₵{selectedOpportunity.minInvestment.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500">Max Investment</p>
                  <p className="font-semibold">₵{selectedOpportunity.maxInvestment.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500">Expected Return</p>
                  <p className="font-semibold text-ghana-green-500">{selectedOpportunity.expectedReturn}%</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500">Duration</p>
                  <p className="font-semibold">{selectedOpportunity.duration} months</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="label">Investment Amount (GHS)</label>
                <input
                  type="number"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  placeholder={`Min: ₵${selectedOpportunity.minInvestment}`}
                  className="input"
                  min={selectedOpportunity.minInvestment}
                  max={selectedOpportunity.maxInvestment}
                />
                {investAmount && (
                  <p className="text-sm text-dark-400 mt-2">
                    Expected return: <span className="text-ghana-green-500 font-medium">
                      ₵{(parseFloat(investAmount) * (1 + selectedOpportunity.expectedReturn / 100)).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => { setSelectedOpportunity(null); setInvestAmount(''); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvest}
                  disabled={isInvesting || !investAmount}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isInvesting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Investment'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

