/**
 * KYC Page for InvestGhanaHub
 * Know Your Customer verification form for Ghana compliance
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2,
  CreditCard,
  MapPin,
  Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';
import { kycAPI } from '../utils/api';
import FormInput from '../components/FormInput';

interface ApiErrorShape {
  response?: {
    data?: {
      message?: string;
    };
  };
}

// Ghana regions
const ghanaRegions = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
  'Northern', 'Upper East', 'Upper West', 'Volta', 'Bono',
  'Bono East', 'Ahafo', 'Western North', 'Oti', 'North East', 'Savannah'
];

interface KYCStatus {
  status: string;
  details?: {
    id: string;
    ghanaCardMasked: string;
    dateOfBirth: string;
    address: string;
    city: string;
    region: string;
    occupation: string | null;
    sourceOfFunds: string | null;
    rejectionReason: string | null;
  };
}

export default function KYCPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    ghanaCardNumber: '',
    dateOfBirth: '',
    address: '',
    city: '',
    region: '',
    occupation: '',
    sourceOfFunds: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch KYC status on mount
  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      const response = await kycAPI.getStatus();
      setKycStatus(response.data);
      
      // Pre-fill form if KYC exists and is rejected/pending
      if (response.data.details && response.data.status !== 'APPROVED') {
        const d = response.data.details;
        setFormData({
          ghanaCardNumber: '', // Don't pre-fill for security
          dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth).toISOString().split('T')[0] : '',
          address: d.address || '',
          city: d.city || '',
          region: d.region || '',
          occupation: d.occupation || '',
          sourceOfFunds: d.sourceOfFunds || ''
        });
      }
    } catch (error) {
      console.error('Error fetching KYC status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.ghanaCardNumber) {
      newErrors.ghanaCardNumber = 'Ghana Card number is required';
    } else if (!/^GHA-\d{9}-\d$/.test(formData.ghanaCardNumber.toUpperCase())) {
      newErrors.ghanaCardNumber = 'Invalid format. Use GHA-XXXXXXXXX-X';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old';
      }
    }

    if (!formData.address) {
      newErrors.address = 'Address is required';
    }

    if (!formData.city) {
      newErrors.city = 'City is required';
    }

    if (!formData.region) {
      newErrors.region = 'Region is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        ghanaCardNumber: formData.ghanaCardNumber.toUpperCase()
      };

      if (kycStatus?.status === 'REJECTED') {
        await kycAPI.update(submitData);
      } else {
        await kycAPI.submit(submitData);
      }

      toast.success('KYC submitted successfully! Awaiting admin approval.');
      fetchKYCStatus();
      setShowForm(false);
    } catch (error: unknown) {
      const err = error as ApiErrorShape;
      const message = err.response?.data?.message || 'Failed to submit KYC';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get dashboard link based on role
  const getDashboardLink = () => {
    if (user?.role === 'BUSINESS_OWNER') return '/owner';
    return '/investor';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-ghana-gold-500 animate-spin" />
      </div>
    );
  }

  // Status display component
  const StatusDisplay = () => {
    switch (kycStatus?.status) {
      case 'APPROVED':
        return (
          <div className="card bg-ghana-green-500/10 border-ghana-green-500/30 text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-ghana-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold mb-2 text-ghana-green-400">
              KYC Verified
            </h2>
            <p className="text-dark-400 mb-6">
              Your identity has been verified. You can now make investments.
            </p>
            <button
              onClick={() => navigate(getDashboardLink())}
              className="btn-primary"
            >
              Go to Dashboard
            </button>
          </div>
        );

      case 'PENDING':
        return (
          <div className="card bg-ghana-gold-500/10 border-ghana-gold-500/30 text-center py-12">
            <Clock className="w-16 h-16 text-ghana-gold-500 mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold mb-2 text-ghana-gold-400">
              KYC Under Review
            </h2>
            <p className="text-dark-400 mb-2">
              Your KYC submission is being reviewed by our team.
            </p>
            <p className="text-dark-500 text-sm mb-6">
              This usually takes 1-2 business days.
            </p>
            
            {kycStatus.details && (
              <div className="bg-dark-800/50 rounded-xl p-4 max-w-md mx-auto text-left mb-6">
                <p className="text-sm text-dark-400">
                  <span className="text-dark-500">Ghana Card:</span> {kycStatus.details.ghanaCardMasked}
                </p>
                <p className="text-sm text-dark-400">
                  <span className="text-dark-500">Region:</span> {kycStatus.details.region}
                </p>
              </div>
            )}
            
            <button
              onClick={() => navigate(getDashboardLink())}
              className="btn-secondary"
            >
              Go to Dashboard
            </button>
          </div>
        );

      case 'REJECTED':
        return (
          <div className="card bg-ghana-red-500/10 border-ghana-red-500/30 text-center py-12">
            <AlertCircle className="w-16 h-16 text-ghana-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold mb-2 text-ghana-red-400">
              KYC Rejected
            </h2>
            <p className="text-dark-400 mb-2">
              Your KYC submission was not approved.
            </p>
            {kycStatus.details?.rejectionReason && (
              <p className="text-ghana-red-400 text-sm mb-6 bg-ghana-red-500/10 rounded-lg p-3 max-w-md mx-auto">
                Reason: {kycStatus.details.rejectionReason}
              </p>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Resubmit KYC
            </button>
          </div>
        );

      default:
        return (
          <div className="card text-center py-12">
            <Shield className="w-16 h-16 text-dark-500 mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold mb-2">
              Complete Your KYC
            </h2>
            <p className="text-dark-400 mb-6">
              Verify your identity to start investing on InvestGhanaHub
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Start Verification
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container-custom max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">KYC Verification</h1>
          <p className="text-dark-400">
            Complete identity verification for Ghana compliance
          </p>
        </div>

        {!showForm ? (
          <StatusDisplay />
        ) : (
          /* KYC Form */
          <div className="card">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-dark-700">
              <Shield className="w-6 h-6 text-ghana-gold-500" />
              <div>
                <h2 className="font-semibold text-lg">Identity Verification</h2>
                <p className="text-sm text-dark-500">All information is encrypted and secure</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Ghana Card Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-dark-300">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-medium">Ghana Card Details</span>
                </div>
                
                <FormInput
                  label="Ghana Card Number"
                  name="ghanaCardNumber"
                  value={formData.ghanaCardNumber}
                  onChange={handleChange}
                  placeholder="GHA-123456789-0"
                  error={errors.ghanaCardNumber}
                  helpText="Format: GHA-XXXXXXXXX-X"
                />

                <FormInput
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  error={errors.dateOfBirth}
                />
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-dark-300">
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">Address Information</span>
                </div>

                <FormInput
                  label="Street Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Independence Avenue"
                  error={errors.address}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Accra"
                    error={errors.city}
                  />

                  <div>
                    <label className="label">Region</label>
                    <select
                      name="region"
                      value={formData.region}
                      onChange={handleChange}
                      className={`select ${errors.region ? 'border-ghana-red-500' : ''}`}
                    >
                      <option value="">Select region</option>
                      {ghanaRegions.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                    {errors.region && (
                      <p className="text-sm text-ghana-red-400 mt-1">{errors.region}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-dark-300">
                  <Briefcase className="w-5 h-5" />
                  <span className="font-medium">Additional Information (Optional)</span>
                </div>

                <FormInput
                  label="Occupation"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                  placeholder="Software Engineer"
                />

                <FormInput
                  label="Source of Funds"
                  name="sourceOfFunds"
                  value={formData.sourceOfFunds}
                  onChange={handleChange}
                  placeholder="Employment Income"
                />
              </div>

              {/* Submit buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit KYC'
                  )}
                </button>
              </div>

              <p className="text-xs text-dark-500 text-center">
                By submitting, you confirm that all information provided is accurate.
                Your Ghana Card number will be encrypted for security.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

