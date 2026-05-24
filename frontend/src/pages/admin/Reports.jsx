import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client';
import Loader from '../../components/Loader.jsx';
import { money } from '../../lib/format.js';
import { STATUS_TABS } from '../../lib/orders.js';

// "2026-05" -> "May 2026"
function monthLabel(key) {
  const [y, m] = key.split('-');
  return new Date(y, Number(m) - 1).toLocaleString('en-PK', {
    month: 'long',
    year: 'numeric',
  });
}

export default function AdminReports() {
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'ALL', from: '', to: '' });
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/reports/monthly')
      .then((r) => setMonthly(r.data))
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, []);

  // Fetch the .xlsx as a blob (so the auth header is sent) and save it.
  async function downloadExcel() {
    setError('');
    setDownloading(true);
    try {
      const res = await api.get('/reports/orders/export', {
        params: filters,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nishani-orders-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <Loader />;

  const totalIncome = monthly.reduce((s, m) => s + m.income, 0);

  return (
    <div>
      <h1 className="admin-h1">Reports</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        <h2 className="admin-h2">Monthly income</h2>
        <p className="muted">Income is counted from orders that have been closed (delivered).</p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Orders closed</th>
              <th>Income</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((m) => (
              <tr key={m.month}>
                <td>{monthLabel(m.month)}</td>
                <td>{m.orders}</td>
                <td className="link-strong">{money(m.income)}</td>
              </tr>
            ))}
            {monthly.length === 0 && (
              <tr>
                <td colSpan={3} className="empty">
                  No closed orders yet.
                </td>
              </tr>
            )}
          </tbody>
          {monthly.length > 0 && (
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{monthly.reduce((s, m) => s + m.orders, 0)}</td>
                <td className="link-strong">{money(totalIncome)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="panel">
        <h2 className="admin-h2">Export orders to Excel</h2>
        <p className="muted">Download an .xlsx sheet of orders, filtered as needed.</p>
        <div className="form-grid">
          <label>
            Status
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              {STATUS_TABS.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'All statuses' : s}
                </option>
              ))}
            </select>
          </label>
          <label>
            From date
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>
          <label>
            To date
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
        </div>
        <button className="btn" onClick={downloadExcel} disabled={downloading}>
          {downloading ? 'Preparing…' : '⬇ Download Excel sheet'}
        </button>
      </div>
    </div>
  );
}
