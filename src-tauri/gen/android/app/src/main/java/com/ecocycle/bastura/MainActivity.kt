package com.ecocycle.bastura

import android.os.Bundle
import android.view.View
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    keepWebViewAboveNavigationBar()
  }

  /**
   * Edge-to-edge membuat WebView digambar sampai ke balik navigation bar
   * (tombol back/home/recent). WebView Android tidak selalu mengisi
   * env(safe-area-inset-bottom), jadi bagian bawah halaman dan bar yang
   * fixed ketutup. Di sini kontennya diberi jarak setinggi navigation bar;
   * status bar tetap dibiarkan supaya pt-safe di web tidak berubah.
   */
  private fun keepWebViewAboveNavigationBar() {
    val content = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val nav = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
      view.setPadding(nav.left, 0, nav.right, nav.bottom)
      // Bagian yang sudah jadi padding tidak diteruskan ke WebView, biar
      // safe-area di CSS tidak menghitungnya dua kali.
      insets.inset(nav.left, 0, nav.right, nav.bottom)
    }
  }
}
