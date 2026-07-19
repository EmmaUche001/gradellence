import { useState, useEffect } from 'react';
import { AlertCircle, Receipt } from 'lucide-react';
import { billingService } from '../../../services/billingService';
import { Invoice } from '../../../types/billing';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';

function invoiceBadge(status: Invoice['status']): BadgeVariant {
  const map: Record<Invoice['status'], BadgeVariant> = {
    PAID:     'success',
    PENDING:  'warning',
    FAILED:   'danger',
    REFUNDED: 'gray',
  };
  return map[status] ?? 'gray';
}

const fmt = {
  currency: (amount: number, currency: string) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount),
  date: (s: string) =>
    new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
};

export function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await billingService.getInvoices();
        setInvoices(res.data || []);
      } catch (err: any) { setError(err.response?.data?.message || 'Failed to load invoices'); }
      finally { setLoading(false); }
    })();
  }, []);

  // Summary totals
  const totalPaid   = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
  const totalPending= invoices.filter(i => i.status === 'PENDING').reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Invoices" description="View your payment history and invoices" />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      {/* Summary cards */}
      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-surface rounded-card p-5 shadow-sm border border-border">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
          </div>
          <div className="bg-surface rounded-card p-5 shadow-sm border border-border">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Total Paid</p>
            <p className="text-2xl font-bold text-success-600">{fmt.currency(totalPaid, 'NGN')}</p>
          </div>
          {totalPending > 0 && (
            <div className="bg-surface rounded-card p-5 shadow-sm border border-border">
              <p className="text-xs font-medium text-gray-500 mb-1.5">Pending</p>
              <p className="text-2xl font-bold text-warning-600">{fmt.currency(totalPending, 'NGN')}</p>
            </div>
          )}
        </div>
      )}

      {/* Invoice table */}
      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-5"><SkeletonTable rows={5} cols={6} /></div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt size={40} />}
            title="No invoices yet"
            description="Your billing history will appear here once you subscribe to a plan."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Date', 'Description', 'Amount', 'Status', 'Payment Ref', 'Paid On'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{fmt.date(inv.createdAt)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">
                      {inv.description || inv.subscription?.plan?.name || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold text-gray-900 tabular-nums">
                      {fmt.currency(inv.amount, inv.currency)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={invoiceBadge(inv.status)}>{inv.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">
                      {inv.paymentRef || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {inv.paidAt ? fmt.date(inv.paidAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
