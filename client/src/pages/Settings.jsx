import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import './Settings.css';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function Settings() {
  const [pushSupported, setPushSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [vapidKey, setVapidKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setPushSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
    api.get('/push/vapid-key').then((r) => setVapidKey(r.data.publicKey)).catch(() => {});
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {}
  }

  async function subscribe() {
    if (!vapidKey) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setLoading(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await api.post('/push/subscribe', {
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
        },
      });
      setSubscribed(true);
    } catch (err) {
      console.error('subscribe error', err);
    }
    setLoading(false);
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post('/push/unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error('unsubscribe error', err);
    }
    setLoading(false);
  }

  async function sendTest() {
    setTestStatus('sending...');
    try {
      await api.post('/push/test');
      setTestStatus('sent ✓ check your notifications');
    } catch (err) {
      setTestStatus(err.response?.data?.error || 'failed to send');
    }
    setTimeout(() => setTestStatus(null), 4000);
  }

  function getPushStatus() {
    if (!pushSupported) return { label: 'not available', variant: 'off' };
    if (subscribed) return { label: 'enabled ✓', variant: 'active' };
    return { label: 'disabled', variant: 'off' };
  }

  const { label: statusLabel, variant: statusVariant } = getPushStatus();

  return (
    <div className="page">
      <div className="page-content settings-page">
        <h1 className="settings-title">settings</h1>

        {/* Push Notifications */}
        <section className="settings-section">
          <h2 className="settings-section-title">push notifications</h2>

          <div className="settings-row">
            <span className="settings-label">status</span>
            <span className={`settings-badge badge-${statusVariant}`}>{statusLabel}</span>
          </div>

          {!pushSupported && (
            <p className="settings-hint">
              not available in this browser. on iOS, install archivo to your home screen via Safari first — then open from the home screen icon to enable push.
            </p>
          )}

          {pushSupported && permission === 'denied' && (
            <p className="settings-hint">
              notifications are blocked. go to your browser/system settings to allow them for this site, then reload.
            </p>
          )}

          {pushSupported && permission !== 'denied' && (
            <div className="settings-actions">
              {!subscribed ? (
                <button
                  className="settings-btn settings-btn-primary"
                  onClick={subscribe}
                  disabled={loading || !vapidKey}
                >
                  {loading ? 'enabling...' : 'enable notifications'}
                </button>
              ) : (
                <>
                  <button
                    className="settings-btn settings-btn-secondary"
                    onClick={sendTest}
                    disabled={!!testStatus}
                  >
                    send test notification
                  </button>
                  <button
                    className="settings-btn settings-btn-danger"
                    onClick={unsubscribe}
                    disabled={loading}
                  >
                    {loading ? 'disabling...' : 'disable notifications'}
                  </button>
                </>
              )}

              {testStatus && <p className="settings-test-status">{testStatus}</p>}
            </div>
          )}

          <p className="settings-hint" style={{ marginTop: 12 }}>
            notification times are set per tracker. edit a tracker to enable daily reminders. iOS 16.4+ required.
          </p>
        </section>

        {/* About */}
        <section className="settings-section">
          <h2 className="settings-section-title">about</h2>
          <div className="settings-row">
            <span className="settings-label">app</span>
            <span className="settings-value">archivo v1.0.0</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">storage</span>
            <span className="settings-value">sqlite · railway volume</span>
          </div>
          <div className="settings-row" style={{ border: 'none' }}>
            <span className="settings-label">ai</span>
            <span className="settings-value">openrouter</span>
          </div>
        </section>
      </div>
    </div>
  );
}
