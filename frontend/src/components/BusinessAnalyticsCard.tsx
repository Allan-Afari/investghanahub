import { useEffect, useState } from 'react';
import api from '../utils/api';

interface Props {
    businessId: string;
}

type BusinessOverview = {
    totalInvestments: number;
    totalAmount: number;
    averageInvestment: number;
    fundingProgress: number;
    investorCount: number;
};

type MonthlyPoint = { month: string; count: number; amount: number };

export default function BusinessAnalyticsCard({ businessId }: Props) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [overview, setOverview] = useState<BusinessOverview | null>(null);
    const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await api.get(`/analytics/business/${businessId}`);
                if (data?.success && data?.data) {
                    setOverview(data.data.overview as BusinessOverview);
                    setMonthly(((data.data.performance?.monthlyInvestments as MonthlyPoint[]) || []).slice(-6));
                } else {
                    setError('Failed to load analytics');
                }
            } catch (e) {
                setError('Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [businessId]);

    if (loading) return null;
    if (error || !overview) return null;

    const maxAmount = Math.max(...monthly.map(m => m.amount), 1);

    return (
        <div className="mt-2 p-3 bg-dark-800/50 rounded-lg">
            <div className="grid md:grid-cols-4 gap-4 mb-3">
                <div>
                    <p className="text-xs text-dark-500">Investors</p>
                    <p className="font-semibold">{overview.investorCount}</p>
                </div>
                <div>
                    <p className="text-xs text-dark-500">Total Investments</p>
                    <p className="font-semibold">{overview.totalInvestments}</p>
                </div>
                <div>
                    <p className="text-xs text-dark-500">Raised</p>
                    <p className="font-semibold text-ghana-green-500">₵{overview.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-xs text-dark-500">Avg Investment</p>
                    <p className="font-semibold">₵{overview.averageInvestment.toFixed(0)}</p>
                </div>
            </div>

            {/* Tiny bar chart for last 6 months */}
            {monthly.length > 0 && (
                <div>
                    <p className="text-xs text-dark-500 mb-1">Last 6 periods</p>
                    <div className="flex items-end gap-2 h-16">
                        {monthly.map((m, idx) => (
                            <div key={idx} className="flex-1">
                                <div
                                    className="bg-ghana-gold-500/70 rounded"
                                    style={{ height: `${Math.max(8, (m.amount / maxAmount) * 64)}px` }}
                                    title={`${m.month}: ₵${m.amount.toLocaleString()} (${m.count} inv)`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
