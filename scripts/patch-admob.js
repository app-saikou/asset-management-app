#!/usr/bin/env node
/**
 * expo prebuild 後に以下を自動適用するパッチスクリプト。
 *
 * 1. AppDelegate.swift へ AdMob クラッシュ防止パッチ
 *    問題: Google Mobile Ads SDK がフレームワークロード時にシグナルハンドラを登録するため、
 *          Hermes のシグナルハンドラと競合して iOS 26 でクラッシュする。
 *          JS 側の初期化より前に disableSDKCrashReporting() を呼ぶ必要がある。
 *    参考: invertase/react-native-google-mobile-ads #803, facebook/react-native #54859
 *
 * 2. アプリアイコンを assets/images/icon.png からネイティブアセットへコピー
 *    問題: expo prebuild が ios/ を再利用する場合、アイコンが更新されないことがある。
 */

const fs = require('fs');
const path = require('path');

const appDelegatePath = path.join(__dirname, '../ios/Tanao/AppDelegate.swift');

if (!fs.existsSync(appDelegatePath)) {
  console.error('❌ AppDelegate.swift が見つかりません:', appDelegatePath);
  process.exit(1);
}

let content = fs.readFileSync(appDelegatePath, 'utf8');

// 1. import GoogleMobileAds を追加（まだなければ）
if (!content.includes('import GoogleMobileAds')) {
  content = content.replace(
    'import Expo\n',
    'import Expo\nimport GoogleMobileAds\n'
  );
  console.log('✅ import GoogleMobileAds を追加しました');
} else {
  console.log('ℹ️  import GoogleMobileAds は既に存在します');
}

// 2. disableSDKCrashReporting() を didFinishLaunchingWithOptions の先頭に追加（まだなければ）
const crashReportingCall = 'MobileAds.shared.disableSDKCrashReporting()';
if (!content.includes(crashReportingCall)) {
  // let delegate = ReactNativeDelegate() の直前に挿入
  content = content.replace(
    '    let delegate = ReactNativeDelegate()',
    `    ${crashReportingCall}\n    let delegate = ReactNativeDelegate()`
  );
  console.log('✅ disableSDKCrashReporting() を追加しました');
} else {
  console.log('ℹ️  disableSDKCrashReporting() は既に存在します');
}

fs.writeFileSync(appDelegatePath, content, 'utf8');
console.log('✅ AppDelegate.swift へのパッチ適用が完了しました');

// ── アイコンコピー ──────────────────────────────────────────────────────────
const srcIcon = path.join(__dirname, '../assets/images/icon.png');
const destIcon = path.join(__dirname, '../ios/Tanao/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png');

if (!fs.existsSync(srcIcon)) {
  console.warn('⚠️  アイコンが見つかりません:', srcIcon);
} else if (!fs.existsSync(path.dirname(destIcon))) {
  console.warn('⚠️  アイコンのコピー先ディレクトリが見つかりません:', path.dirname(destIcon));
} else {
  const srcHash = fs.readFileSync(srcIcon);
  const destHash = fs.existsSync(destIcon) ? fs.readFileSync(destIcon) : null;
  if (destHash && srcHash.equals(destHash)) {
    console.log('ℹ️  アイコンは最新です（コピー不要）');
  } else {
    fs.copyFileSync(srcIcon, destIcon);
    console.log('✅ アイコンをネイティブアセットにコピーしました');
  }
}
