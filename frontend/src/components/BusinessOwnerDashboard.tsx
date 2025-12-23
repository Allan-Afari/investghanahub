import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { businessAPI } from '../utils/api';

interface BusinessInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  targetCapital: number;
  raisedAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  investors: number;
}

interface InvestmentOpportunity {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  investorCount: number;
  status: 'ACTIVE' | 'CLOSED' | 'COMPLETED';
  expectedROI: number;
  createdAt: string;
}

interface BusinessStats {
  totalRaised: number;
  totalTarget: number;
  investorCount: number;
  activeOpportunities: number;
  raisingProgress: number;
}

interface InvestorActivity {
  id: string;
  investorName: string;
  amount: number;
  date: string;
  type: 'INVESTMENT' | 'WITHDRAWAL' | 'PROFIT';
}

const BusinessOwnerDashboard: React.FC = () => {
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [investorActivity, setInvestorActivity] = useState<InvestorActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'opportunities' | 'investors'>('overview');

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch business info
      const businessResponse = await businessAPI.getBusinessInfo();
      setBusiness(businessResponse.data || businessResponse);

      // Fetch opportunities
      const oppResponse = await businessAPI.getMyOpportunities?.();
      const opportunitiesData: InvestmentOpportunity[] = Array.isArray(oppResponse)
        ? (oppResponse as InvestmentOpportunity[])
        : ((oppResponse?.data as InvestmentOpportunity[]) || []);
      setOpportunities(opportunitiesData);

      // Calculate stats
      if (businessResponse.data || businessResponse) {
        const biz = businessResponse.data || businessResponse;
        const raisingProgress = biz.targetCapital ? (biz.raisedAmount / biz.targetCapital) * 100 : 0;
        setStats({
          totalRaised: biz.raisedAmount,
          totalTarget: biz.targetCapital,
          investorCount: biz.investors || 0,
          activeOpportunities: opportunitiesData.filter(o => o.status === 'ACTIVE').length,
          raisingProgress: Math.min(raisingProgress, 100),
        });
      }

      // Generate investor activity (mock data)
      generateInvestorActivity();
    } catch (err) {
      setError('Failed to load business dashboard. Please try again.');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateInvestorActivity = () => {
    const activities: InvestorActivity[] = [
      {
        id: '1',
        investorName: 'Kofi Mensah',
        amount: 50000,
        date: new Date().toISOString(),
        type: 'INVESTMENT',
      },
      {
        id: '2',
        investorName: 'Akua Owusu',
        amount: 30000,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'INVESTMENT',
      },
      {
        id: '3',
        investorName: 'Yaw Boateng',
        amount: 5000,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'PROFIT',
      },
    ];
    setInvestorActivity(activities);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading business dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchBusinessData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 mb-4">No business profile found.</p>
        <button className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
          Register Your Business
        </button>
      </div>
    );
  }

  const capitalRaisingData = [
    { name: 'Raised', value: stats?.totalRaised || 0, fill: '#10B981' },
    { name: 'Remaining', value: Math.max(0, (stats?.totalTarget || 0) - (stats?.totalRaised || 0)), fill: '#E5E7EB' },
  ];

  const investmentTrendData = [
    { month: 'Jan', investors: 5, amount: 100000 },
    { month: 'Feb', investors: 8, amount: 150000 },
    { month: 'Mar', investors: 12, amount: 250000 },
    { month: 'Apr', investors: 15, amount: 320000 },
  ];

  return (
    <div className="space-y-6">
      {/* Business Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{business.name}</h1>
            <p className="text-blue-100 mt-2">{business.description}</p>
            <div className="flex items-center space-x-4 mt-4">
              <span className="bg-blue-700 px-3 py-1 rounded-full text-sm">{business.category}</span>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  business.status === 'APPROVED'
                    ? 'bg-green-600'
                    : business.status === 'PENDING'
                    ? 'bg-yellow-600'
                    : 'bg-red-600'
                }`}
              >
                {business.status}
              </span>
            </div>
          </div>
          <button className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50">
            Edit Profile
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <p className="text-gray-600 text-sm font-medium">Capital Raised</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats?.totalRaised || 0)}</p>
          <p className="text-xs text-gray-500 mt-2">of {formatCurrency(stats?.totalTarget || 0)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <p className="text-gray-600 text-sm font-medium">Total Investors</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{stats?.investorCount || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Active backers</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
          <p className="text-gray-600 text-sm font-medium">Active Opportunities</p>
          <p className="text-2xl font-bold text-purple-600 mt-2">{stats?.activeOpportunities || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Open for investment</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-600">
          <p className="text-gray-600 text-sm font-medium">Raising Progress</p>
          <p className="text-2xl font-bold text-amber-600 mt-2">{(stats?.raisingProgress || 0).toFixed(0)}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-amber-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats?.raisingProgress || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow border-b">
        <div className="flex border-b">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'opportunities', label: 'Opportunities' },
              { id: 'investors', label: 'Investor Activity' },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Capital Raising Progress */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Capital Raising Progress</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={capitalRaisingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {capitalRaisingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: unknown) => formatCurrency(value as number)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Investment Trend */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Trends</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={investmentTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="amount" fill="#3B82F6" name="Investment Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Opportunities Tab */}
        {activeTab === 'opportunities' && (
          <div className="p-6">
            {opportunities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No investment opportunities created yet.</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Create Opportunity
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {opportunities.map(opp => (
                  <div key={opp.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{opp.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{opp.description}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          opp.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : opp.status === 'CLOSED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {opp.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500">Target Amount</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(opp.targetAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Raised</p>
                        <p className="font-semibold text-green-600">{formatCurrency(opp.raisedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Investors</p>
                        <p className="font-semibold text-gray-900">{opp.investorCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Expected ROI</p>
                        <p className="font-semibold text-gray-900">{opp.expectedROI.toFixed(2)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Investor Activity Tab */}
        {activeTab === 'investors' && (
          <div className="p-6">
            <div className="space-y-4">
              {investorActivity.map(activity => (
                <div key={activity.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {activity.investorName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.investorName}</p>
                      <p className="text-sm text-gray-500">{formatDate(activity.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        activity.type === 'INVESTMENT' ? 'text-green-600' : 'text-blue-600'
                      }`}
                    >
                      {activity.type === 'INVESTMENT' ? '+' : ''}
                      {formatCurrency(activity.amount)}
                    </p>
                    <p className="text-xs text-gray-500">{activity.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessOwnerDashboard;
