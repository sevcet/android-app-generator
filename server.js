const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const fse = require('fs-extra');
const os = require('os');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/generate-apk', upload.single('appIcon'), (req, res) => {
    const appName = req.body.appName;
    const playlistURL = req.body.playlistURL;
    const appIcon = req.file.path;

    // Kreiraj novi direktorijum za Android projekat
    const projectDir = path.join(__dirname, 'generated', appName);
    fse.copySync(path.join(__dirname, 'android-project-template'), projectDir);

    // Ažuriraj AndroidManifest.xml
    const manifestPath = path.join(projectDir, 'app/src/main/AndroidManifest.xml');
    let manifestContent = fs.readFileSync(manifestPath, 'utf8');
    manifestContent = manifestContent.replace('com.example.app', `com.example.${appName}`);
    fs.writeFileSync(manifestPath, manifestContent, 'utf8');

    // Ažuriraj strings.xml
    const stringsPath = path.join(projectDir, 'app/src/main/res/values/strings.xml');
    let stringsContent = fs.readFileSync(stringsPath, 'utf8');
    stringsContent = stringsContent.replace('AppName', appName);
    fs.writeFileSync(stringsPath, stringsContent, 'utf8');

    // Zameni ikonu aplikacije
    const iconPath = path.join(projectDir, 'app/src/main/res/drawable/app_icon.png');
    fs.copyFileSync(appIcon, iconPath);

    // Ažuriraj MainActivity.java sa URL plej liste
    const mainActivityPath = path.join(projectDir, 'app/src/main/java/com/example/app/MainActivity.java');
    let mainActivityContent = fs.readFileSync(mainActivityPath, 'utf8');
    mainActivityContent = mainActivityContent.replace('PLAYLIST_URL', playlistURL);
    fs.writeFileSync(mainActivityPath, mainActivityContent, 'utf8');

    // Pokreni Gradle build
    const buildCommand = os.platform() === 'win32' ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug';

    exec(buildCommand, { cwd: projectDir }, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error: ${err.message}`);
            return res.status(500).send('Error generating APK');
        }
        const apkPath = path.join(projectDir, 'app/build/outputs/apk/debug/app-debug.apk');
        res.download(apkPath, `${appName}.apk`);
    });
});

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
