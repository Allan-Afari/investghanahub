import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import api from '../utils/api';

export default function PaymentVerifyBanner() {
    const [reference, setReference] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        const ref = localStorage.getItem('lastDepositReference');
        if (ref) setReference(ref);
    }, []);

    if (!reference) return null;

    const verify = async () => {
        setIsVerifying(true);
        try {
            const { data } = await api.post('/wallet/verify-payment', { reference });
            if (data?.success) {
                // Clear and hide banner
                localStorage.removeItem('lastDepositReference');
                setReference(null);
            }
        } catch (e) {
            // noop; api.ts already toasts on error
        } finally {
            setIsVerifying(false);
        }
    };

    const dismiss = () => {
        localStorage.removeItem('lastDepositReference');
        setReference(null);
    };

    return (
        <div className="container-custom">
            <div className="mt-3 mb-1 p-3 bg-dark-800/60 border border-dark-700 rounded-xl flex items-center justify-between gap-3">
                <div className="text-sm">
                    <div className="text-dark-300">Pending deposit reference</div>
                    <div className="font-mono text-dark-100 text-xs">{reference}</div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={verify}
                        disabled={isVerifying}
                        className="btn-primary btn-sm flex items-center gap-2"
                    >
                        {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {isVerifying ? 'Verifying...' : 'Verify now'}
                    </button>
                    <button onClick={dismiss} className="btn-secondary btn-sm">Dismiss</button>
                </div>
            </div>
        </div>
    );
}
