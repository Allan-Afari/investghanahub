/**
 * Portfolio Diversification Helper
 * Helps users create a balanced investment portfolio across different sectors and risk levels
 */

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PortfolioDiversificationHelperProps {
  className?: string;
}

interface Allocation {
  sector: string;
  percentage: number;
  amount: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  color: string;
}

export const PortfolioDiversificationHelper: React.FC<PortfolioDiversificationHelperProps> = ({
  className = ''
}) => {
  const [totalAmount, setTotalAmount] = useState<number>(50000);
  const [riskProfile, setRiskProfile] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  const allocationProfiles = {
    conservative: [
      { sector: 'Agriculture (Crops)', percentage: 40, riskLevel: 'Low' as const, color: '#10B981' },
      { sector: 'Established Businesses', percentage: 30, riskLevel: 'Low' as const, color: '#3B82F6' },
      { sector: 'Real Estate', percentage: 20, riskLevel: 'Medium' as const, color: '#F59E0B' },
      { sector: 'Startups', percentage: 10, riskLevel: 'High' as const, color: '#EF4444' },
    ],
    balanced: [
      { sector: 'Agriculture (Crops)', percentage: 30, riskLevel: 'Low' as const, color: '#10B981' },
      { sector: 'Established Businesses', percentage: 25, riskLevel: 'Low' as const, color: '#3B82F6' },
      { sector: 'Growing Businesses', percentage: 25, riskLevel: 'Medium' as const, color: '#F59E0B' },
      { sector: 'Startups', percentage: 20, riskLevel: 'High' as const, color: '#EF4444' },
    ],
    aggressive: [
      { sector: 'Startups (Tech)', percentage: 35, riskLevel: 'High' as const, color: '#EF4444' },
      { sector: 'Growing Businesses', percentage: 30, riskLevel: 'Medium' as const, color: '#F59E0B' },
      { sector: 'Agriculture (Export)', percentage: 20, riskLevel: 'Medium' as const, color: '#10B981' },
      { sector: 'Established Businesses', percentage: 15, riskLevel: 'Low' as const, color: '#3B82F6' },
    ],
  };

  const calculateAllocations = () => {
    const profile = allocationProfiles[riskProfile];
    const calculated = profile.map((item) => ({
      ...item,
      amount: (totalAmount * item.percentage) / 100,
    }));
    setAllocations(calculated);
  };

  useEffect(() => {
    calculateAllocations();
  }, [totalAmount, riskProfile]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const pieData = allocations.map((allocation) => ({
    name: allocation.sector,
    value: allocation.percentage,
    amount: allocation.amount,
  }));

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-2xl font-bold text-gray-800 mb-4">Portfolio Diversification Helper</h3>
      <p className="text-gray-600 mb-6">
        Build a balanced investment portfolio across different sectors and risk levels
      </p>

      {/* Input Section */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Investment Amount (GHS)
          </label>
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => setTotalAmount(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            min="1000"
            step="1000"
          />
          <input
            type="range"
            value={totalAmount}
            onChange={(e) => setTotalAmount(Number(e.target.value))}
            min="1000"
            max="200000"
            step="1000"
            className="w-full mt-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Risk Profile
          </label>
          <select
            value={riskProfile}
            onChange={(e) => setRiskProfile(e.target.value as 'conservative' | 'balanced' | 'aggressive')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="conservative">Conservative (Lower Risk)</option>
            <option value="balanced">Balanced (Medium Risk)</option>
            <option value="aggressive">Aggressive (Higher Risk)</option>
          </select>
        </div>
      </div>

      {/* Visualization */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Pie Chart */}
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Portfolio Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={allocations[index].color} />
                ))}
              </Pie>
              <Legend />
              <Tooltip
                formatter={(value: number, name: string, props: unknown) => {
                  const amt =
                    (props as { payload?: { amount?: number } }).payload?.amount ?? 0;
                  return [`${value}% (${formatCurrency(amt)})`, name];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Allocation Details */}
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Recommended Allocation</h4>
          <div className="space-y-3">
            {allocations.map((allocation, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: allocation.color }}
                      />
                      <h5 className="font-semibold text-gray-800">{allocation.sector}</h5>
                    </div>
                    <div className="flex items-center space-x-3 mt-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold ${allocation.riskLevel === 'Low'
                          ? 'bg-green-100 text-green-700'
                          : allocation.riskLevel === 'Medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {allocation.riskLevel} Risk
                      </span>
                      <span className="text-sm text-gray-600">{allocation.percentage}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">
                      {formatCurrency(allocation.amount)}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${allocation.percentage}%`,
                      backgroundColor: allocation.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Profile Descriptions */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${riskProfile === 'conservative'
            ? 'bg-blue-50 border-blue-500'
            : 'bg-gray-50 border-gray-200 hover:border-blue-300'
            }`}
          onClick={() => setRiskProfile('conservative')}
        >
          <h5 className="font-semibold text-gray-800 mb-2">🛡️ Conservative</h5>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• 70% Low Risk</li>
            <li>• 20% Medium Risk</li>
            <li>• 10% High Risk</li>
            <li>• Focus on stability</li>
          </ul>
        </div>

        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${riskProfile === 'balanced'
            ? 'bg-green-50 border-green-500'
            : 'bg-gray-50 border-gray-200 hover:border-green-300'
            }`}
          onClick={() => setRiskProfile('balanced')}
        >
          <h5 className="font-semibold text-gray-800 mb-2">⚖️ Balanced</h5>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• 55% Low Risk</li>
            <li>• 25% Medium Risk</li>
            <li>• 20% High Risk</li>
            <li>• Growth with security</li>
          </ul>
        </div>

        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${riskProfile === 'aggressive'
            ? 'bg-purple-50 border-purple-500'
            : 'bg-gray-50 border-gray-200 hover:border-purple-300'
            }`}
          onClick={() => setRiskProfile('aggressive')}
        >
          <h5 className="font-semibold text-gray-800 mb-2">🚀 Aggressive</h5>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• 15% Low Risk</li>
            <li>• 50% Medium Risk</li>
            <li>• 35% High Risk</li>
            <li>• Maximum growth potential</li>
          </ul>
        </div>
      </div>

      {/* Diversification Tips */}
      <div className="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
        <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
          <span className="text-2xl mr-2">💡</span>
          Diversification Tips
        </h5>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>
            <strong>Don't Put All Eggs in One Basket:</strong> Spread investments across multiple sectors
            to reduce risk.
          </li>
          <li>
            <strong>Balance Risk and Reward:</strong> Mix stable investments with growth opportunities
            for optimal returns.
          </li>
          <li>
            <strong>Consider Your Timeline:</strong> Shorter timelines need more conservative allocations;
            longer timelines can handle more risk.
          </li>
          <li>
            <strong>Review Regularly:</strong> Rebalance your portfolio every 3-6 months to maintain
            your target allocation.
          </li>
          <li>
            <strong>Start Small:</strong> Begin with lower-risk investments and gradually increase exposure
            as you gain experience.
          </li>
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ Note:</strong> This tool provides general guidance based on modern portfolio theory.
          Your ideal allocation may vary based on age, income, goals, and risk tolerance.
          Consider consulting with a financial advisor for personalized advice.
        </p>
      </div>
    </div>
  );
};

export default PortfolioDiversificationHelper;
