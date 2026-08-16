import React, { useState } from 'react';
import threatIntelApi from '../../api/threatIntelApi';
import Alert from '../../components/Alert';
import { getErrorMessage } from '../../utils/errorHandling';
import '../../components/layout.css';
import './admin.css';

/**
 * Real IP reputation checker backed by AbuseIPDB via the backend's
 * threatIntelService. If THREAT_INTEL_API_KEY isn't configured on the
 * backend, `checked` comes back false — we surface that honestly instead
 * of pretending the IP was actually verified.
 */
const AdminThreatIntel = () => {
  const [ip, setIp] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!ip.trim()) {
      setError('Enter an IP address to check.');
      return;
    }

    setIsChecking(true);
    try {
      const { data } = await threatIntelApi.checkIp(ip.trim());
      setResult(data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Threat Intelligence</h1>
        <p>Look up an IP address's reputation before whitelisting, blocking, or investigating an incident.</p>
      </div>

      <div className="panel" style={{ maxWidth: 480 }}>
        <form className="auth-form" onSubmit={handleCheck} noValidate>
          <Alert type="error">{error}</Alert>
          <div className="form-group">
            <label htmlFor="ip">IP address</label>
            <input
              id="ip"
              type="text"
              placeholder="e.g. 8.8.8.8"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              disabled={isChecking}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={isChecking}>
            {isChecking ? 'Checking...' : 'Check reputation'}
          </button>
        </form>
      </div>

      {result && (
        <div className="panel" style={{ maxWidth: 480 }}>
          <h3 className="panel-title">Result for {result.ip}</h3>

          {!result.checked && (
            <Alert type="error">
              This IP was not actually checked — it's either a private/local address, or the backend has no
              THREAT_INTEL_API_KEY configured. This is not a "clean" result, just an unchecked one.
            </Alert>
          )}

          <div className="info-row">
            <span>Malicious</span>
            <span>
              <span className={`badge badge-${result.isMalicious ? 'critical' : 'low'}`}>
                {result.isMalicious ? 'Yes' : 'No'}
              </span>
            </span>
          </div>
          <div className="info-row">
            <span>VPN / Hosting / Proxy</span>
            <span>{result.isVpn ? 'Yes' : 'No'}</span>
          </div>
          <div className="info-row">
            <span>Abuse confidence score</span>
            <span>{result.abuseScore}/100</span>
          </div>
          <div className="info-row">
            <span>Total reports</span>
            <span>{result.totalReports}</span>
          </div>
          <div className="info-row">
            <span>Usage type</span>
            <span>{result.usageType || '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminThreatIntel;
