import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

android {
    compileSdk = 36
    namespace = "com.ecocycle.bastura"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "com.ecocycle.bastura"
        minSdk = 24
        targetSdk = 36
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    // Kunci penandatangan APK release. keystore.properties (di-gitignore) berisi
    // password, keyAlias, dan storeFile; tanpa file itu build release tetap
    // jalan, hanya saja APK-nya tidak bertanda tangan.
    val keystorePropertiesFile = rootProject.file("keystore.properties")
    val hasReleaseKeystore = keystorePropertiesFile.exists()
    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                val keystoreProperties = Properties()
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["password"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["password"] as String
            }
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            if (hasReleaseKeystore) {
                signingConfig = signingConfigs.getByName("release")
            }
            isMinifyEnabled = true
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
}

rust {
    rootDirRel = "../../../"
}

// Salinan APK dengan nama yang rapi di outputs/apk, mis. "Bastura-v0.1.0.apk"
// (release) atau "Bastura-v0.1.0-debug.apk". File asli "app-universal-*.apk"
// sengaja dibiarkan karena Tauri CLI mencarinya dengan nama itu.
val apkVersionName = android.defaultConfig.versionName
afterEvaluate {
    for (profile in listOf("debug", "release")) {
        val profileCapitalized = profile.replaceFirstChar { it.uppercase() }
        tasks.findByName("assembleUniversal$profileCapitalized")?.doLast {
            val outputDir = layout.buildDirectory.dir("outputs/apk/universal/$profile").get().asFile
            val apk = outputDir.listFiles { file -> file.extension == "apk" }?.firstOrNull()
                ?: return@doLast
            val suffix = if (profile == "release") "" else "-$profile"
            val target = File(outputDir.parentFile, "Bastura-v$apkVersionName$suffix.apk")
            apk.copyTo(target, overwrite = true)
            println("APK disalin ke: ${target.absolutePath}")
        }
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-process:2.10.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = "tauri.build.gradle.kts")