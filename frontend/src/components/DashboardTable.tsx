/**
 * Dashboard Table Component for InvestGhanaHub
 * Reusable table component for displaying data
 */

import { ReactNode } from 'react';
import { FileX } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  className?: string;
}

interface DashboardTableProps {
  columns: Column[];
  data: Record<string, ReactNode>[];
  emptyMessage?: string;
  isLoading?: boolean;
}

export default function DashboardTable({
  columns,
  data,
  emptyMessage = 'No data available',
  isLoading = false
}: DashboardTableProps) {
  if (isLoading) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} className={col.className}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(i => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key}>
                    <div className="skeleton h-4 w-24 rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card text-center py-12">
        <FileX className="w-12 h-12 text-dark-600 mx-auto mb-4" />
        <p className="text-dark-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className={col.className}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              {columns.map(col => (
                <td key={col.key} className={col.className}>
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

