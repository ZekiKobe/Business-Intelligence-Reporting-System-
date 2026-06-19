import { RotateCcw, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBranding } from '../context/BrandingContext'
import BiPageHeader from '../components/BiPageHeader'
import BrandingLogoImg from '../components/BrandingLogoImg'

const Settings = () => {
  const { branding, updateBranding, resetBranding } = useBranding()
  const [settings, setSettings] = useState({
    companyName: 'Your Company',
    productName: 'BI Studio',
    tagline: 'Modern analytics workspace',
    logoUrl: '',
    primaryColor: '#2563eb',
    accentColor: '#14b8a6',
    darkMode: false,
    timezone: 'UTC-5',
    dateFormat: 'MM/DD/YYYY',
    emailNotifications: true,
    autoRefresh: false,
    refreshInterval: 15
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSettings((prev) => ({ ...prev, ...branding }))
  }, [branding])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    updateBranding({
      companyName: settings.companyName,
      productName: settings.productName,
      tagline: settings.tagline,
      logoUrl: settings.logoUrl,
      primaryColor: settings.primaryColor,
      accentColor: settings.accentColor,
      darkMode: settings.darkMode
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="ui-shell-page pb-10">
      <div className="mb-8">
        <BiPageHeader
          variant="slim"
          eyebrow="Workspace"
          title="Settings"
          description="Branding is saved on the server and shared with the viewer portal. You need an Admin role to publish changes."
          accent="sky"
        />
      </div>
      
      <div className="surface-card p-6 md:p-8">
        <form onSubmit={handleSubmit}>
          <h3 className="font-display font-semibold text-lg mb-5 text-brand">Branding & theme</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            <div>
              <label htmlFor="productName" className="ui-label">Product name</label>
              <input
                type="text"
                id="productName"
                name="productName"
                value={settings.productName}
                onChange={handleChange}
                className="ui-input"
              />
            </div>
            <div>
              <label htmlFor="logoUrl" className="ui-label">Logo URL</label>
              <input
                type="text"
                id="logoUrl"
                name="logoUrl"
                value={settings.logoUrl}
                onChange={handleChange}
                placeholder="/images/your-logo.png or https://…"
                className="ui-input"
              />
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                Leave empty for the default icon. For a custom file, add it under{' '}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">public/images/</code> in this app (or the viewer portal) and use a path like{' '}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">/images/logo1.png</code>.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-500 shrink-0">Preview</span>
                <div className="rounded-xl border border-gray-200 bg-white/80 p-2 shadow-sm">
                  <BrandingLogoImg logoUrl={settings.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="tagline" className="ui-label">Tagline</label>
              <input
                type="text"
                id="tagline"
                name="tagline"
                value={settings.tagline}
                onChange={handleChange}
                className="ui-input"
              />
            </div>
            <div>
              <label htmlFor="primaryColor" className="ui-label">Primary color</label>
              <input type="color" id="primaryColor" name="primaryColor" value={settings.primaryColor} onChange={handleChange} className="ui-input h-12 py-1" />
            </div>
            <div>
              <label htmlFor="accentColor" className="ui-label">Accent color</label>
              <input type="color" id="accentColor" name="accentColor" value={settings.accentColor} onChange={handleChange} className="ui-input h-12 py-1" />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="darkMode"
                name="darkMode"
                checked={settings.darkMode}
                onChange={handleChange}
                className="h-4 w-4 border-gray-300 rounded"
              />
              <label htmlFor="darkMode" className="ml-2 block text-sm">Enable dark mode</label>
            </div>
          </div>

          <h3 className="font-display font-semibold text-lg mb-5 text-brand pt-4 border-t border-gray-100">General preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <div>
              <label htmlFor="companyName" className="ui-label">Company name</label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={settings.companyName}
                onChange={handleChange}
                className="ui-input"
              />
            </div>
            
            <div>
              <label htmlFor="timezone" className="ui-label">Timezone</label>
              <select
                id="timezone"
                name="timezone"
                value={settings.timezone}
                onChange={handleChange}
                className="ui-select"
              >
                <option value="UTC-8">UTC-8 (PST)</option>
                <option value="UTC-7">UTC-7 (MST)</option>
                <option value="UTC-6">UTC-6 (CST)</option>
                <option value="UTC-5">UTC-5 (EST)</option>
                <option value="UTC+0">UTC+0 (GMT)</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="dateFormat" className="ui-label">Date format</label>
              <select
                id="dateFormat"
                name="dateFormat"
                value={settings.dateFormat}
                onChange={handleChange}
                className="ui-select"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="refreshInterval" className="ui-label">Refresh interval (minutes)</label>
              <input
                type="number"
                id="refreshInterval"
                name="refreshInterval"
                value={settings.refreshInterval}
                onChange={handleChange}
                min="1"
                max="60"
                className="ui-input"
              />
            </div>
          </div>
          
          <div className="mb-6 space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="emailNotifications"
                name="emailNotifications"
                checked={settings.emailNotifications}
                onChange={handleChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-700">Enable email notifications</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoRefresh"
                name="autoRefresh"
                checked={settings.autoRefresh}
                onChange={handleChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="autoRefresh" className="ml-2 block text-sm text-gray-700">Enable auto-refresh</label>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button type="button" className="ui-btn-secondary order-2 sm:order-1" onClick={resetBranding}>
              <RotateCcw size={16} /> Reset branding
            </button>
            <button type="submit" className="ui-btn-primary order-1 sm:order-2">
              <Save size={16} /> {saved ? "Saved" : "Save settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Settings