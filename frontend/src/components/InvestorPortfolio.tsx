import React, { useState, useEffect } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { investmentAPI } from '../utils/api';

interface Investment {
  id: string;
  businessName: string;
  amount: number;
  investedAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  expectedReturn: number;
  maturityDate: string;
  returnPercentage: number;
}

interface PortfolioStats {
  totalInvested: number;
  totalReturns: number;
  activeInvestments: number;
  portfolioValue: number;
  roi: number;
}

interface PerformanceData {
  month: string;
  value: number;
  returns: number;
}

const InvestorPortfolio: React.FC = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('3M');

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch user's investments
      const investmentsResponse = await investmentAPI.getMyInvestments();
      const investmentsData = Array.isArray(investmentsResponse) ? investmentsResponse : investmentsResponse.data || [];
      setInvestments(investmentsData);

      // Calculate portfolio statistics
      calculateStats(investmentsData);

      // Generate performance chart data
      generatePerformanceData();
    } catch (err) {
      setError('Failed to load portfolio data. Please try again.');
      console.error('Portfolio fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (investmentsData: Investment[]) => {
    const totalInvested = investmentsData.reduce((sum, inv) => sum + inv.amount, 0);
    const totalReturns = investmentsData.reduce((sum, inv) => sum + inv.expectedReturn, 0);
    const activeCount = investmentsData.filter(inv => inv.status === 'ACTIVE').length;
    const portfolioValue = totalInvested + totalReturns;
    const roi = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : '0.00';

    setStats({
      totalInvested,
      totalReturns,
      activeInvestments: activeCount,
      portfolioValue,
      roi: parseFloat(roi as string),
    });
  };

  const generatePerformanceData = () => {
    // Generate mock performance data for demonstration
    const data: PerformanceData[] = [
      { month: 'Jan', value: 50000, returns: 1500 },
      { month: 'Feb', value: 65000, returns: 2100 },
      { month: 'Mar', value: 72000, returns: 2800 },
      { month: 'Apr', value: 85000, returns: 3500 },
      { month: 'May', value: 92000, returns: 4200 },
      { month: 'Jun', value: 105000, returns: 5100 },
    ];
    setPerformanceData(data);
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
          <p className="text-gray-600">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchPortfolioData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <p className="text-gray-600 text-sm font-medium">Total Invested</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {stats ? formatCurrency(stats.totalInvested) : '₵0'}
          </p>
          <p className="text-xs text-gray-500 mt-2">Across all investments</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <p className="text-gray-600 text-sm font-medium">Expected Returns</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {stats ? formatCurrency(stats.totalReturns) : '₵0'}
          </p>
          <p className="text-xs text-gray-500 mt-2">Projected earnings</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
          <p className="text-gray-600 text-sm font-medium">Portfolio Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {stats ? formatCurrency(stats.portfolioValue) : '₵0'}
          </p>
          <p className="text-xs text-gray-500 mt-2">Current valuation</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-600">
          <p className="text-gray-600 text-sm font-medium">Active Investments</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.activeInvestments || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Ongoing opportunities</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-rose-600">
          <p className="text-gray-600 text-sm font-medium">ROI</p>
          <p className="text-2xl font-bold text-rose-600 mt-2">{stats?.roi.toFixed(2)}%</p>
          <p className="text-xs text-gray-500 mt-2">Return on investment</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Growth Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Portfolio Growth</h3>
            <div className="space-x-2">
              {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 text-sm rounded ${
                    selectedPeriod === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: unknown) => formatCurrency(value as number)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                name="Portfolio Value"
                dot={{ fill: '#3B82F6', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="returns"
                stroke="#10B981"
                name="Accumulated Returns"
                dot={{ fill: '#10B981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Investment Distribution Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={investments.slice(0, 5)}
                dataKey="amount"
                nameKey="businessName"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ businessName, percent }: { businessName?: string; percent?: number }) =>
                  `${businessName}: ${(((percent ?? 0) * 100).toFixed(0))}%`}
              >
                {investments.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: unknown) => formatCurrency(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Investments Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Investments</h3>
        {investments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">You haven't made any investments yet.</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Explore Opportunities
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Business</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Invested Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Maturity Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Expected Return</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {investments.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.businessName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatCurrency(inv.amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(inv.investedAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(inv.maturityDate)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">
                      {formatCurrency(inv.expectedReturn)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          inv.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : inv.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {inv.returnPercentage.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {investments.slice(0, 3).map(inv => (
            <div key={inv.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                  {inv.businessName.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">Investment in {inv.businessName}</p>
                  <p className="text-sm text-gray-500">{formatDate(inv.investedAt)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatCurrency(inv.amount)}</p>
                <p className="text-sm text-green-600">+{formatCurrency(inv.expectedReturn)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InvestorPortfolio;
