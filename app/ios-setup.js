/* Runs after `npx cap add ios` on the build machine: team, version, iPhone-only, icon, splash, Info.plist keys.
   Env: TEAM_ID, APP_VERSION, BUILD_NUMBER */
const fs = require('fs'), path = require('path');
const IOS = path.join(__dirname, 'ios', 'App'), APP = path.join(IOS, 'App');
const env = k => { const v = process.env[k]; if (!v) { console.error('Missing ' + k); process.exit(1); } return v; };
function must(cond, msg) { if (!cond) { console.error('ios-setup: ' + msg); process.exit(1); } }

// 1. project settings for the App target
const pbx = path.join(IOS, 'App.xcodeproj', 'project.pbxproj'); let p = fs.readFileSync(pbx, 'utf8');
must(/CODE_SIGN_STYLE = Automatic;/.test(p), 'CODE_SIGN_STYLE not found in project.pbxproj');
p = p.replace(/DEVELOPMENT_TEAM = [^;]*;\s*/g, '')
     .replace(/CODE_SIGN_STYLE = Automatic;/g, 'CODE_SIGN_STYLE = Automatic;\n\t\t\t\tDEVELOPMENT_TEAM = ' + env('TEAM_ID') + ';')
     .replace(/MARKETING_VERSION = [^;]*;/g, 'MARKETING_VERSION = ' + env('APP_VERSION') + ';')
     .replace(/CURRENT_PROJECT_VERSION = [^;]*;/g, 'CURRENT_PROJECT_VERSION = ' + env('BUILD_NUMBER') + ';')
     .replace(/TARGETED_DEVICE_FAMILY = [^;]*;/g, 'TARGETED_DEVICE_FAMILY = 1;');
fs.writeFileSync(pbx, p);

// 2. Info.plist: no export-compliance questions, light status bar, full screen
const plist = path.join(APP, 'Info.plist'); let ip = fs.readFileSync(plist, 'utf8');
const add = {
  ITSAppUsesNonExemptEncryption: '<false/>',
  UIStatusBarStyle: '<string>UIStatusBarStyleLightContent</string>',
  UIViewControllerBasedStatusBarAppearance: '<false/>',
  UIRequiresFullScreen: '<true/>',
  CFBundleDisplayName: '<string>One Cast</string>'
};
for (const [k, v] of Object.entries(add)) {
  const re = new RegExp('<key>' + k + '</key>\\s*<[^>]+>(?:[^<]*</[^>]+>)?');
  ip = re.test(ip) ? ip.replace(re, '<key>' + k + '</key>\n\t' + v) : ip.replace(/<\/dict>\s*<\/plist>\s*$/, '\t<key>' + k + '</key>\n\t' + v + '\n</dict>\n</plist>\n');
}
fs.writeFileSync(plist, ip);

// 3. app icon (single 1024 image; Xcode makes the rest)
const iconSet = path.join(APP, 'Assets.xcassets', 'AppIcon.appiconset');
must(fs.existsSync(iconSet), 'AppIcon.appiconset not found');
for (const f of fs.readdirSync(iconSet)) if (f.endsWith('.png')) fs.unlinkSync(path.join(iconSet, f));
fs.copyFileSync(path.join(__dirname, 'resources', 'icon-1024.png'), path.join(iconSet, 'AppIcon-1024.png'));
fs.writeFileSync(path.join(iconSet, 'Contents.json'), JSON.stringify({ images: [{ filename: 'AppIcon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }], info: { author: 'xcode', version: 1 } }, null, 2));

// 4. splash image (replace whatever images the template ships)
const splash = path.join(APP, 'Assets.xcassets', 'Splash.imageset');
if (fs.existsSync(splash)) {
  const c = JSON.parse(fs.readFileSync(path.join(splash, 'Contents.json'), 'utf8'));
  for (const im of c.images || []) if (im.filename) fs.copyFileSync(path.join(__dirname, 'resources', 'splash-2732.png'), path.join(splash, im.filename));
} else console.log('note: no Splash.imageset, skipping splash');
console.log('ios-setup done: team', process.env.TEAM_ID, 'version', process.env.APP_VERSION, 'build', process.env.BUILD_NUMBER);
