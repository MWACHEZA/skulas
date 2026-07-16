import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import api from '../../../../lib/api';
import { useAuth } from '../../../../contexts/AuthContext';

// ── Country / State data ──────────────────────────────────────────────────────
// Comprehensive list of countries with their common states/provinces
const COUNTRIES: string[] = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahamas','Bahrain','Bangladesh','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina',
  'Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Cape Verde',
  'Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba',
  'Cyprus','Czech Republic','Democratic Republic of Congo','Denmark','Djibouti','Dominican Republic','Ecuador',
  'Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France',
  'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti',
  'Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan',
  'Jordan','Kazakhstan','Kenya','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia',
  'Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta',
  'Mauritania','Mauritius','Mexico','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
  'Namibia','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia',
  'Norway','Oman','Pakistan','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland',
  'Portugal','Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia','Sierra Leone','Singapore',
  'Slovakia','Slovenia','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan',
  'Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo',
  'Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Uganda','Ukraine','United Arab Emirates',
  'United Kingdom','United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'
];

const STATES_BY_COUNTRY: Record<string, string[]> = {
  'Zimbabwe': ['Bulawayo','Harare','Manicaland','Mashonaland Central','Mashonaland East','Mashonaland West','Masvingo','Matabeleland North','Matabeleland South','Midlands'],
  'South Africa': ['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape'],
  'Kenya': ['Nairobi','Mombasa','Kisumu','Nakuru','Uasin Gishu','Kiambu','Machakos','Kajiado','Kilifi','Kwale'],
  'Nigeria': ['Abia','Adamawa','Anambra','Bauchi','Borno','Delta','Edo','Enugu','FCT','Imo','Kaduna','Kano','Lagos','Ogun','Oyo','Rivers'],
  'United States': ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'],
  'United Kingdom': ['England','Northern Ireland','Scotland','Wales'],
  'India': ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'],
  'Australia': ['Australian Capital Territory','New South Wales','Northern Territory','Queensland','South Australia','Tasmania','Victoria','Western Australia'],
  'Canada': ['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Nova Scotia','Ontario','Prince Edward Island','Quebec','Saskatchewan'],
  'Ghana': ['Ashanti','Brong-Ahafo','Central','Eastern','Greater Accra','Northern','Upper East','Upper West','Volta','Western'],
  'Tanzania': ['Arusha','Dar es Salaam','Dodoma','Geita','Iringa','Kagera','Katavi','Kigoma','Kilimanjaro','Lindi','Manyara','Mara','Mbeya','Morogoro','Mtwara','Mwanza','Njombe','Pwani','Rukwa','Ruvuma','Shinyanga','Simiyu','Singida','Tabora','Tanga','Zanzibar'],
  'Zambia': ['Central','Copperbelt','Eastern','Luapula','Lusaka','Muchinga','Northern','North-Western','Southern','Western'],
  'Botswana': ['Central','Chobe','Francistown','Gaborone','Ghanzi','Kgalagadi','Kgatleng','Kweneng','Lobatse','North East','North West','South East','Southern'],
  'Malawi': ['Balaka','Blantyre','Chikwawa','Chiradzulu','Chitipa','Dedza','Dowa','Karonga','Kasungu','Likoma','Lilongwe','Machinga','Mangochi','Mchinji','Mulanje','Mwanza','Mzimba','Neno','Nkhata Bay','Nkhotakota','Nsanje','Ntcheu','Ntchisi','Phalombe','Rumphi','Salima','Thyolo','Zomba'],
};

interface AboutFormValues {
  aboutTitle: string;
  directorName: string;
  directorTitle: string;
  countryOfEstablishment: string;
  stateOfEstablishment: string;
  yearOfEstablishment: string;
  aboutFeatures: string[];
  directorImage: string;

  // Contact Info
  address: string;
  phone: string;
  email: string;
  website: string;

  // Social Links
  facebook: string;
  twitter: string;
  linkedin: string;
  instagram: string;
  youtube: string;
  tiktok: string;
}

