import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'number', label: 'Number' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
  { value: 'file', label: 'File' },
];

const emptyField = () => ({ fieldLabel: '', fieldType: 'text', options: [], isRequired: false, min: null, max: null, order: 0 });
const emptyItem  = () => ({ name: '', size: '', color: '', variant: '', stockQuantity: 0, price: 0 });

const CreateEvent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Warn before refresh / tab close if form has data
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const [form, setForm] = useState({
    eventName: '', description: '', eventType: 'Normal',
    startDate: '', endDate: '', registrationDeadline: '',
    location: '', registrationFee: 0, eligibility: 'all',
    registrationLimit: '', eventTags: '',
    purchaseLimitPerParticipant: 1,
  });

  const [formFields, setFormFields]   = useState([emptyField()]);
  const [merchItems, setMerchItems]   = useState([emptyItem()]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // ── Form field helpers ──────────────────────────────────
  const updateField = (i, key, val) => {
    setFormFields(fs => fs.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
  };
  const addField    = () => setFormFields(fs => [...fs, { ...emptyField(), order: fs.length }]);
  const removeField = (i) => setFormFields(fs => fs.filter((_, idx) => idx !== i));
  const moveField   = (i, dir) => {
    setFormFields(fs => {
      const arr = [...fs]; const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr.map((f, idx) => ({ ...f, order: idx }));
    });
  };

  // ── Merch item helpers ──────────────────────────────────
  const updateItem = (i, key, val) => {
    setMerchItems(ms => ms.map((m, idx) => idx === i ? { ...m, [key]: val } : m));
  };
  const addItem    = () => setMerchItems(ms => [...ms, emptyItem()]);
  const removeItem = (i) => setMerchItems(ms => ms.filter((_, idx) => idx !== i));

  // ── Submit ──────────────────────────────────────────────
  const handleSubmit = async (publish = false) => {
    setError(''); setLoading(true);

    // Client-side validation
    if (!form.eventName.trim()) { setError('Event name is required'); setLoading(false); return; }
    if (!form.startDate) { setError('Start date is required'); setLoading(false); return; }
    if (!form.endDate) { setError('End date is required'); setLoading(false); return; }
    if (!form.registrationDeadline) { setError('Registration deadline is required'); setLoading(false); return; }
    const now = new Date();
    if (new Date(form.startDate) < now) { setError('Start date cannot be in the past'); setLoading(false); return; }
    if (new Date(form.endDate) < now) { setError('End date cannot be in the past'); setLoading(false); return; }
    if (new Date(form.registrationDeadline) < now) { setError('Registration deadline cannot be in the past'); setLoading(false); return; }
    if (new Date(form.endDate) <= new Date(form.startDate)) { setError('End date must be after start date'); setLoading(false); return; }
    if (new Date(form.registrationDeadline) > new Date(form.endDate)) { setError('Registration deadline cannot be after the event end date'); setLoading(false); return; }
    if (form.registrationLimit && Number(form.registrationLimit) < 1) { setError('Registration limit must be at least 1'); setLoading(false); return; }
    if (form.eventType === 'Merchandise') {
      for (let i = 0; i < merchItems.length; i++) {
        if (!merchItems[i].name?.trim()) { setError(`Merchandise item ${i + 1}: Name is required`); setLoading(false); return; }
        if (merchItems[i].price < 0) { setError(`Merchandise item ${i + 1}: Price cannot be negative`); setLoading(false); return; }
      }
    }

    try {
      const payload = {
        ...form,
        registrationFee: Number(form.registrationFee) || 0,
        registrationLimit: form.registrationLimit ? Number(form.registrationLimit) : undefined,
        eventTags: form.eventTags ? form.eventTags.split(',').map(t => t.trim()).filter(Boolean) : [],
        customForm: { fields: formFields },
        merchandiseItems: form.eventType === 'Merchandise' ? merchItems : undefined,
        purchaseLimitPerParticipant: form.eventType === 'Merchandise' ? Number(form.purchaseLimitPerParticipant) : undefined,
      };

      const res = await eventAPI.createEvent(payload);
      const eventId = res.data._id;

      if (publish) {
        await eventAPI.publishEvent(eventId);
      }

      navigate(`/organizer/events/${eventId}`);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ paddingTop: 32, maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')} style={{ padding: '8px 14px' }}>← Back</button>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Create Event</h1>
      </div>

      {error && <div className="alert alert-error mb-24">{error}</div>}

      <div className="card card-lg mb-24">
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 20, color: '#111' }}>Basic Details</h2>

        <div className="form-group">
          <label>Event Name *</label>
          <input value={form.eventName} onChange={e => set('eventName', e.target.value)} placeholder="e.g. Hackathon 2026" required />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={4} placeholder="Tell participants what this event is about…" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Event Type *</label>
            <select value={form.eventType} onChange={e => set('eventType', e.target.value)}>
              <option value="Normal">Normal (Individual)</option>
              <option value="Merchandise">Merchandise</option>
            </select>
          </div>
          <div className="form-group">
            <label>Eligibility</label>
            <select value={form.eligibility} onChange={e => set('eligibility', e.target.value)}>
              <option value="all">All</option>
              <option value="iiit-only">IIIT Only</option>
              <option value="non-iiit-only">Non-IIIT Only</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Start Date *</label>
            <input type="datetime-local" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div className="form-group">
            <label>End Date *</label>
            <input type="datetime-local" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Registration Deadline *</label>
            <input type="datetime-local" value={form.registrationDeadline} onChange={e => set('registrationDeadline', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: form.eventType === 'Merchandise' ? '1fr 1fr' : '1fr 1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Venue or online" />
          </div>
          {form.eventType !== 'Merchandise' && (
            <div className="form-group">
              <label>Registration Fee (₹)</label>
              <input type="number" min="0" value={form.registrationFee} onChange={e => set('registrationFee', e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label>Registration Limit</label>
            <input type="number" min="1" value={form.registrationLimit} onChange={e => set('registrationLimit', e.target.value)} placeholder="Unlimited" />
          </div>
        </div>

        <div className="form-group">
          <label>Tags (comma-separated)</label>
          <input value={form.eventTags} onChange={e => set('eventTags', e.target.value)} placeholder="e.g. coding, hackathon, prizes" />
        </div>
      </div>

      {/* Custom form builder (all event types) */}
      <div className="card card-lg mb-24">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111' }}>Registration Form Fields</h2>
            <button className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '6px 14px' }} onClick={addField}>+ Add Field</button>
          </div>

          {formFields.map((field, i) => (
            <div key={i} style={{ background: '#f7f7f7', borderRadius: 10, padding: 16, marginBottom: 12, border: '1px solid #e0e0e0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.78rem' }}>Label</label>
                  <input value={field.fieldLabel} onChange={e => updateField(i, 'fieldLabel', e.target.value)} placeholder="e.g. Team Name" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.78rem' }}>Type</label>
                  <select value={field.fieldType} onChange={e => updateField(i, 'fieldType', e.target.value)}>
                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 2 }}>
                  <button onClick={() => moveField(i, -1)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8rem' }} title="Move up">↑</button>
                  <button onClick={() => moveField(i, +1)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8rem' }} title="Move down">↓</button>
                  <button onClick={() => removeField(i)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#b91c1c' }}>✕</button>
                </div>
              </div>
              {['dropdown', 'checkbox', 'radio'].includes(field.fieldType) && (
                <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
                  <label style={{ fontSize: '0.78rem' }}>Options (comma-separated)</label>
                  <input
                    value={field.options.join(', ')}
                    onChange={e => updateField(i, 'options', e.target.value.split(',').map(o => o.trim()).filter(Boolean))}
                    placeholder="Option A, Option B, Option C"
                  />
                </div>
              )}
              {field.fieldType === 'number' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>Min Value</label>
                    <input type="number" value={field.min ?? ''} placeholder="No minimum"
                      onChange={e => updateField(i, 'min', e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>Max Value</label>
                    <input type="number" value={field.max ?? ''} placeholder="No maximum"
                      onChange={e => updateField(i, 'max', e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={field.isRequired} onChange={e => updateField(i, 'isRequired', e.target.checked)} />
                Required field
              </label>
            </div>
          ))}
        </div>

      {/* Merchandise event */}
      {form.eventType === 'Merchandise' && (
        <div className="card card-lg mb-24">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111' }}>Merchandise Items</h2>
            <button className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '6px 14px' }} onClick={addItem}>+ Add Item</button>
          </div>

          <div className="form-group" style={{ maxWidth: 200 }}>
            <label>Purchase Limit per Participant</label>
            <input type="number" min="1" value={form.purchaseLimitPerParticipant} onChange={e => set('purchaseLimitPerParticipant', e.target.value)} />
          </div>

          {merchItems.map((item, i) => (
            <div key={i} style={{ background: '#f7f7f7', borderRadius: 10, padding: 16, marginBottom: 12, border: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Item #{i + 1}</span>
                <button onClick={() => removeItem(i)} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#b91c1c' }}>Remove</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {[['name','Name *'], ['size','Size'], ['color','Color'], ['variant','Variant']].map(([key, lbl]) => (
                  <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>{lbl}</label>
                    <input value={item[key]} onChange={e => updateItem(i, key, e.target.value)} />
                  </div>
                ))}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.78rem' }}>Price (₹) *</label>
                  <input type="number" min="0" value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.78rem' }}>Stock *</label>
                  <input type="number" min="0" value={item.stockQuantity} onChange={e => updateItem(i, 'stockQuantity', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 48 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')} disabled={loading}>Cancel</button>
        <button className="btn btn-secondary" style={{ border: '1px solid #111', color: '#111' }}
          onClick={() => handleSubmit(false)} disabled={loading}>
          {loading ? 'Saving…' : 'Save as Draft'}
        </button>
        <button className="btn btn-primary" onClick={() => handleSubmit(true)} disabled={loading}>
          {loading ? 'Publishing…' : 'Save & Publish'}
        </button>
      </div>
    </div>
  );
};

export default CreateEvent;
