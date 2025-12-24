import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';

export default function PaymentCallbackPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState<string>('Verifying your payment...');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const reference = params.get('reference') || params.get('trxref');

        const verify = async () => {
            if (!reference) {
                setStatus('error');
                setMessage('Missing payment reference');
                return;
            }
            try {
                const { data } = await api.post('/wallet/verify-payment', { reference });
                if (data?.success) {
                    setStatus('success');
                    setMessage('Payment verified successfully. Your wallet has been updated.');
                } else {
                    setStatus('error');
                    setMessage(data?.message || 'Payment verification failed');
                }
            } catch (e) {
                setStatus('error');
                setMessage('Failed to verify payment');
            }
        };

        void verify();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="card max-w-md w-full text-center py-12">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-12 h-12 text-ghana-gold-500 animate-spin mx-auto mb-4" />
                        <p className="text-dark-300">{message}</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle2 className="w-12 h-12 text-ghana-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-display font-bold mb-2">Payment Successful</h2>
                        <p className="text-dark-300 mb-6">{message}</p>
                        <button onClick={() => navigate('/wallet')} className="btn-primary">
                            Go to Wallet
                        </button>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <XCircle className="w-12 h-12 text-ghana-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-display font-bold mb-2">Verification Failed</h2>
                        <p className="text-dark-300 mb-6">{message}</p>
                        <button onClick={() => navigate('/wallet')} className="btn-secondary">
                            Return to Wallet
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