export default function AboutSettings() {
  const { user, refreshUser } = useAuth();
  const branding: any = (user?.schoolBranding as any) || {};

  // Determine school type for leader label
  const schoolType = (user?.schoolType || 'Secondary').toLowerCase();
  const isTertiary = schoolType.includes('college') || schoolType.includes('colledge') ||
    schoolType.includes('university') || schoolType.includes('varsity') ||
    schoolType.includes('tertiary') || schoolType.includes('nursing') ||
    schoolType.includes('medical') || schoolType.includes('poly') ||
    schoolType.includes('seminary');
  const leaderLabel = isTertiary ? 'Principal' : 'Headmaster';

  const { register, control, handleSubmit, setValue, watch } = useForm<AboutFormValues>({
    defaultValues: {
      aboutFeatures: [],
      address: user?.school?.address || '',
      phone: user?.school?.phone || '',
      email: user?.school?.email || '',
      website: user?.school?.website || '',
      facebook: branding.facebook || '',
      twitter: branding.twitter || '',
      linkedin: '',
    }
  });

  const [planFeatures, setPlanFeatures] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);

  const directorImage = watch('directorImage');
  const selectedCountry = watch('countryOfEstablishment');

  const availableStates = STATES_BY_COUNTRY[selectedCountry] || [];

  const handleDirectorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/website-settings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setValue('directorImage', res.data.filename);
      toast.success(`${leaderLabel} image uploaded successfully!`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload ${leaderLabel.toLowerCase()} image.`);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [websiteRes, schoolSettingsRes, schoolInfoRes] = await Promise.all([
        api.get('/api/website-settings'),
        api.get('/api/schools/settings'),
        api.get('/api/schools/me').catch(() => ({ data: null }))
      ]);

      if (websiteRes.data) {
        Object.keys(websiteRes.data).forEach(key => {
          if (key !== 'aboutFeatures') {
            setValue(key as any, websiteRes.data[key]);
          }
        });
      }

      if (schoolSettingsRes.data) {
        // Pull contact info from settings
        const s = schoolSettingsRes.data;
        if (s.phone)     setValue('phone', s.phone);
        if (s.address)   setValue('address', s.address);
        if (s.systemEmail) setValue('email', s.systemEmail);
        if (s.facebook)  setValue('facebook', s.facebook);
        if (s.twitter)   setValue('twitter', s.twitter);
        if (s.instagram) setValue('instagram', s.instagram);
        if (s.youtube)   setValue('youtube', s.youtube);
        if (s.linkedin)  setValue('linkedin', s.linkedin);
        if (s.tiktok)    setValue('tiktok', s.tiktok);
      }

      // Set school features from plan
      if (schoolInfoRes.data?.plan?.features) {
        setPlanFeatures(schoolInfoRes.data.plan.features);
      }

    } catch (error) {
      console.error('Failed to load settings', error);
    
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data: AboutFormValues) => {
    setLoading(true);
    try {
      // 1. Save website settings (About details + features + director)
      const websiteData = {
        aboutTitle: data.aboutTitle,
        directorName: data.directorName,
        directorTitle: data.directorTitle,
        countryOfEstablishment: data.countryOfEstablishment,
        yearOfEstablishment: data.yearOfEstablishment,
        aboutFeatures: planFeatures,
        directorImage: data.directorImage,
      };
      await api.put('/api/website-settings', websiteData);

      // 2. Save ALL contact info and ALL social links via /api/schools/info
      await api.patch('/api/schools/info', {
        address:   data.address,
        phone:     data.phone,
        email:     data.email,
        website:   data.website,
        twitter:   data.twitter,
        facebook:  data.facebook,
        linkedin:  data.linkedin,
        instagram: data.instagram,
        youtube:   data.youtube,
        tiktok:    data.tiktok,
      });

      await refreshUser();
      toast.success('About us settings saved successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="portal-card" style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div className="portal-card">
      <div className="portal-card-header">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>About Us Details</h2>
      </div>

      <div className="portal-card-body" style={{ padding: '24px' }}>
        <form onSubmit={handleSubmit(onSubmit)}>

          {/* ── Section 1: About Details ──────────────────────────────────── */}
          <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>About Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="portal-form-group">
              <label className="portal-label">About Title <span style={{ color: 'red' }}>*</span></label>
              <input type="text" {...register('aboutTitle')} className="portal-input" placeholder="e.g. About Our School" />
            </div>

            <div className="portal-form-group">
              <label className="portal-label">{leaderLabel} Name <span style={{ color: 'red' }}>*</span></label>
              <input type="text" {...register('directorName')} className="portal-input" placeholder={`${leaderLabel} full name`} />
            </div>

            <div className="portal-form-group">
              <label className="portal-label">{leaderLabel} Title <span style={{ color: 'red' }}>*</span></label>
              <input type="text" {...register('directorTitle')} className="portal-input" placeholder={`e.g. ${leaderLabel}`} />
            </div>

            <div className="portal-form-group">
              <label className="portal-label">Country of School Establishment <span style={{ color: 'red' }}>*</span></label>
              <select {...register('countryOfEstablishment')} className="portal-input">
                <option value="">Select Country</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {availableStates.length > 0 && (
              <div className="portal-form-group">
                <label className="portal-label">State / Province</label>
                <select {...register('stateOfEstablishment')} className="portal-input">
                  <option value="">Select State</option>
                  {availableStates.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="portal-form-group">
              <label className="portal-label">Year of School Establishment <span style={{ color: 'red' }}>*</span></label>
              <input type="text" {...register('yearOfEstablishment')} className="portal-input" placeholder="e.g. 1998" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {/* School Features */}
            <div className="portal-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label className="portal-label">School Features (From Subscription Plan - Read Only)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {planFeatures.map((feat, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>{feat}</span>
                  </div>
                ))}
                {planFeatures.length === 0 && (
                  <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.85rem' }}>No features included in subscription plan.</p>
                )}
              </div>
            </div>

            {/* Director Image */}
            <div className="portal-form-group">
              <label className="portal-label">{leaderLabel} Image <span style={{ color: 'red' }}>*</span></label>
              <input type="file" className="portal-input" style={{ padding: '8px' }} onChange={handleDirectorImageUpload} accept="image/*" />
              <input type="hidden" {...register('directorImage')} />
              {uploading && <p style={{ fontSize: '0.8rem', color: 'var(--school-primary, #3182ce)', marginTop: '6px' }}><i className="fas fa-spinner fa-spin mr-1"></i> Uploading image...</p>}
              {directorImage && !uploading && (
                <div style={{ marginTop: '10px' }}>
                  <img
                    src={`${api.defaults.baseURL}/api/storage/media/${user?.schoolCode}/${directorImage}`}
                    alt={`${leaderLabel} Preview`}
                    style={{ maxHeight: '120px', borderRadius: '8px', border: '1px solid #cbd5e1', objectFit: 'cover' }}
                    onError={(e) => {
                      try {
                        const userStr = localStorage.getItem('acadex_user');
                        if (userStr) {
                          const u = JSON.parse(userStr);
                          if (u.schoolCode) {
                            (e.target as HTMLImageElement).src = `${api.defaults.baseURL}/api/storage/media/${u.schoolCode}/${directorImage}`;
                          }
                        }
                      } catch (err) {}
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Section 2: Contact Info ───────────────────────────────────── */}
          <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>Contact Info</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="portal-form-group">
              <label className="portal-label">Physical Address</label>
              <input type="text" {...register('address')} className="portal-input" placeholder="Street address, City" />
            </div>
            <div className="portal-form-group">
              <label className="portal-label">Telephone</label>
              <input type="text" {...register('phone')} className="portal-input" placeholder="+263 XX XXX XXXX" />
            </div>
            <div className="portal-form-group">
              <label className="portal-label">Contact Email</label>
              <input type="email" {...register('email')} className="portal-input" placeholder="info@school.ac.zw" />
            </div>
            <div className="portal-form-group">
              <label className="portal-label">School Website URL</label>
              <input type="text" {...register('website')} className="portal-input" placeholder="https://www.school.ac.zw" />
            </div>
          </div>

          {/* ── Section 3: Social Connections ────────────────────────────── */}
          <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>Social Connections</h4>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
            Enter the full URL for each platform. These will appear on public-facing pages and in the footer.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="portal-form-group">
              <label className="portal-label"><i className="fab fa-facebook mr-2" style={{ color: '#1877f2' }}></i>Facebook URL</label>
              <input type="text" {...register('facebook')} className="portal-input" placeholder="https://facebook.com/yourschool" />
            </div>
            <div className="portal-form-group">
              <label className="portal-label"><i className="fab fa-twitter mr-2" style={{ color: '#1da1f2' }}></i>Twitter / X URL</label>
              <input type="text" {...register('twitter')} className="portal-input" placeholder="https://twitter.com/yourschool" />
            </div>
            <div className="portal-form-group">
              <label className="portal-label"><i className="fab fa-linkedin mr-2" style={{ color: '#0a66c2' }}></i>LinkedIn URL</label>
              <input type="text" {...register('linkedin')} className="portal-input" placeholder="https://linkedin.com/school/yourschool" />
            </div>
            <div className="portal-form-group">
              <label className="portal-label"><i className="fab fa-instagram mr-2" style={{ color: '#e1306c' }}></i>Instagram URL</label>
              <input type="text" {...register('instagram')} className="portal-input" placeholder="https://instagram.com/yourschool" />
            </div>
            <div className="portal-form-group">
              <label className="portal-label"><i className="fab fa-youtube mr-2" style={{ color: '#ff0000' }}></i>YouTube URL</label>
              <input type="text" {...register('youtube')} className="portal-input" placeholder="https://youtube.com/@yourschool" />
            </div>
            <div className="portal-form-group">
              <label className="portal-label"><i className="fab fa-tiktok mr-2" style={{ color: '#000000' }}></i>TikTok URL</label>
              <input type="text" {...register('tiktok')} className="portal-input" placeholder="https://tiktok.com/@yourschool" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="submit" disabled={loading} className="portal-btn-primary" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-save"></i> {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
