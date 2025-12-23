import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { adminAPI } from '../utils/api';

interface KYCRequest {
  id: string;
  userId: string;
  userName: string;
  email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  verificationMethod: string;
}

interface BusinessApproval {
  id: string;
  ownerName: string;
  businessName: string;
  category: string;
  targetCapital: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
}

interface PlatformStats {
  totalUsers: number;
  totalInvestments: number;
  totalCapitalRaised: number;
  activeOpportunities: number;
  kycPending: number;
  businessesPending: number;
}

interface UserActivity {
  month: string;
  newUsers: number;
  investments: number;
  transactions: number;
}

type AdminTab = 'overview' | 'kyc' | 'businesses' | 'users';

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [kycRequests, setKycRequests] = useState<KYCRequest[]>([]);
  const [businessApprovals, setBusinessApprovals] = useState<BusinessApproval[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState<AdminTab>('overview');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch dashboard stats
      const statsResponse = await adminAPI.getStats?.();
      if (statsResponse) {
        setStats(statsResponse.data || statsResponse);
      }

      // Fetch pending KYC requests
      const kycResponse = await adminAPI.getPendingKYC?.();
      setKycRequests(Array.isArray(kycResponse) ? kycResponse : kycResponse?.data || []);

      // Fetch pending business approvals
      const bizResponse = await adminAPI.getPendingBusinesses?.();
      setBusinessApprovals(Array.isArray(bizResponse) ? bizResponse : bizResponse?.data || []);

      // Generate user activity data
      generateUserActivity();
    } catch (err) {
      setError('Failed to load admin dashboard. Please try again.');
      console.error('Admin dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateUserActivity = () => {
    const data: UserActivity[] = [
      { month: 'Week 1', newUsers: 25, investments: 15, transactions: 42 },
      { month: 'Week 2', newUsers: 32, investments: 22, transactions: 58 },
      { month: 'Week 3', newUsers: 28, investments: 18, transactions: 51 },
      { month: 'Week 4', newUsers: 41, investments: 35, transactions: 78 },
    ];
    setUserActivity(data);
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

  const handleApproveKYC = async (id: string) => {
    try {
      await adminAPI.approveKYC?.(id);
      fetchAdminData();
    } catch (err) {
      console.error('Error approving KYC:', err);
    }
  };

  const handleRejectKYC = async (id: string) => {
    try {
      await adminAPI.rejectKYC?.(id);
      fetchAdminData();
    } catch (err) {
      console.error('Error rejecting KYC:', err);
    }
  };

  const handleApproveBusiness = async (id: string) => {
    try {
      await adminAPI.approveBusiness?.(id);
      fetchAdminData();
    } catch (err) {
      console.error('Error approving business:', err);
    }
  };

  const handleRejectBusiness = async (id: string) => {
    try {
      await adminAPI.rejectBusiness?.(id);
      fetchAdminData();
    } catch (err) {
      console.error('Error rejecting business:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchAdminData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const statusDistribution = [
    { name: 'Approved', value: kycRequests.filter(k => k.status === 'APPROVED').length, fill: '#10B981' },
    { name: 'Pending', value: kycRequests.filter(k => k.status === 'PENDING').length, fill: '#F59E0B' },
    { name: 'Rejected', value: kycRequests.filter(k => k.status === 'REJECTED').length, fill: '#EF4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg shadow p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-red-100 mt-2">Platform Management & Oversight</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-red-100">Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <p className="text-gray-600 text-sm font-medium">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.totalUsers || 0}</p>
          <p className="text-xs text-green-600 mt-2">↑ 12% this month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <p className="text-gray-600 text-sm font-medium">Total Investments</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{stats?.totalInvestments || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Active transactions</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
          <p className="text-gray-600 text-sm font-medium">Capital Raised</p>
          <p className="text-2xl font-bold text-purple-600 mt-2">{formatCurrency(stats?.totalCapitalRaised || 0)}</p>
          <p className="text-xs text-gray-500 mt-2">Platform total</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-600">
          <p className="text-gray-600 text-sm font-medium">KYC Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-2">{stats?.kycPending || 0}</p>
          <p className="text-xs text-red-600 mt-2">Requires attention</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
          <p className="text-gray-600 text-sm font-medium">Businesses Pending</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{stats?.businessesPending || 0}</p>
          <p className="text-xs text-red-600 mt-2">Awaiting approval</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
          <p className="text-gray-600 text-sm font-medium">Active Opportunities</p>
          <p className="text-2xl font-bold text-indigo-600 mt-2">{stats?.activeOpportunities || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Open for investment</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow border-b">
        <div className="flex border-b overflow-x-auto">
          {(
            [
              { id: 'overview', label: '📊 Overview' },
              { id: 'kyc', label: '🆔 KYC Verification' },
              { id: 'businesses', label: '🏢 Business Approvals' },
              { id: 'users', label: '👥 Users & Activity' },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-colors ${
                selectedTab === tab.id
                  ? 'border-b-2 border-red-600 text-red-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Activity Trend */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity Trend</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={userActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="newUsers"
                      stroke="#3B82F6"
                      name="New Users"
                      dot={{ fill: '#3B82F6', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="transactions"
                      stroke="#10B981"
                      name="Transactions"
                      dot={{ fill: '#10B981', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* KYC Status Distribution */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">KYC Status Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }: { name?: string; value?: number }) => `${name}: ${value}`}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* KYC Verification Tab */}
        {selectedTab === 'kyc' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">KYC Requests</h3>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as FilterStatus)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {kycRequests.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No KYC requests found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Method</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Submitted</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {kycRequests
                      .filter(k => filterStatus === 'ALL' || k.status === filterStatus)
                      .map(kyc => (
                        <tr key={kyc.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{kyc.userName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{kyc.email}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{kyc.verificationMethod}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{formatDate(kyc.submittedAt)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                kyc.status === 'APPROVED'
                                  ? 'bg-green-100 text-green-800'
                                  : kyc.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {kyc.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm space-x-2">
                            {kyc.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApproveKYC(kyc.id)}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectKYC(kyc.id)}
                                  className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Business Approvals Tab */}
        {selectedTab === 'businesses' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Approvals</h3>

            {businessApprovals.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No pending business approvals.</p>
            ) : (
              <div className="space-y-4">
                {businessApprovals.map(biz => (
                  <div key={biz.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{biz.businessName}</h4>
                        <p className="text-sm text-gray-600 mt-1">Owner: {biz.ownerName}</p>
                        <div className="flex items-center space-x-4 mt-3">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{biz.category}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            biz.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : biz.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {biz.status}
                          </span>
                          <span className="text-xs text-gray-600">{formatDate(biz.submittedAt)}</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-600">Target Capital</p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(biz.targetCapital)}</p>
                      </div>
                    </div>
                    {biz.status === 'PENDING' && (
                      <div className="flex space-x-2 mt-4 pt-4 border-t">
                        <button
                          onClick={() => handleApproveBusiness(biz.id)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Approve Business
                        </button>
                        <button
                          onClick={() => handleRejectBusiness(biz.id)}
                          className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Reject Business
                        </button>
                        <button className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">
                          View Details
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users & Activity Tab */}
        {selectedTab === 'users' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Activity</h3>
            <div className="bg-white rounded-lg border p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="newUsers" fill="#3B82F6" name="New Users" />
                  <Bar dataKey="investments" fill="#10B981" name="Investments" />
                  <Bar dataKey="transactions" fill="#F59E0B" name="Transactions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
