package app.cardperf

import android.content.Intent
import android.graphics.Bitmap
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.ComponentActivity

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView

    // Updated on the UI thread; read from the JS bridge's background thread.
    @Volatile private var currentUrl: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        CookieManager.getInstance().setAcceptCookie(true)
        webView.addJavascriptInterface(Bridge(this) { currentUrl }, "CardApp")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (isAppUrl(uri.toString())) return false
                if (!isLaunchableScheme(uri.scheme)) return true
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                } catch (_: Exception) {
                }
                return true
            }

            override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
                currentUrl = url
            }

            override fun onPageFinished(view: WebView, url: String?) {
                currentUrl = url
            }

            override fun doUpdateVisitedHistory(view: WebView, url: String?, isReload: Boolean) {
                currentUrl = url
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        if (savedInstanceState == null) webView.loadUrl(URL) else webView.restoreState(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onPause() {
        CookieManager.getInstance().flush()
        super.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        const val URL = "https://$APP_HOST"
    }
}
