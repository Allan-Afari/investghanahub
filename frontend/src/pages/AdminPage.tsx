/**
 * Admin Dashboard Page for InvestGhanaHub
 * Manage KYC approvals, businesses, fraud alerts, and audit logs
 */

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Shield, 
  AlertTriangle,
  FileText,
  Loader2,
  TrendingUp,
  Eye
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, kycAPI, businessAPI } from '../utils/api';
import DashboardTable from '../components/DashboardTable';

type TabType = 'dashboard' | 'kyc' | 'businesses' | 'fraud' | 'audit' | 'users';

type ActionType = 'kyc-approve' | 'kyc-reject' | 'biz-approve' | 'biz-reject' | 'fraud' | '';

interface ApiErrorShape {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface RecentInvestment {
  investor: string;
  opportunity: string;
  amount: number;
  date: string;
}

interface RecentBusiness {
  name: string;
  category: string;
  status: string;
}

interface PendingKYC {
  id: string;
  region: string;
  ghanaCardMasked: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PendingBusiness {
  id: string;
  name: string;
  region: string;
  category: string;
  targetAmount: number;
  owner: {
    firstName: string;
    lastName: string;
  };
}

interface FraudAlert {
  id: string;
  alertType: string;
  description: string;
  riskScore: number;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
  admin?: {
    firstName: string;
  } | null;
}

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  kycStatus?: string | null;
  isActive: boolean;
  createdAt: string;
}

type SelectedItem = PendingKYC | PendingBusiness | FraudAlert;

function isPendingKYC(item: SelectedItem): item is PendingKYC {
  return (item as PendingKYC).user !== undefined;
}

function isPendingBusiness(item: SelectedItem): item is PendingBusiness {
  return (item as PendingBusiness).owner !== undefined;
}

function isFraudAlert(item: SelectedItem): item is FraudAlert {
  return (item as FraudAlert).alertType !== undefined;
}

interface DashboardStats {
  users: { total: number; investors: number; businessOwners: number };
  businesses: { total: number; approved: number; pending: number };
  investments: { total: number; totalAmount: number; last30Days: { count: number; amount: number } };
  pending: { kyc: number; fraudAlerts: number };
  recentActivity: { investments: RecentInvestment[]; businesses: RecentBusiness[] };
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  
  // Data states
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [pendingKYCs, setPendingKYCs] = useState<PendingKYC[]>([]);
  const [pendingBusinesses, setPendingBusinesses] = useState<PendingBusiness[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  
  // Modal states
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [actionType, setActionType] = useState<ActionType>('');
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch data based on active tab
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      switch (activeTab) {
        case 'dashboard':
          {
            const dashResponse = await adminAPI.getDashboard();
            setDashboardStats(dashResponse.data);
            break;
          }
        case 'kyc':
          {
            const kycResponse = await kycAPI.getPending();
            setPendingKYCs((kycResponse.data || []) as PendingKYC[]);
            break;
          }
        case 'businesses':
          {
            const bizResponse = await businessAPI.getPending();
            setPendingBusinesses((bizResponse.data || []) as PendingBusiness[]);
            break;
          }
        case 'fraud':
          {
            const fraudResponse = await adminAPI.listFraudAlerts({ status: 'PENDING' });
            setFraudAlerts((fraudResponse.data.alerts || []) as FraudAlert[]);
            break;
          }
        case 'audit':
          {
            const auditResponse = await adminAPI.listAuditLogs({ limit: 100 });
            setAuditLogs((auditResponse.data.logs || []) as AuditLog[]);
            break;
          }
        case 'users':
          {
            const usersResponse = await adminAPI.listUsers({ limit: 100 });
            setUsers((usersResponse.data.users || []) as UserRow[]);
            break;
          }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle KYC actions
  const handleKYCAction = async (action: 'approve' | 'reject') => {
    if (!selectedItem || !isPendingKYC(selectedItem)) return;
    if (action === 'reject' && !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsProcessing(true);
    try {
      if (action === 'approve') {
        await kycAPI.approve(selectedItem.id);
        toast.success('KYC approved successfully');
      } else {
        await kycAPI.reject(selectedItem.id, rejectReason);
        toast.success('KYC rejected');
      }
      setSelectedItem(null);
      setRejectReason('');
      fetchData();
    } catch (error: unknown) {
      const err = error as ApiErrorShape;
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Business actions
  const handleBusinessAction = async (action: 'approve' | 'reject') => {
    if (!selectedItem || !isPendingBusiness(selectedItem)) return;
    if (action === 'reject' && !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsProcessing(true);
    try {
      if (action === 'approve') {
        await businessAPI.approve(selectedItem.id);
        toast.success('Business approved successfully');
      } else {
        await businessAPI.reject(selectedItem.id, rejectReason);
        toast.success('Business rejected');
      }
      setSelectedItem(null);
      setRejectReason('');
      fetchData();
    } catch (error: unknown) {
      const err = error as ApiErrorShape;
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Fraud Alert resolution
  const handleFraudAction = async (action: 'RESOLVED' | 'DISMISSED') => {
    if (!selectedItem || !isFraudAlert(selectedItem) || !rejectReason.trim()) {
      toast.error('Please provide resolution notes');
      return;
    }

    setIsProcessing(true);
    try {
      await adminAPI.resolveFraudAlert(selectedItem.id, rejectReason, action);
      toast.success(`Fraud alert ${action.toLowerCase()}`);
      setSelectedItem(null);
      setRejectReason('');
      fetchData();
    } catch (error: unknown) {
      const err = error as ApiErrorShape;
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle user status
  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminAPI.updateUserStatus(userId, !currentStatus);
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch (error: unknown) {
      const err = error as ApiErrorShape;
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  // Tab items
  const tabs: Array<{ id: TabType; label: string; icon: LucideIcon; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kyc', label: 'KYC Approvals', icon: Shield, badge: dashboardStats?.pending.kyc },
    { id: 'businesses', label: 'Businesses', icon: Building2 },
    { id: 'fraud', label: 'Fraud Alerts', icon: AlertTriangle, badge: dashboardStats?.pending.fraudAlerts },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Admin Dashboard</h1>
          <p className="text-dark-400">Manage platform operations and compliance</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-ghana-gold-500 text-dark-950 font-medium'
                  : 'text-dark-400 hover:bg-dark-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-ghana-red-500 text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-ghana-gold-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && dashboardStats && (
              <div>
                {/* Stats Grid */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                  <div className="stat-card">
                    <Users className="w-8 h-8 text-blue-500 mb-4" />
                    <div className="stat-value">{dashboardStats.users.total}</div>
                    <div className="stat-label">Total Users</div>
                  </div>
                  <div className="stat-card">
                    <Building2 className="w-8 h-8 text-ghana-gold-500 mb-4" />
                    <div className="stat-value">{dashboardStats.businesses.approved}</div>
                    <div className="stat-label">Approved Businesses</div>
                  </div>
                  <div className="stat-card">
                    <TrendingUp className="w-8 h-8 text-ghana-green-500 mb-4" />
                    <div className="stat-value">₵{(dashboardStats.investments.totalAmount || 0).toLocaleString()}</div>
                    <div className="stat-label">Total Invested</div>
                  </div>
                  <div className="stat-card">
                    <AlertTriangle className="w-8 h-8 text-ghana-red-500 mb-4" />
                    <div className="stat-value">{dashboardStats.pending.fraudAlerts}</div>
                    <div className="stat-label">Pending Alerts</div>
                  </div>
                </div>

                {/* Pending Items */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="card">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-ghana-gold-500" />
                      Pending KYC ({dashboardStats.pending.kyc})
                    </h3>
                    {dashboardStats.pending.kyc > 0 ? (
                      <button
                        onClick={() => setActiveTab('kyc')}
                        className="btn-secondary w-full text-sm"
                      >
                        Review KYC Submissions
                      </button>
                    ) : (
                      <p className="text-dark-500 text-sm">No pending KYC submissions</p>
                    )}
                  </div>
                  <div className="card">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      Pending Businesses ({dashboardStats.businesses.pending})
                    </h3>
                    {dashboardStats.businesses.pending > 0 ? (
                      <button
                        onClick={() => setActiveTab('businesses')}
                        className="btn-secondary w-full text-sm"
                      >
                        Review Business Applications
                      </button>
                    ) : (
                      <p className="text-dark-500 text-sm">No pending business applications</p>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="card">
                    <h3 className="font-semibold mb-4">Recent Investments</h3>
                    {dashboardStats.recentActivity.investments.map((inv, i) => (
                      <div key={`${inv.investor}-${inv.opportunity}-${i}`} className="flex justify-between py-3 border-b border-dark-800 last:border-0">
                        <div>
                          <p className="font-medium">{inv.investor}</p>
                          <p className="text-xs text-dark-500">{inv.opportunity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-ghana-green-500">₵{inv.amount.toLocaleString()}</p>
                          <p className="text-xs text-dark-500">{new Date(inv.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                    {dashboardStats.recentActivity.investments.length === 0 && (
                      <p className="text-dark-500 text-sm">No recent investments</p>
                    )}
                  </div>
                  <div className="card">
                    <h3 className="font-semibold mb-4">Recent Businesses</h3>
                    {dashboardStats.recentActivity.businesses.map((biz, i) => (
                      <div key={`${biz.name}-${i}`} className="flex justify-between items-center py-3 border-b border-dark-800 last:border-0">
                        <div>
                          <p className="font-medium">{biz.name}</p>
                          <p className="text-xs text-dark-500 capitalize">{biz.category}</p>
                        </div>
                        <span className={`badge-${biz.status === 'APPROVED' ? 'success' : biz.status === 'PENDING' ? 'warning' : 'danger'}`}>
                          {biz.status}
                        </span>
                      </div>
                    ))}
                    {dashboardStats.recentActivity.businesses.length === 0 && (
                      <p className="text-dark-500 text-sm">No recent businesses</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* KYC Tab */}
            {activeTab === 'kyc' && (
              <DashboardTable
                columns={[
                  { key: 'user', label: 'User' },
                  { key: 'region', label: 'Region' },
                  { key: 'ghanaCard', label: 'Ghana Card' },
                  { key: 'submitted', label: 'Submitted' },
                  { key: 'actions', label: 'Actions' }
                ]}
                data={pendingKYCs.map(kyc => ({
                  user: (
                    <div>
                      <p className="font-medium">{kyc.user.firstName} {kyc.user.lastName}</p>
                      <p className="text-xs text-dark-500">{kyc.user.email}</p>
                    </div>
                  ),
                  region: kyc.region,
                  ghanaCard: kyc.ghanaCardMasked,
                  submitted: new Date(kyc.createdAt).toLocaleDateString(),
                  actions: (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedItem(kyc); setActionType('kyc-approve'); }}
                        className="btn-success py-1 px-3 text-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setSelectedItem(kyc); setActionType('kyc-reject'); }}
                        className="btn-danger py-1 px-3 text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  )
                }))}
                emptyMessage="No pending KYC submissions"
              />
            )}

            {/* Businesses Tab */}
            {activeTab === 'businesses' && (
              <DashboardTable
                columns={[
                  { key: 'business', label: 'Business' },
                  { key: 'owner', label: 'Owner' },
                  { key: 'category', label: 'Category' },
                  { key: 'target', label: 'Target' },
                  { key: 'actions', label: 'Actions' }
                ]}
                data={pendingBusinesses.map(biz => ({
                  business: (
                    <div>
                      <p className="font-medium">{biz.name}</p>
                      <p className="text-xs text-dark-500">{biz.region}</p>
                    </div>
                  ),
                  owner: `${biz.owner.firstName} ${biz.owner.lastName}`,
                  category: <span className="capitalize">{biz.category}</span>,
                  target: `₵${biz.targetAmount.toLocaleString()}`,
                  actions: (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedItem(biz); setActionType('biz-approve'); }}
                        className="btn-success py-1 px-3 text-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setSelectedItem(biz); setActionType('biz-reject'); }}
                        className="btn-danger py-1 px-3 text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  )
                }))}
                emptyMessage="No pending business applications"
              />
            )}

            {/* Fraud Alerts Tab */}
            {activeTab === 'fraud' && (
              <DashboardTable
                columns={[
                  { key: 'user', label: 'User' },
                  { key: 'type', label: 'Alert Type' },
                  { key: 'risk', label: 'Risk Score' },
                  { key: 'description', label: 'Description' },
                  { key: 'actions', label: 'Actions' }
                ]}
                data={fraudAlerts.map(alert => ({
                  user: (
                    <div>
                      <p className="font-medium">{alert.user.firstName} {alert.user.lastName}</p>
                      <p className="text-xs text-dark-500">{alert.user.email}</p>
                    </div>
                  ),
                  type: <span className="badge-danger">{alert.alertType}</span>,
                  risk: (
                    <span className={`font-bold ${alert.riskScore >= 60 ? 'text-ghana-red-500' : 'text-ghana-gold-500'}`}>
                      {alert.riskScore}%
                    </span>
                  ),
                  description: <span className="text-sm">{alert.description.substring(0, 50)}...</span>,
                  actions: (
                    <button
                      onClick={() => { setSelectedItem(alert); setActionType('fraud'); }}
                      className="btn-secondary py-1 px-3 text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1 inline" />
                      Review
                    </button>
                  )
                }))}
                emptyMessage="No pending fraud alerts"
              />
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <DashboardTable
                columns={[
                  { key: 'user', label: 'User' },
                  { key: 'role', label: 'Role' },
                  { key: 'kyc', label: 'KYC Status' },
                  { key: 'status', label: 'Status' },
                  { key: 'joined', label: 'Joined' },
                  { key: 'actions', label: 'Actions' }
                ]}
                data={users.map(user => ({
                  user: (
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-dark-500">{user.email}</p>
                    </div>
                  ),
                  role: <span className="badge-neutral capitalize">{user.role.toLowerCase().replace('_', ' ')}</span>,
                  kyc: (
                    <span className={`badge-${user.kycStatus === 'APPROVED' ? 'success' : user.kycStatus === 'PENDING' ? 'warning' : 'neutral'}`}>
                      {user.kycStatus || 'Not Submitted'}
                    </span>
                  ),
                  status: user.isActive ? (
                    <span className="badge-success">Active</span>
                  ) : (
                    <span className="badge-danger">Inactive</span>
                  ),
                  joined: new Date(user.createdAt).toLocaleDateString(),
                  actions: user.role !== 'ADMIN' && (
                    <button
                      onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                      className={`${user.isActive ? 'btn-danger' : 'btn-success'} py-1 px-3 text-xs`}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )
                }))}
                emptyMessage="No users found"
              />
            )}

            {/* Audit Logs Tab */}
            {activeTab === 'audit' && (
              <DashboardTable
                columns={[
                  { key: 'user', label: 'User' },
                  { key: 'action', label: 'Action' },
                  { key: 'entity', label: 'Entity' },
                  { key: 'timestamp', label: 'Timestamp' }
                ]}
                data={auditLogs.map(log => ({
                  user: (
                    <div>
                      <p className="font-medium">{log.user.firstName} {log.user.lastName}</p>
                      {log.admin && (
                        <p className="text-xs text-dark-500">Admin: {log.admin.firstName}</p>
                      )}
                    </div>
                  ),
                  action: <span className="badge-info">{log.action}</span>,
                  entity: log.entity,
                  timestamp: new Date(log.createdAt).toLocaleString()
                }))}
                emptyMessage="No audit logs"
              />
            )}
          </>
        )}

        {/* Action Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card max-w-md w-full animate-slide-up">
              {actionType === 'kyc-approve' && isPendingKYC(selectedItem) && (
                <>
                  <h3 className="text-xl font-display font-bold mb-4">Approve KYC</h3>
                  <p className="text-dark-400 mb-6">
                    Approve KYC for <strong>{selectedItem.user.firstName} {selectedItem.user.lastName}</strong>?
                  </p>
                  <div className="flex gap-4">
                    <button onClick={() => setSelectedItem(null)} className="btn-secondary flex-1">Cancel</button>
                    <button
                      onClick={() => handleKYCAction('approve')}
                      disabled={isProcessing}
                      className="btn-success flex-1"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Approve'}
                    </button>
                  </div>
                </>
              )}

              {actionType === 'kyc-reject' && isPendingKYC(selectedItem) && (
                <>
                  <h3 className="text-xl font-display font-bold mb-4">Reject KYC</h3>
                  <div className="mb-4">
                    <label className="label">Rejection Reason</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Please provide a reason..."
                      rows={3}
                      className="input"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => { setSelectedItem(null); setRejectReason(''); }} className="btn-secondary flex-1">Cancel</button>
                    <button
                      onClick={() => handleKYCAction('reject')}
                      disabled={isProcessing || !rejectReason.trim()}
                      className="btn-danger flex-1"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Reject'}
                    </button>
                  </div>
                </>
              )}

              {actionType === 'biz-approve' && isPendingBusiness(selectedItem) && (
                <>
                  <h3 className="text-xl font-display font-bold mb-4">Approve Business</h3>
                  <p className="text-dark-400 mb-6">
                    Approve <strong>{selectedItem.name}</strong>?
                  </p>
                  <div className="flex gap-4">
                    <button onClick={() => setSelectedItem(null)} className="btn-secondary flex-1">Cancel</button>
                    <button
                      onClick={() => handleBusinessAction('approve')}
                      disabled={isProcessing}
                      className="btn-success flex-1"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Approve'}
                    </button>
                  </div>
                </>
              )}

              {actionType === 'biz-reject' && isPendingBusiness(selectedItem) && (
                <>
                  <h3 className="text-xl font-display font-bold mb-4">Reject Business</h3>
                  <div className="mb-4">
                    <label className="label">Rejection Reason</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Please provide a reason..."
                      rows={3}
                      className="input"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => { setSelectedItem(null); setRejectReason(''); }} className="btn-secondary flex-1">Cancel</button>
                    <button
                      onClick={() => handleBusinessAction('reject')}
                      disabled={isProcessing || !rejectReason.trim()}
                      className="btn-danger flex-1"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Reject'}
                    </button>
                  </div>
                </>
              )}

              {actionType === 'fraud' && isFraudAlert(selectedItem) && (
                <>
                  <h3 className="text-xl font-display font-bold mb-4">Review Fraud Alert</h3>
                  <div className="bg-dark-800/50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-dark-400 mb-2">{selectedItem.description}</p>
                    <p className="text-xs text-dark-500">Risk Score: <span className="text-ghana-red-500 font-bold">{selectedItem.riskScore}%</span></p>
                  </div>
                  <div className="mb-4">
                    <label className="label">Resolution Notes</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Add resolution notes..."
                      rows={3}
                      className="input"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => { setSelectedItem(null); setRejectReason(''); }} className="btn-secondary flex-1">Cancel</button>
                    <button
                      onClick={() => handleFraudAction('DISMISSED')}
                      disabled={isProcessing || !rejectReason.trim()}
                      className="btn-secondary flex-1"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleFraudAction('RESOLVED')}
                      disabled={isProcessing || !rejectReason.trim()}
                      className="btn-danger flex-1"
                    >
                      Resolve
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

