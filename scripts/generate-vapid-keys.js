#!/usr/bin/env node
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('VAPID keys generated — paste these into Railway env vars:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:your@email.com`);
