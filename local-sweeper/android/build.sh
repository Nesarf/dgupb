#!/bin/bash
set -e
SDK=/opt/android-sdk; AJ=$SDK/pf/android-34/android.jar; BT=$SDK/bt/android-14
rm -rf build && mkdir -p build/gen build/classes build/dex
/usr/bin/aapt2 compile --dir res -o build/res.zip
/usr/bin/aapt2 link -o build/base.apk -I $AJ --manifest AndroidManifest.xml -R build/res.zip --java build/gen --auto-add-overlay -A assets
javac --release 11 -nowarn -cp $AJ -d build/classes build/gen/com/dgupb/sweeper/R.java java/com/dgupb/sweeper/MainActivity.java 2>/dev/null
java -cp $BT/lib/d8.jar com.android.tools.r8.D8 --lib $AJ --output build/dex $(find build/classes -name "*.class")
/usr/bin/python3 - <<'PY'
import zipfile, shutil
shutil.copy('build/base.apk', 'build/app.apk')
with zipfile.ZipFile('build/app.apk','a',zipfile.ZIP_DEFLATED) as z:
    z.write('build/dex/classes.dex','classes.dex')
PY
KS="$(cd "$(dirname "$0")" && pwd)/debug.keystore"
if [ ! -f "$KS" ]; then
  keytool -genkeypair -storetype JKS -keystore "$KS" -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" 2>/dev/null
fi
java -cp $BT/lib/apksigner.jar com.android.apksigner.ApkSignerTool sign --ks "$KS" --ks-pass pass:android --key-pass pass:android --out build/sweeper.apk build/app.apk 2>/dev/null
java -cp $BT/lib/apksigner.jar com.android.apksigner.ApkSignerTool verify build/sweeper.apk 2>/dev/null
cp build/sweeper.apk /sdcard/Download/DSH-Go/扫雷.apk
ls -lh build/sweeper.apk
