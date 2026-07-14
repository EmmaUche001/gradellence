import { useState, useEffect } from 'react';
import { billingService } from '../../../services/billingService';
import { Invoice } from '../../../types/billing';

export function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await billingService.getInvoices();
      setInvoices(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });

  const statusColors: Record<string, string> = {
    PAID: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    FAILED: 'bg-red-100 text-red-800',
    REFUNDED: 'bg-gray-100 text-gray-800',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading invoices...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
        <p className="mt-1 text-sm text-gray-500">View your payment history and invoices.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Description</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header">Payment Ref</th>
                <th className="table-header">Paid At</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-gray-400 py-8">No invoices found.</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="table-cell text-sm text-gray-500 whitespace-nowrap">{formatDate(inv.createdAt)}</td>
                    <td className="table-cell text-sm">{inv.description || inv.subscription?.plan?.name || '—'}</td>
                    <td className="table-cell font-medium">{formatCurrency(inv.amount, inv.currency)}</td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status] || 'bg-gray-100 text-gray-800'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="table-cell text-sm text-gray-500">{inv.paymentRef || '—'}</td>
                    <td className="table-cell text-sm text-gray-500">{inv.paidAt ? formatDate(inv.paidAt) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}