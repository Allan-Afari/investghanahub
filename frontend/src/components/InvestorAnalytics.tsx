import React from 'react';

interface Portfolio {
    summary: {
        totalInvested: number;
        totalExpectedReturn: number;
        totalProfit: number;
        activeCount: number;
        maturedCount: number;
        totalCount: number;
    };
    byCategory: Record<string, { count: number; amount: number }>;
}

export default function InvestorAnalytics({ portfolio }: { portfolio: Portfolio }) {
    const categories = Object.entries(portfolio.byCategory || {});
    const maxAmt = Math.max(...categories.map(([, v]) => v.amount), 1);

    const percent = (value: number, base: number) => (base > 0 ? (value / base) * 100 : 0);

    return (
        <div className="grid md:grid-cols-2 gap-6 mt-2">
            {/* Allocation by category (bar) */}
            <div className="p-4 bg-dark-800/50 rounded-xl">
                <div className="text-sm font-medium mb-3">Allocation by Category</div>
                <div className="space-y-2">
                    {categories.map(([k, v]) => (
                        <div key={k}>
                            <div className="flex justify-between text-xs text-dark-400 mb-1">
                                <span className="capitalize">{k}</span>
                                <span>₵{v.amount.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-dark-900 rounded">
                                <div
                                    className="h-2 bg-ghana-gold-500 rounded"
                                    style={{ width: `${Math.min(100, (v.amount / maxAmt) * 100)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                    {categories.length === 0 && <div className="text-xs text-dark-500">No allocation data</div>}
                </div>
            </div>

            {/* Expected vs Invested (gauge-like) */}
            <div className="p-4 bg-dark-800/50 rounded-xl">
                <div className="text-sm font-medium mb-3">Expected vs Invested</div>
                <div className="space-y-3">
                    <div>
                        <div className="flex justify-between text-xs text-dark-400 mb-1">
                            <span>Total Invested</span>
                            <span>₵{portfolio.summary.totalInvested.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-dark-900 rounded">
                            <div
                                className="h-2 bg-ghana-green-500 rounded"
                                style={{ width: `${Math.min(100, percent(portfolio.summary.totalInvested, Math.max(portfolio.summary.totalExpectedReturn, portfolio.summary.totalInvested)))}%` }}
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-dark-400 mb-1">
                            <span>Expected Return</span>
                            <span>₵{portfolio.summary.totalExpectedReturn.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-dark-900 rounded">
                            <div
                                className="h-2 bg-ghana-gold-500 rounded"
                                style={{ width: `${Math.min(100, percent(portfolio.summary.totalExpectedReturn, portfolio.summary.totalExpectedReturn + portfolio.summary.totalInvested))}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
