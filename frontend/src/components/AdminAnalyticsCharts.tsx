import { useEffect, useState } from 'react';
import api from '../utils/api';

interface AdminAnalytics {
    platformHealth: {
        userGrowthRate: number;
        businessGrowthRate: number;
        investmentGrowthRate: number;
        revenueGrowthRate: number;
    };
    financialMetrics: {
        monthlyRevenue: Array<{ month: string; revenue: number; source: string }>;
    };
    investmentMetrics: {
        investmentsByIndustry: Record<string, number>;
    };
}

export default function AdminAnalyticsCharts() {
    const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const { data } = await api.get('/analytics/admin');
                if (data?.success) setAnalytics(data.data);
            } catch (e) {
                // ignore; dashboard still usable without charts
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading || !analytics) return null;

    const mr = analytics.financialMetrics.monthlyRevenue.slice(-6);
    const maxRev = Math.max(...mr.map(m => m.revenue), 1);
    const industries = analytics.investmentMetrics.investmentsByIndustry || {};
    const industryEntries = Object.entries(industries).slice(0, 6);
    const maxIndustry = Math.max(...industryEntries.map(([, v]) => v), 1);

    const tile = (label: string, value: string) => (
        <div className="p-4 bg-dark-800/50 rounded-xl">
            <div className="text-xs text-dark-500 mb-1">{label}</div>
            <div className="text-lg font-semibold">{value}</div>
        </div>
    );

    return (
        <div className="grid lg:grid-cols-3 gap-6 mt-8">
            {/* Growth tiles */}
            <div className="grid grid-cols-2 gap-4">
                {tile('User Growth', `${analytics.platformHealth.userGrowthRate.toFixed(1)}%`)}
                {tile('Business Growth', `${analytics.platformHealth.businessGrowthRate.toFixed(1)}%`)}
                {tile('Investment Growth', `${analytics.platformHealth.investmentGrowthRate.toFixed(1)}%`)}
                {tile('Revenue Growth', `${analytics.platformHealth.revenueGrowthRate.toFixed(1)}%`)}
            </div>

            {/* Revenue mini bar chart */}
            <div className="p-4 bg-dark-800/50 rounded-xl">
                <div className="text-sm font-medium mb-2">Monthly Revenue (last 6)</div>
                <div className="flex items-end gap-2 h-24">
                    {mr.map((m, i) => (
                        <div key={i} className="flex-1">
                            <div
                                className="bg-ghana-gold-500/80 rounded"
                                style={{ height: `${Math.max(8, (m.revenue / maxRev) * 96)}px` }}
                                title={`${m.month}: ₵${m.revenue.toLocaleString()} (${m.source})`}
                            />
                            <div className="text-[10px] text-dark-500 mt-1 text-center">{m.month}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top industries bar */}
            <div className="p-4 bg-dark-800/50 rounded-xl">
                <div className="text-sm font-medium mb-2">Top Industries</div>
                <div className="space-y-2">
                    {industryEntries.map(([k, v]) => (
                        <div key={k}>
                            <div className="flex justify-between text-xs text-dark-400 mb-1">
                                <span className="capitalize">{k}</span>
                                <span>{v}</span>
                            </div>
                            <div className="h-2 bg-dark-900 rounded">
                                <div
                                    className="h-2 bg-ghana-green-500 rounded"
                                    style={{ width: `${Math.min(100, (v / maxIndustry) * 100)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                    {industryEntries.length === 0 && (
                        <div className="text-xs text-dark-500">No industry data</div>
                    )}
                </div>
            </div>
        </div>
    );
}
