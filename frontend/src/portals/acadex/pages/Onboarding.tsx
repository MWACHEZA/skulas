import { useState } from 'react';
import api from '../../../lib/api';

export default function AcadexProvisioning() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'Secondary',
    address: '',
    region: 'Zimbabwe',
    plan: 'Professional'
  });

  const handleProvision = async () => {
    setLoading(true);
    setError('');
    // Step 4 is the "Processing" step
    setStep(4);
    
    try {
      // Small delay to simulate "Global Provisioning" experience
      await new Promise(r => setTimeout(r, 2500));
      
      const { data } = await api.post('/api/auth/register', {
        name: form.name,
        email: form.email.trim().toLowerCase(),
        password: 'Admin123', // Default initial password
        planName: form.plan,
        type: form.type.toLowerCase(),
        address: form.address
      });

      setSuccessData(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Provisioning failed. Please check network/database.');
      setStep(3); // Go back to allow fix
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>New School Provisioning</h1>
        <p>Deploy a new isolated school environment and configure its initial administrative credentials.</p>
      </div>

      <div className="portal-card" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="portal-card-header" style={{ justifyContent: 'center', borderBottom: '1px solid #edf2f7' }}>
           <div style={{ display: 'flex', gap: 40 }}>
              <div style={{ textAlign: 'center', opacity: step >= 1 ? 1 : 0.4 }}>
                 <div style={{ width: 32, height: 32, background: step >= 1 ? 'var(--portal-primary)' : '#cbd5e0', color: '#fff', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, transition: '0.3s' }}>1</div>
                 <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Entity</span>
              </div>
              <div style={{ textAlign: 'center', opacity: step >= 2 ? 1 : 0.4 }}>
                 <div style={{ width: 32, height: 32, background: step >= 2 ? 'var(--portal-primary)' : '#cbd5e0', color: '#fff', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, transition: '0.3s' }}>2</div>
                 <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Identity</span>
              </div>
              <div style={{ textAlign: 'center', opacity: step >= 3 ? 1 : 0.4 }}>
                 <div style={{ width: 32, height: 32, background: step >= 3 ? 'var(--portal-primary)' : '#cbd5e0', color: '#fff', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, transition: '0.3s' }}>3</div>
                 <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Plan</span>
              </div>
              <div style={{ textAlign: 'center', opacity: step >= 4 ? 1 : 0.4 }}>
                 <div style={{ width: 32, height: 32, background: step >= 4 ? 'var(--portal-primary)' : '#cbd5e0', color: '#fff', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, transition: '0.3s' }}>4</div>
                 <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Done</span>
              </div>
           </div>
        </div>
        <div className="portal-card-body" style={{ padding: 40 }}>
          {error && (
            <div className="portal-alert error" style={{ marginBottom: 24 }}>
              <i className="fas fa-exclamation-triangle"></i> {error}
            </div>
          )}

          {step === 1 && (
            <div className="portal-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="portal-form-group" style={{ gridColumn: 'span 2' }}>
                <label>Legal School Name</label>
                <input type="text" className="portal-input" placeholder="e.g. Heritage High School"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="portal-form-group">
                <label>Admin Email</label>
                <input type="email" className="portal-input" placeholder="admin@school.com"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value.replace(/\s+/g, '')})} />
                <small style={{ color: '#718096', display: 'block', marginTop: 4 }}>Spaces are automatically removed.</small>
              </div>
              <div className="portal-form-group">
                <label>Phone Number</label>
                <input type="text" className="portal-input" placeholder="+263..."
                  value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div style={{ gridColumn: 'span 2', textAlign: 'right', marginTop: 20 }}>
                <button className="portal-btn-primary" onClick={() => setStep(2)} disabled={!form.name || !form.email}>
                  Next: School Identity <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="portal-form-grid">
               <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
                  <div style={{ width: 100, height: 100, borderRadius: 12, border: '2px dashed var(--portal-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#718096', fontSize: '0.75rem' }}>
                    <i className="fas fa-image" style={{ fontSize: '1.5rem', marginBottom: 4 }}></i>
                    Logo
                  </div>
                  <div style={{ flex: 1 }}>
                     <label>School Type</label>
                     <select className="portal-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                        <option>Primary</option>
                        <option>Secondary</option>
                        <option>Combined</option>
                        <option>College / University</option>
                        <option>Nursing School</option>
                        <option>Medical College</option>
                      </select>
                  </div>
               </div>
               <div className="portal-form-group">
                  <label>Physical Address</label>
                  <textarea className="portal-input" style={{ minHeight: 80, resize: 'vertical' }} placeholder="Enter full physical address..."
                    value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
               </div>
               <div className="portal-form-group">
                  <label>Region / Country</label>
                  <select className="portal-input" value={form.region} onChange={e => setForm({...form, region: e.target.value})}>
                    <option>Zimbabwe</option>
                    <option>South Africa</option>
                    <option>Zambia</option>
                  </select>
               </div>
               <div style={{ textAlign: 'right', marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
                <button className="portal-btn-secondary" onClick={() => setStep(1)}><i className="fas fa-arrow-left"></i> Back</button>
                <button className="portal-btn-primary" onClick={() => setStep(3)}>Next: Plan Selection <i className="fas fa-arrow-right"></i></button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
               <div className="portal-grid-3">
                  {['Starter', 'Professional', 'Enterprise'].map(p => (
                    <div key={p} 
                      className="portal-card" 
                      style={{ 
                        border: form.plan === p ? '2px solid var(--portal-primary)' : '1px solid var(--portal-border)', 
                        cursor: 'pointer',
                        transition: '0.2s',
                        background: form.plan === p ? 'rgba(var(--portal-primary-rgb), 0.03)' : 'white'
                      }}
                      onClick={() => setForm({...form, plan: p})}
                    >
                      <div className="portal-card-body" style={{ textAlign: 'center' }}>
                         <h3 style={{ margin: 0 }}>{p}</h3>
                         <p style={{ color: form.plan === p ? 'var(--portal-primary)' : '#718096', fontWeight: form.plan === p ? 700 : 400 }}>
                           {p === 'Starter' ? '$49/mo' : p === 'Professional' ? '$149/mo' : 'Custom'}
                         </p>
                      </div>
                    </div>
                  ))}
               </div>
               <div style={{ textAlign: 'right', marginTop: 40, display: 'flex', justifyContent: 'space-between' }}>
                <button className="portal-btn-secondary" onClick={() => setStep(2)}><i className="fas fa-arrow-left"></i> Back</button>
                <button className="portal-btn-primary" onClick={handleProvision}>
                  Start Global Provisioning <i className="fas fa-magic"></i>
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
               {!successData ? (
                 <>
                   <i className="fas fa-cog fa-spin" style={{ fontSize: '3rem', color: 'var(--portal-primary)', marginBottom: 20 }}></i>
                   <h2>Configuring Database Clusters...</h2>
                   <p style={{ color: '#718096' }}>Setting up isolated schemas and initial admin credentials for {form.name}.</p>
                   <div style={{ width: '100%', height: 10, background: '#edf2f7', borderRadius: 5, marginTop: 30, overflow: 'hidden' }}>
                      <div style={{ width: '65%', height: '100%', background: 'var(--portal-primary)', transition: 'width 2s' }}></div>
                   </div>
                 </>
               ) : (
                 <div style={{ animation: 'fadeIn 0.5s ease' }}>
                    <div style={{ width: 80, height: 80, background: 'var(--portal-success)', color: 'white', borderRadius: '50%', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                      <i className="fas fa-check"></i>
                    </div>
                    <h2 style={{ color: 'var(--portal-success)', marginBottom: 12 }}>School Provisioned Successfully!</h2>
                    <p style={{ color: '#4a5568', marginBottom: 32 }}><strong>{form.name}</strong> has been deployed to the Acadex network.</p>
                    
                    <div className="portal-card" style={{ background: 'var(--portal-bg)', border: 'none', textAlign: 'left', padding: 24, display: 'inline-block', minWidth: 350 }}>
                       <div style={{ marginBottom: 16 }}>
                          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#718096', display: 'block' }}>School Access Code</span>
                          <strong style={{ fontSize: '1.4rem', color: 'var(--portal-primary)', letterSpacing: 2 }}>{successData.schoolCode}</strong>
                       </div>
                       <div>
                          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#718096', display: 'block' }}>Admin Credentials</span>
                          <div style={{ fontSize: '0.9rem' }}>Email: <strong>{form.email}</strong></div>
                          <div style={{ fontSize: '0.9rem' }}>Temp Password: <strong>Admin123</strong></div>
                       </div>
                    </div>
                    
                    <div style={{ marginTop: 40 }}>
                       <button className="portal-btn-primary" onClick={() => window.location.href = '/acadex/schools'}>View Registry <i className="fas fa-university"></i></button>
                    </div>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
