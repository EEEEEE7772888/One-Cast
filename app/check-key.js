/* Tests the App Store Connect API key before building, and says plainly what is wrong if Apple rejects it.
   Env: ASC_KEY_ID, ASC_ISSUER_ID; key file at ~/private_keys/AuthKey_<id>.p8 */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), https = require('https');
const kid = (process.env.ASC_KEY_ID || '').trim(), iss = (process.env.ASC_ISSUER_ID || '').trim();
const file = path.join(os.homedir(), 'private_keys', 'AuthKey_' + kid + '.p8');
const err = m => { console.log('::error::' + m); process.exitCode = 1; };
let pem = fs.readFileSync(file, 'utf8').replace(/\r/g, '').trim();
if (!/^-----BEGIN PRIVATE KEY-----\n[\s\S]+\n-----END PRIVATE KEY-----$/.test(pem)) return err('ASC_KEY_P8 does not look like a whole .p8 file. Paste ALL of it, including the BEGIN PRIVATE KEY and END PRIVATE KEY lines.');
if (!/^[A-Z0-9]{10}$/.test(kid)) err('ASC_KEY_ID should be 10 letters/numbers (it is "' + kid.length + ' characters"). It is the Key ID column on the API keys page.');
if (!/^[0-9a-f-]{36}$/i.test(iss)) err('ASC_ISSUER_ID should look like 12345678-abcd-... (36 characters). It is shown above the list of Team Keys.');
if (process.exitCode) return;
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const head = b64({ alg: 'ES256', kid, typ: 'JWT' }), body = b64({ iss, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' });
let sig; try { sig = crypto.sign('sha256', Buffer.from(head + '.' + body), { key: pem, dsaEncoding: 'ieee-p1363' }).toString('base64url'); }
catch (e) { return err('The .p8 text could not be read as a key (' + e.message + '). Re-paste the whole file into ASC_KEY_P8.'); }
https.get({ host: 'api.appstoreconnect.apple.com', path: '/v1/apps?filter[bundleId]=io.github.onecast', headers: { Authorization: 'Bearer ' + head + '.' + body + '.' + sig } }, res => {
  let d = ''; res.on('data', c => d += c); res.on('end', () => {
    if (res.statusCode === 401) return err('Apple rejected the API key (401). Check: it is a TEAM key (Users and Access > Integrations > App Store Connect API > Team Keys, not Individual Keys); ASC_KEY_ID matches that key; ASC_ISSUER_ID is the Issuer ID above the Team Keys list; ASC_KEY_P8 is that same key\'s file.');
    if (res.statusCode === 403) return err('The API key works but is not allowed to do this (403). Make a new Team key with Admin access.');
    if (res.statusCode !== 200) return err('App Store Connect answered ' + res.statusCode + ': ' + d.slice(0, 300));
    const apps = (JSON.parse(d).data || []);
    if (!apps.length) return err('The key works, but no app with bundle ID io.github.onecast was found in App Store Connect.');
    console.log('API key OK. Found app: ' + apps[0].attributes.name + ' (' + apps[0].attributes.bundleId + ')');
  });
}).on('error', e => err('Could not reach Apple: ' + e.message));
