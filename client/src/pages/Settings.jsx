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
      setTestStatus('sent! check your notifications ✓');
    } catch (err) {
      setTestStatus(err.response?.data?.error || 'failed');
    }
    setTimeout(() => setTestStatus(null), 4000);
  }

  return (
    <div className="page">
      <div className="page-content settings-page">
        <h1 className="settings-title">settings</h1>

        {/* Push Notifications */}
        <section className="settings-section">
          <h2 className="settings-section-title">push notifications</h2>

          {!pushSupported && (
            <p className="settings-hint">
              push notifications aren't supported in this browser. install the app to your home screen first (iOS requires Safari).
            </p>
          )}

          {pushSupported && (
            <>
              <div className="settings-row">
                <span className="settings-label">status</span>
                <span className={`settings-badge ${subscribed ? 'badge-active' : 'badge-off'}`}>
                  {subscribed ? 'enabled ✓' : 'disabled'}
                </span>
              </div>

              {permission === 'denied' && (
                <p className="settings-hint">
                  notifications are blocked. go to your browser settings to allow them for this site.
                </p>
              )}

              <div className="settings-actions">
                {!subscribed ? (
                  <button
                    className="settings-btn settings-btn-primary"
                    onClick={subscribe}
                    disabled={loading || permission === 'denied' || !vapidKey}
                  >
                    {loading ? 'enabling...' : 'enable notifications'}
                  </button>
                ) : (
                  <button
                    className="settings-btn settings-btn-danger"
                    onClick={unsubscribe}
                    disabled={loading}
                  >
                    {loading ? 'disabling...' : 'disable notifications'}
                  </button>
                )}

                {subscribed && (
                  <button
                    className="settings-btn settings-btn-secondary"
                    onClick={sendTest}
                  >
                    send test notification
                  </button>
                )}
              </div>

              {testStatus && <p className="settings-test-status">{testStatus}</p>}

              <p className="settings-hint">
                notifications fire at the time you set per tracker. enable them on a tracker's edit screen.
                iOS 16.4+ required — the app must be installed to your home screen first.
              </p>
            </>
          )}
        </section>

        {/* App info */}
        <section className="settings-section">
          <h2 className="settings-section-title">about</h2>
          <div className="settings-row">
            <span className="settings-label">app</span>
            <span className="settings-value">archivo v1.0.0</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">storage</span>
            <span className="settings-value">sqlite on railway volume</span>
          </div>
        </section>
      </div>
    </div>
  );
}
