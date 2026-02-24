import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attendanceAPI, eventAPI } from '../services/api';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Inline styles (avoiding separate CSS file)                               */
/* ────────────────────────────────────────────────────────────────────────── */
const S = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '24px 16px', fontFamily: 'Inter, system-ui, sans-serif' },
  back: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#666', padding: 0, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20 },
  cardTitle: { fontSize: 15, fontWeight: 600, marginBottom: 12 },
  statRow: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 },
  stat: { flex: 1, minWidth: 100, background: '#f9fafb', borderRadius: 8, padding: '14px 16px', textAlign: 'center' },
  statNum: { fontSize: 28, fontWeight: 700, lineHeight: 1.1 },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.5px' },
  bar: { height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  barFill: (pct, color) => ({ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .3s' }),
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' },
  btn: (bg) => ({ padding: '10px 20px', background: bg, color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }),
  btnSm: (bg) => ({ padding: '5px 12px', background: bg, color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }),
  badge: (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: bg, color: '#fff' }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e5e7eb', fontSize: 12, color: '#888', textTransform: 'uppercase' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6' },
  alert: (type) => ({
    padding: '12px 16px', borderRadius: 8, marginBottom: 12, fontSize: 14, fontWeight: 500,
    background: type === 'success' ? '#dcfce7' : type === 'error' ? '#fee2e2' : type === 'warning' ? '#fef9c3' : '#dbeafe',
    color: type === 'success' ? '#166534' : type === 'error' ? '#991b1b' : type === 'warning' ? '#854d0e' : '#1e40af',
  }),
  tabs: { display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' },
  tab: (active) => ({
    padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, border: 'none', background: 'none',
    borderBottom: active ? '2px solid #111' : '2px solid transparent', color: active ? '#111' : '#888',
    marginBottom: -2,
  }),
  scannerBox: { position: 'relative', width: '100%', maxWidth: 400, margin: '0 auto' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modalContent: { background: '#fff', borderRadius: 12, padding: 24, width: '90%', maxWidth: 420 },
};

/* ────────────────────────────────────────────────────────────────────────── */
const AttendanceScanner = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState('scanner'); // scanner | dashboard
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Scanner state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { type, message, registration? }
  const [manualTicket, setManualTicket] = useState('');
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const fileInputRef = useRef(null);

  // Dashboard state
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAtt, setFilterAtt] = useState('all');

  // Manual override modal
  const [overrideModal, setOverrideModal] = useState(null); // { regId, action, name }
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Load event info
  useEffect(() => {
    (async () => {
      try {
        const res = await eventAPI.getEventById(eventId);
        setEvent(res.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [eventId]);

  // Load dashboard
  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await attendanceAPI.getDashboard(eventId);
      setDashboard(res);
    } catch (e) { console.error(e); }
    setDashLoading(false);
  }, [eventId]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // Auto-refresh dashboard every 10s
  useEffect(() => {
    const iv = setInterval(loadDashboard, 10000);
    return () => clearInterval(iv);
  }, [loadDashboard]);

  /* ── QR Camera Scanner ────────────────────────────────────────────────── */
  const startCamera = async () => {
    setScanResult(null);
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      html5QrRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded) => {
          // Pause scanning briefly while processing
          try { await scanner.pause(); } catch (_) {}
          await handleScan(decoded);
          // Resume after a short delay
          setTimeout(async () => {
            try { await scanner.resume(); } catch (_) {}
          }, 2000);
        },
        () => {} // ignore errors
      );
    } catch (err) {
      setScanResult({ type: 'error', message: 'Camera access denied or not available: ' + err.message });
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrRef.current) {
        const state = html5QrRef.current.getState();
        if (state === 2 || state === 3) { // SCANNING or PAUSED
          await html5QrRef.current.stop();
        }
        html5QrRef.current.clear();
        html5QrRef.current = null;
      }
    } catch (_) {}
    setScanning(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  /* ── File upload scan ─────────────────────────────────────────────────── */
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanResult(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-file-reader');
      const result = await scanner.scanFile(file, true);
      scanner.clear();
      await handleScan(result);
    } catch (err) {
      setScanResult({ type: 'error', message: 'Could not read QR from image. Make sure it\'s a clear QR code.' });
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Core scan handler ────────────────────────────────────────────────── */
  const handleScan = async (qrData) => {
    try {
      const res = await attendanceAPI.scanQR(eventId, qrData);
      setScanResult({
        type: 'success',
        message: res.message,
        registration: res.registration,
      });
      loadDashboard(); // refresh counts
    } catch (err) {
      const data = err.response?.data;
      const sr = data?.scanResult || 'error';
      setScanResult({
        type: sr === 'duplicate' ? 'warning' : 'error',
        message: data?.message || 'Scan failed',
        registration: data?.registration,
        scanResult: sr,
      });
    }
  };

  /* ── Manual ticket entry ──────────────────────────────────────────────── */
  const handleManualEntry = async () => {
    if (!manualTicket.trim()) return;
    await handleScan(manualTicket.trim());
    setManualTicket('');
  };

  /* ── Manual override ──────────────────────────────────────────────────── */
  const submitOverride = async () => {
    if (!overrideReason.trim()) return;
    setOverrideLoading(true);
    try {
      await attendanceAPI.manualOverride(eventId, {
        registrationId: overrideModal.regId,
        action: overrideModal.action,
        reason: overrideReason.trim(),
      });
      setOverrideModal(null);
      setOverrideReason('');
      loadDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Override failed');
    }
    setOverrideLoading(false);
  };

  /* ── CSV Export ────────────────────────────────────────────────────────── */
  const handleExportCSV = async () => {
    try {
      const res = await attendanceAPI.exportCSV(eventId);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${eventId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed');
    }
  };

  /* ── Filter & search dashboard data ────────────────────────────────── */
  const getFilteredList = () => {
    if (!dashboard) return [];
    let list = filterAtt === 'scanned' ? dashboard.scanned
             : filterAtt === 'not-scanned' ? dashboard.notScanned
             : [...dashboard.scanned, ...dashboard.notScanned];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.participant.firstName?.toLowerCase().includes(q) ||
        r.participant.lastName?.toLowerCase().includes(q) ||
        r.participant.email?.toLowerCase().includes(q) ||
        r.ticketId?.toLowerCase().includes(q)
      );
    }
    return list;
  };

  if (loading) return <div style={S.page}><p>Loading…</p></div>;
  if (!event) return <div style={S.page}><p style={{ color: 'red' }}>Event not found</p></div>;

  const summary = dashboard?.summary;

  return (
    <div style={S.page}>
      <button style={S.back} onClick={() => navigate(`/organizer/events/${eventId}`)}>← Back to Event</button>
      <h1 style={S.title}>📋 Attendance — {event.eventName}</h1>
      <p style={S.subtitle}>
        {event.status} · {new Date(event.startDate).toLocaleDateString()} – {new Date(event.endDate).toLocaleDateString()}
      </p>

      {/* Stats bar */}
      {summary && (
        <div style={S.statRow}>
          <div style={S.stat}>
            <div style={S.statNum}>{summary.totalRegistrations}</div>
            <div style={S.statLabel}>Registered</div>
          </div>
          <div style={S.stat}>
            <div style={{ ...S.statNum, color: '#16a34a' }}>{summary.scannedCount}</div>
            <div style={S.statLabel}>Scanned</div>
          </div>
          <div style={S.stat}>
            <div style={{ ...S.statNum, color: '#dc2626' }}>{summary.notScannedCount}</div>
            <div style={S.statLabel}>Not Scanned</div>
          </div>
          <div style={S.stat}>
            <div style={{ ...S.statNum, color: '#2563eb' }}>{summary.attendanceRate}%</div>
            <div style={S.statLabel}>Rate</div>
          </div>
        </div>
      )}
      {summary && (
        <div style={S.bar}>
          <div style={S.barFill(summary.attendanceRate, '#16a34a')} />
        </div>
      )}

      {/* Tabs */}
      <div style={S.tabs}>
        <button style={S.tab(tab === 'scanner')} onClick={() => setTab('scanner')}>🔍 QR Scanner</button>
        <button style={S.tab(tab === 'dashboard')} onClick={() => { setTab('dashboard'); loadDashboard(); }}>📊 Participants</button>
      </div>

      {/* ═══ SCANNER TAB ═══ */}
      {tab === 'scanner' && (
        <div>
          <div style={{ ...S.grid, gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr' }}>
            {/* Camera scanner */}
            <div style={S.card}>
              <h3 style={S.cardTitle}>📷 Camera Scanner</h3>
              <div style={S.scannerBox}>
                <div id="qr-reader" ref={scannerRef} style={{ width: '100%' }} />
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                {!scanning ? (
                  <button style={S.btn('#111')} onClick={startCamera}>Start Camera</button>
                ) : (
                  <button style={S.btn('#dc2626')} onClick={stopCamera}>Stop Camera</button>
                )}
              </div>
            </div>

            {/* File upload & manual entry */}
            <div style={S.card}>
              <h3 style={S.cardTitle}>📁 Upload QR Image</h3>
              <div id="qr-file-reader" style={{ display: 'none' }} />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ marginBottom: 16 }}
              />

              <h3 style={{ ...S.cardTitle, marginTop: 20 }}>⌨️ Manual Ticket Entry</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...S.input, flex: 1 }}
                  placeholder="Enter ticket ID (e.g. TKT-A1B2C3D4)"
                  value={manualTicket}
                  onChange={e => setManualTicket(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualEntry()}
                />
                <button style={S.btn('#111')} onClick={handleManualEntry}>Scan</button>
              </div>
            </div>
          </div>

          {/* Scan result */}
          {scanResult && (
            <div style={S.alert(scanResult.type)}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {scanResult.type === 'success' && '✅ '}
                {scanResult.type === 'warning' && '⚠️ '}
                {scanResult.type === 'error' && '❌ '}
                {scanResult.message}
              </div>
              {scanResult.registration && (
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  <strong>{scanResult.registration.participant.firstName} {scanResult.registration.participant.lastName}</strong>
                  {' · '}{scanResult.registration.ticketId}
                  {' · '}{scanResult.registration.participant.email}
                  {scanResult.registration.attendanceTimestamp && (
                    <> · Scanned: {new Date(scanResult.registration.attendanceTimestamp).toLocaleString()}</>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ DASHBOARD TAB ═══ */}
      {tab === 'dashboard' && (
        <div>
          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              style={{ ...S.input, maxWidth: 280 }}
              placeholder="Search name, email, ticket…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              value={filterAtt}
              onChange={e => setFilterAtt(e.target.value)}
              style={{ ...S.input, maxWidth: 180 }}
            >
              <option value="all">All Participants</option>
              <option value="scanned">✅ Scanned</option>
              <option value="not-scanned">❌ Not Scanned</option>
            </select>
            <button style={S.btn('#111')} onClick={loadDashboard} disabled={dashLoading}>
              {dashLoading ? 'Refreshing…' : '🔄 Refresh'}
            </button>
            <button style={S.btn('#1d4ed8')} onClick={handleExportCSV}>
              📥 Export CSV
            </button>
          </div>

          {/* Participants table */}
          {dashLoading && !dashboard ? (
            <p>Loading…</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>#</th>
                    <th style={S.th}>Ticket ID</th>
                    <th style={S.th}>Name</th>
                    <th style={S.th}>Email</th>
                    <th style={S.th}>Type</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Scan Time</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredList().map((r, i) => (
                    <tr key={r._id} style={{ background: r.attendanceMarked ? '#f0fdf4' : 'transparent' }}>
                      <td style={S.td}>{i + 1}</td>
                      <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{r.ticketId}</td>
                      <td style={S.td}>{r.participant.firstName} {r.participant.lastName}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>{r.participant.email}</td>
                      <td style={S.td}>{r.participant.participantType}</td>
                      <td style={S.td}>
                        {r.attendanceMarked
                          ? <span style={S.badge('#16a34a')}>✓ Scanned</span>
                          : <span style={S.badge('#9ca3af')}>Not Scanned</span>
                        }
                        {r.attendanceOverride && (
                          <span style={{ ...S.badge('#f59e0b'), marginLeft: 4 }} title={`Override: ${r.attendanceOverride.reason}`}>
                            Manual
                          </span>
                        )}
                      </td>
                      <td style={{ ...S.td, fontSize: 12 }}>
                        {r.attendanceTimestamp ? new Date(r.attendanceTimestamp).toLocaleString() : '—'}
                      </td>
                      <td style={S.td}>
                        {!r.attendanceMarked ? (
                          <button
                            style={S.btnSm('#16a34a')}
                            onClick={() => setOverrideModal({ regId: r._id, action: 'mark', name: `${r.participant.firstName} ${r.participant.lastName}` })}
                          >
                            ✓ Mark
                          </button>
                        ) : (
                          <button
                            style={S.btnSm('#dc2626')}
                            onClick={() => setOverrideModal({ regId: r._id, action: 'unmark', name: `${r.participant.firstName} ${r.participant.lastName}` })}
                          >
                            ✗ Unmark
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {getFilteredList().length === 0 && (
                    <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', color: '#888', padding: 32 }}>No participants found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ MANUAL OVERRIDE MODAL ═══ */}
      {overrideModal && (
        <div style={S.modal} onClick={() => setOverrideModal(null)}>
          <div style={S.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              {overrideModal.action === 'mark' ? '✅ Mark Attendance' : '❌ Unmark Attendance'}
            </h3>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
              {overrideModal.action === 'mark' ? 'Manually mark' : 'Undo attendance for'}{' '}
              <strong>{overrideModal.name}</strong>
            </p>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Reason (required for audit log):</p>
            <textarea
              style={{ ...S.input, resize: 'vertical', minHeight: 80 }}
              placeholder="e.g. QR code damaged, entered via side gate, etc."
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button style={{ ...S.btn('#e5e7eb'), color: '#333' }} onClick={() => { setOverrideModal(null); setOverrideReason(''); }}>Cancel</button>
              <button
                style={S.btn(overrideModal.action === 'mark' ? '#16a34a' : '#dc2626')}
                onClick={submitOverride}
                disabled={overrideLoading || !overrideReason.trim()}
              >
                {overrideLoading ? 'Saving…' : overrideModal.action === 'mark' ? 'Mark Attendance' : 'Unmark Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceScanner;
