/**
 * Business Owner Dashboard Page for InvestGhanaHub
 * Manage businesses and create investment opportunities
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Loader2, 
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';
import { businessAPI, kycAPI } from '../utils/api';
import FormInput from '../components/FormInput';
import DashboardTable from '../components/DashboardTable';

// Ghana regions
const ghanaRegions = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
  'Northern', 'Upper East', 'Upper West', 'Volta', 'Bono',
  'Bono East', 'Ahafo', 'Western North', 'Oti', 'North East', 'Savannah'
];

interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  location: string;
  region: string;
  registrationNumber: string | null;
  targetAmount: number;
  currentAmount: number;
  status: string;
  rejectionReason: string | null;
  opportunities: any[];
  _count: { opportunities: number };
}

export default function OwnerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<string>('');
  
  // Business form modal
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [businessFormData, setBusinessFormData] = useState({
    name: '',
    description: '',
    category: 'crops',
    location: '',
    region: '',
    registrationNumber: '',
    targetAmount: ''
  });
  const [businessErrors, setBusinessErrors] = useState<Record<string, string>>({});
  const [isSubmittingBusiness, setIsSubmittingBusiness] = useState(false);
  
  // Opportunity form modal
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [opportunityFormData, setOpportunityFormData] = useState({
    title: '',
    description: '',
    minInvestment: '',
    maxInvestment: '',
    expectedReturn: '',
    duration: '',
    riskLevel: 'medium',
    targetAmount: '',
    startDate: '',
    endDate: ''
  });
  const [opportunityErrors, setOpportunityErrors] = useState<Record<string, string>>({});
  const [isSubmittingOpportunity, setIsSubmittingOpportunity] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Check KYC status
      const kycResponse = await kycAPI.getStatus();
      setKycStatus(kycResponse.data.status);

      // Fetch businesses
      const businessResponse = await businessAPI.getMyBusinesses();
      setBusinesses(businessResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle business form change
  const handleBusinessChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBusinessFormData(prev => ({ ...prev, [name]: value }));
    if (businessErrors[name]) {
      setBusinessErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle opportunity form change
  const handleOpportunityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setOpportunityFormData(prev => ({ ...prev, [name]: value }));
    if (opportunityErrors[name]) {
      setOpportunityErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate business form
  const validateBusinessForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!businessFormData.name.trim()) errors.name = 'Business name is required';
    if (!businessFormData.description.trim()) errors.description = 'Description is required';
    if (!businessFormData.location.trim()) errors.location = 'Location is required';
    if (!businessFormData.region) errors.region = 'Region is required';
    if (!businessFormData.targetAmount || parseFloat(businessFormData.targetAmount) < 100) {
      errors.targetAmount = 'Target amount must be at least 100 GHS';
    }
    setBusinessErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate opportunity form
  const validateOpportunityForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!opportunityFormData.title.trim()) errors.title = 'Title is required';
    if (!opportunityFormData.description.trim()) errors.description = 'Description is required';
    if (!opportunityFormData.minInvestment || parseFloat(opportunityFormData.minInvestment) < 50) {
      errors.minInvestment = 'Min investment must be at least 50 GHS';
    }
    if (!opportunityFormData.maxInvestment) errors.maxInvestment = 'Max investment is required';
    if (!opportunityFormData.expectedReturn) errors.expectedReturn = 'Expected return is required';
    if (!opportunityFormData.duration) errors.duration = 'Duration is required';
    if (!opportunityFormData.targetAmount) errors.targetAmount = 'Target amount is required';
    if (!opportunityFormData.startDate) errors.startDate = 'Start date is required';
    if (!opportunityFormData.endDate) errors.endDate = 'End date is required';
    setOpportunityErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit business
  const handleSubmitBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBusinessForm()) return;

    if (kycStatus !== 'APPROVED') {
      toast.error('Please complete KYC verification first');
      navigate('/kyc');
      return;
    }

    setIsSubmittingBusiness(true);
    try {
      await businessAPI.create({
        name: businessFormData.name,
        description: businessFormData.description,
        category: businessFormData.category,
        location: businessFormData.location,
        region: businessFormData.region,
        registrationNumber: businessFormData.registrationNumber || undefined,
        targetAmount: parseFloat(businessFormData.targetAmount)
      });
      toast.success('Business created! Awaiting admin approval.');
      setShowBusinessForm(false);
      setBusinessFormData({
        name: '', description: '', category: 'crops', location: '',
        region: '', registrationNumber: '', targetAmount: ''
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create business');
    } finally {
      setIsSubmittingBusiness(false);
    }
  };

  // Submit opportunity
  const handleSubmitOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOpportunityForm() || !selectedBusinessId) return;

    setIsSubmittingOpportunity(true);
    try {
      await businessAPI.createOpportunity(selectedBusinessId, {
        title: opportunityFormData.title,
        description: opportunityFormData.description,
        minInvestment: parseFloat(opportunityFormData.minInvestment),
        maxInvestment: parseFloat(opportunityFormData.maxInvestment),
        expectedReturn: parseFloat(opportunityFormData.expectedReturn),
        duration: parseInt(opportunityFormData.duration),
        riskLevel: opportunityFormData.riskLevel,
        targetAmount: parseFloat(opportunityFormData.targetAmount),
        startDate: opportunityFormData.startDate,
        endDate: opportunityFormData.endDate
      });
      toast.success('Investment opportunity created!');
      setShowOpportunityForm(false);
      setSelectedBusinessId(null);
      setOpportunityFormData({
        title: '', description: '', minInvestment: '', maxInvestment: '',
        expectedReturn: '', duration: '', riskLevel: 'medium', targetAmount: '',
        startDate: '', endDate: ''
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create opportunity');
    } finally {
      setIsSubmittingOpportunity(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <span className="badge-success"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</span>;
      case 'PENDING': return <span className="badge-warning"><Clock className="w-3 h-3 mr-1" />Pending</span>;
      case 'REJECTED': return <span className="badge-danger"><XCircle className="w-3 h-3 mr-1" />Rejected</span>;
      default: return <span className="badge-neutral">{status}</span>;
    }
  };

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
              : 'Complete KYC verification to create businesses'}
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">
              Business Dashboard
            </h1>
            <p className="text-dark-400">Manage your businesses and create investment opportunities</p>
          </div>
          <button
            onClick={() => setShowBusinessForm(true)}
            disabled={kycStatus !== 'APPROVED'}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Business
          </button>
        </div>

        <KYCWarning />

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="stat-card">
            <Building2 className="w-8 h-8 text-ghana-gold-500 mb-4" />
            <div className="stat-value">{businesses.length}</div>
            <div className="stat-label">Total Businesses</div>
          </div>
          <div className="stat-card">
            <CheckCircle2 className="w-8 h-8 text-ghana-green-500 mb-4" />
            <div className="stat-value">{businesses.filter(b => b.status === 'APPROVED').length}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <TrendingUp className="w-8 h-8 text-blue-500 mb-4" />
            <div className="stat-value">
              ₵{businesses.reduce((sum, b) => sum + b.currentAmount, 0).toLocaleString()}
            </div>
            <div className="stat-label">Total Raised</div>
          </div>
          <div className="stat-card">
            <Users className="w-8 h-8 text-purple-500 mb-4" />
            <div className="stat-value">
              {businesses.reduce((sum, b) => sum + b._count.opportunities, 0)}
            </div>
            <div className="stat-label">Active Opportunities</div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-ghana-gold-500 animate-spin" />
          </div>
        ) : (
          /* Businesses List */
          <div className="space-y-6">
            {businesses.map(business => {
              const progress = (business.currentAmount / business.targetAmount) * 100;
              return (
                <div key={business.id} className="card">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{business.name}</h3>
                        {getStatusBadge(business.status)}
                      </div>
                      <p className="text-dark-400 text-sm mb-2">{business.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-dark-500">
                        <span className="capitalize">{business.category}</span>
                        <span>•</span>
                        <span>{business.location}</span>
                        <span>•</span>
                        <span>{business.region}</span>
                      </div>
                    </div>
                    {business.status === 'APPROVED' && (
                      <button
                        onClick={() => { setSelectedBusinessId(business.id); setShowOpportunityForm(true); }}
                        className="btn-secondary text-sm py-2"
                      >
                        <Plus className="w-4 h-4 mr-1 inline" />
                        Add Opportunity
                      </button>
                    )}
                  </div>

                  {business.status === 'REJECTED' && business.rejectionReason && (
                    <div className="mb-4 p-3 bg-ghana-red-500/10 border border-ghana-red-500/30 rounded-lg">
                      <p className="text-sm text-ghana-red-400">
                        <strong>Rejection Reason:</strong> {business.rejectionReason}
                      </p>
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-dark-500">Target Amount</p>
                      <p className="text-lg font-bold">₵{business.targetAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-500">Amount Raised</p>
                      <p className="text-lg font-bold text-ghana-green-500">₵{business.currentAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-500">Opportunities</p>
                      <p className="text-lg font-bold">{business._count.opportunities}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-dark-400">Funding Progress</span>
                      <span className="text-dark-300">{Math.round(progress)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                  </div>

                  {/* Opportunities list */}
                  {business.opportunities.length > 0 && (
                    <div className="pt-4 border-t border-dark-700">
                      <h4 className="text-sm font-medium text-dark-400 mb-3">Investment Opportunities</h4>
                      <div className="grid gap-3">
                        {business.opportunities.map((opp: any) => (
                          <div key={opp.id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                            <div>
                              <p className="font-medium">{opp.title}</p>
                              <p className="text-xs text-dark-500">
                                {opp.status === 'OPEN' ? 'Open' : opp.status} • {opp.expectedReturn}% return
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">₵{opp.currentAmount?.toLocaleString() || 0}</p>
                              <p className="text-xs text-dark-500">of ₵{opp.targetAmount?.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {businesses.length === 0 && (
              <div className="card text-center py-12">
                <Building2 className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                <p className="text-dark-400 mb-4">No businesses yet</p>
                <button
                  onClick={() => setShowBusinessForm(true)}
                  disabled={kycStatus !== 'APPROVED'}
                  className="btn-primary"
                >
                  Create Your First Business
                </button>
              </div>
            )}
          </div>
        )}

        {/* Business Form Modal */}
        {showBusinessForm && (
          <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="card max-w-lg w-full my-8 animate-slide-up">
              <h3 className="text-xl font-display font-bold mb-6">Add New Business</h3>
              
              <form onSubmit={handleSubmitBusiness} className="space-y-4">
                <FormInput
                  label="Business Name"
                  name="name"
                  value={businessFormData.name}
                  onChange={handleBusinessChange}
                  placeholder="GhanaGrow Farm"
                  error={businessErrors.name}
                />

                <div>
                  <label className="label">Description</label>
                  <textarea
                    name="description"
                    value={businessFormData.description}
                    onChange={handleBusinessChange}
                    placeholder="Describe your business..."
                    rows={3}
                    className={`input ${businessErrors.description ? 'border-ghana-red-500' : ''}`}
                  />
                  {businessErrors.description && (
                    <p className="text-sm text-ghana-red-400 mt-1">{businessErrors.description}</p>
                  )}
                </div>

                <div>
                  <label className="label">Category</label>
                  <select
                    name="category"
                    value={businessFormData.category}
                    onChange={handleBusinessChange}
                    className="select"
                  >
                    <option value="crops">Agriculture (Crops)</option>
                    <option value="startup">Startup</option>
                    <option value="operational">Operational Business</option>
                  </select>
                </div>

                <FormInput
                  label="Location"
                  name="location"
                  value={businessFormData.location}
                  onChange={handleBusinessChange}
                  placeholder="Koforidua, Eastern Region"
                  error={businessErrors.location}
                />

                <div>
                  <label className="label">Region</label>
                  <select
                    name="region"
                    value={businessFormData.region}
                    onChange={handleBusinessChange}
                    className={`select ${businessErrors.region ? 'border-ghana-red-500' : ''}`}
                  >
                    <option value="">Select region</option>
                    {ghanaRegions.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {businessErrors.region && (
                    <p className="text-sm text-ghana-red-400 mt-1">{businessErrors.region}</p>
                  )}
                </div>

                <FormInput
                  label="Business Registration Number (Optional)"
                  name="registrationNumber"
                  value={businessFormData.registrationNumber}
                  onChange={handleBusinessChange}
                  placeholder="BN-2024-XXXXXX"
                />

                <FormInput
                  label="Target Funding Amount (GHS)"
                  name="targetAmount"
                  type="number"
                  value={businessFormData.targetAmount}
                  onChange={handleBusinessChange}
                  placeholder="100000"
                  error={businessErrors.targetAmount}
                />

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBusinessForm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBusiness}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {isSubmittingBusiness ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />Creating...</>
                    ) : 'Create Business'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Opportunity Form Modal */}
        {showOpportunityForm && (
          <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="card max-w-lg w-full my-8 animate-slide-up">
              <h3 className="text-xl font-display font-bold mb-6">Create Investment Opportunity</h3>
              
              <form onSubmit={handleSubmitOpportunity} className="space-y-4">
                <FormInput
                  label="Title"
                  name="title"
                  value={opportunityFormData.title}
                  onChange={handleOpportunityChange}
                  placeholder="Maize Planting Season 2024"
                  error={opportunityErrors.title}
                />

                <div>
                  <label className="label">Description</label>
                  <textarea
                    name="description"
                    value={opportunityFormData.description}
                    onChange={handleOpportunityChange}
                    placeholder="Describe the investment opportunity..."
                    rows={3}
                    className={`input ${opportunityErrors.description ? 'border-ghana-red-500' : ''}`}
                  />
                  {opportunityErrors.description && (
                    <p className="text-sm text-ghana-red-400 mt-1">{opportunityErrors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Min Investment (GHS)"
                    name="minInvestment"
                    type="number"
                    value={opportunityFormData.minInvestment}
                    onChange={handleOpportunityChange}
                    placeholder="500"
                    error={opportunityErrors.minInvestment}
                  />
                  <FormInput
                    label="Max Investment (GHS)"
                    name="maxInvestment"
                    type="number"
                    value={opportunityFormData.maxInvestment}
                    onChange={handleOpportunityChange}
                    placeholder="20000"
                    error={opportunityErrors.maxInvestment}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Expected Return (%)"
                    name="expectedReturn"
                    type="number"
                    value={opportunityFormData.expectedReturn}
                    onChange={handleOpportunityChange}
                    placeholder="18"
                    error={opportunityErrors.expectedReturn}
                  />
                  <FormInput
                    label="Duration (months)"
                    name="duration"
                    type="number"
                    value={opportunityFormData.duration}
                    onChange={handleOpportunityChange}
                    placeholder="6"
                    error={opportunityErrors.duration}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Risk Level</label>
                    <select
                      name="riskLevel"
                      value={opportunityFormData.riskLevel}
                      onChange={handleOpportunityChange}
                      className="select"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <FormInput
                    label="Target Amount (GHS)"
                    name="targetAmount"
                    type="number"
                    value={opportunityFormData.targetAmount}
                    onChange={handleOpportunityChange}
                    placeholder="75000"
                    error={opportunityErrors.targetAmount}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Start Date"
                    name="startDate"
                    type="date"
                    value={opportunityFormData.startDate}
                    onChange={handleOpportunityChange}
                    error={opportunityErrors.startDate}
                  />
                  <FormInput
                    label="End Date"
                    name="endDate"
                    type="date"
                    value={opportunityFormData.endDate}
                    onChange={handleOpportunityChange}
                    error={opportunityErrors.endDate}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowOpportunityForm(false); setSelectedBusinessId(null); }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOpportunity}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {isSubmittingOpportunity ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />Creating...</>
                    ) : 'Create Opportunity'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

