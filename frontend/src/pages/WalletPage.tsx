/**
 * Wallet Page for InvestGhanaHub
 * Manage deposits, withdrawals, and view transactions
 */

import { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Loader2,
  CreditCard,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';
import FormInput from '../components/FormInput';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface WalletData {
  id: string;
  balance: number;
  currency: string;
  walletTransactions: WalletTransaction[];
}

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function WalletPage() {
  const { token } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  
  // Deposit form
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('MOMO_MTN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  
  // Withdraw form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawProvider, setWithdrawProvider] = useState('MTN');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await fetch(`${API_URL}/wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setWallet(data.data);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 10) {
      toast.error('Minimum deposit is ₵10');
      return;
    }

    if (paymentMethod.startsWith('MOMO_') && !phoneNumber) {
      toast.error('Phone number is required for mobile money');
      return;
    }

    setIsDepositing(true);
    try {
      const response = await fetch(`${API_URL}/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          paymentMethod,
          phoneNumber: phoneNumber || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data.authorizationUrl) {
        // Redirect to Paystack payment page
        window.location.href = data.data.authorizationUrl;
      } else {
        toast.error(data.message || 'Deposit failed');
      }
    } catch (error) {
      toast.error('Failed to initiate deposit');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 50) {
      toast.error('Minimum withdrawal is ₵50');
      return;
    }

    if (!withdrawPhone) {
      toast.error('Phone number is required');
      return;
    }

    if (wallet && amount > wallet.balance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsWithdrawing(true);
    try {
      const response = await fetch(`${API_URL}/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          phoneNumber: withdrawPhone,
          provider: withdrawProvider,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.data.message || 'Withdrawal initiated');
        fetchWallet();
        setWithdrawAmount('');
      } else {
        toast.error(data.message || 'Withdrawal failed');
      }
    } catch (error) {
      toast.error('Failed to initiate withdrawal');
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-ghana-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">My Wallet</h1>
          <p className="text-dark-400">Manage your funds and transactions</p>
        </div>

        {/* Balance Card */}
        <div className="card bg-gradient-to-r from-ghana-gold-500/10 to-ghana-green-500/10 border-ghana-gold-500/30 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 mb-1">Available Balance</p>
              <p className="text-4xl font-display font-bold gradient-text">
                ₵{(wallet?.balance || 0).toLocaleString()}
              </p>
            </div>
            <div className="w-16 h-16 bg-ghana-gold-500/20 rounded-2xl flex items-center justify-center">
              <Wallet className="w-8 h-8 text-ghana-gold-500" />
            </div>
          </div>
          <button 
            onClick={fetchWallet}
            className="mt-4 text-sm text-dark-400 hover:text-dark-200 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Balance
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'deposit'
                ? 'bg-ghana-green-500 text-white font-medium'
                : 'text-dark-400 hover:bg-dark-800'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'withdraw'
                ? 'bg-ghana-gold-500 text-dark-950 font-medium'
                : 'text-dark-400 hover:bg-dark-800'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Withdraw
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-dark-700 text-white font-medium'
                : 'text-dark-400 hover:bg-dark-800'
            }`}
          >
            History
          </button>
        </div>

        {/* Deposit Tab */}
        {activeTab === 'deposit' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-ghana-green-500" />
              Deposit Funds
            </h2>

            <form onSubmit={handleDeposit} className="space-y-6">
              <FormInput
                label="Amount (GHS)"
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Enter amount (min. ₵10)"
                min="10"
              />

              <div>
                <label className="label">Payment Method</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'MOMO_MTN', label: 'MTN MoMo', icon: Smartphone },
                    { id: 'MOMO_VODAFONE', label: 'Vodafone Cash', icon: Smartphone },
                    { id: 'MOMO_AIRTELTIGO', label: 'AirtelTigo', icon: Smartphone },
                    { id: 'CARD', label: 'Card', icon: CreditCard },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        paymentMethod === method.id
                          ? 'border-ghana-gold-500 bg-ghana-gold-500/10'
                          : 'border-dark-700 hover:border-dark-600'
                      }`}
                    >
                      <method.icon className={`w-6 h-6 mx-auto mb-2 ${
                        paymentMethod === method.id ? 'text-ghana-gold-500' : 'text-dark-400'
                      }`} />
                      <span className={`text-xs ${
                        paymentMethod === method.id ? 'text-ghana-gold-500' : 'text-dark-400'
                      }`}>
                        {method.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod.startsWith('MOMO_') && (
                <FormInput
                  label="Phone Number"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+233240001234 or 0240001234"
                />
              )}

              <button
                type="submit"
                disabled={isDepositing}
                className="btn-success w-full flex items-center justify-center gap-2"
              >
                {isDepositing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Processing...</>
                ) : (
                  <>
                    <ArrowDownLeft className="w-5 h-5" />
                    Deposit ₵{depositAmount || '0'}
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Withdraw Tab */}
        {activeTab === 'withdraw' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-ghana-gold-500" />
              Withdraw Funds
            </h2>

            <div className="mb-6 p-4 bg-dark-800/50 rounded-xl">
              <p className="text-sm text-dark-400">
                Available for withdrawal: <span className="text-ghana-green-500 font-bold">₵{(wallet?.balance || 0).toLocaleString()}</span>
              </p>
              <p className="text-xs text-dark-500 mt-1">
                Withdrawal fee: 1% | Minimum: ₵50
              </p>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-6">
              <FormInput
                label="Amount (GHS)"
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount (min. ₵50)"
                min="50"
                max={wallet?.balance || 0}
              />

              <div>
                <label className="label">Mobile Money Provider</label>
                <select
                  value={withdrawProvider}
                  onChange={(e) => setWithdrawProvider(e.target.value)}
                  className="select"
                >
                  <option value="MTN">MTN Mobile Money</option>
                  <option value="VODAFONE">Vodafone Cash</option>
                  <option value="AIRTELTIGO">AirtelTigo Money</option>
                </select>
              </div>

              <FormInput
                label="Phone Number"
                type="tel"
                value={withdrawPhone}
                onChange={(e) => setWithdrawPhone(e.target.value)}
                placeholder="+233240001234 or 0240001234"
              />

              {withdrawAmount && (
                <div className="p-4 bg-dark-800/50 rounded-xl">
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Amount:</span>
                    <span>₵{parseFloat(withdrawAmount || '0').toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Fee (1%):</span>
                    <span>₵{(parseFloat(withdrawAmount || '0') * 0.01).toFixed(2)}</span>
                  </div>
                  <hr className="my-2 border-dark-700" />
                  <div className="flex justify-between font-semibold">
                    <span>You'll receive:</span>
                    <span className="text-ghana-green-500">
                      ₵{(parseFloat(withdrawAmount || '0') * 0.99).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isWithdrawing || !wallet?.balance}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isWithdrawing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Processing...</>
                ) : (
                  <>
                    <ArrowUpRight className="w-5 h-5" />
                    Withdraw
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Transaction History</h2>

              {wallet?.walletTransactions && wallet.walletTransactions.length > 0 ? (
                <div className="space-y-3">
                {wallet.walletTransactions.map((tx: WalletTransaction) => (
                  <div 
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'DEPOSIT' ? 'bg-ghana-green-500/20' : 'bg-ghana-gold-500/20'
                      }`}>
                        {tx.type === 'DEPOSIT' ? (
                          <ArrowDownLeft className="w-5 h-5 text-ghana-green-500" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-ghana-gold-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{tx.type}</p>
                        <p className="text-xs text-dark-500">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        tx.amount > 0 ? 'text-ghana-green-500' : 'text-ghana-gold-500'
                      }`}>
                        {tx.amount > 0 ? '+' : ''}₵{Math.abs(tx.amount).toLocaleString()}
                      </p>
                      <p className={`text-xs ${
                        tx.status === 'COMPLETED' ? 'text-ghana-green-500' : 'text-dark-500'
                      }`}>
                        {tx.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                <p className="text-dark-400">No transactions yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

