package app.cardperf

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.FragmentActivity

class MainActivity : FragmentActivity() {
    private lateinit var webView: WebView
    private lateinit var lockCover: View
    private lateinit var appLock: AppLock

    private val screenOff = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) = appLock.forceLock()
    }

    // Updated on the UI thread; read from the JS bridge's background thread.
    @Volatile private var currentUrl: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        lockCover = buildLockCover()
        val root = FrameLayout(this).apply {
            addView(webView, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
            addView(lockCover, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        }
        setContentView(root)
        // Android 15+ draws apps edge to edge; keep the page clear of the status and navigation bars.
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }

        appLock = AppLock(this) { locked -> lockCover.visibility = if (locked) View.VISIBLE else View.GONE }
        ContextCompat.registerReceiver(this, screenOff, IntentFilter(Intent.ACTION_SCREEN_OFF), ContextCompat.RECEIVER_NOT_EXPORTED)
        // Keep the payment list out of the recent-apps thumbnail.
        if (Build.VERSION.SDK_INT >= 33) setRecentsScreenshotEnabled(false)

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

    override fun onResume() {
        super.onResume()
        appLock.promptIfLocked()
    }

    override fun onPause() {
        CookieManager.getInstance().flush()
        super.onPause()
    }

    override fun onStop() {
        super.onStop()
        // Leaving the app or turning the screen off locks it again.
        if (!isChangingConfigurations) appLock.lock()
    }

    override fun onDestroy() {
        unregisterReceiver(screenOff)
        webView.destroy()
        super.onDestroy()
    }

    /** Full-screen cover shown while locked. */
    private fun buildLockCover(): View {
        val dp = resources.displayMetrics.density
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(getColor(R.color.page))
            isClickable = true // swallow touches so the page underneath can't be used
            addView(TextView(context).apply {
                text = "잠겨 있어요"
                textSize = 20f
                setTextColor(getColor(R.color.ink))
                gravity = Gravity.CENTER
            }, LinearLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
            addView(Button(context).apply {
                text = "잠금 해제"
                setOnClickListener { appLock.promptIfLocked() }
            }, LinearLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT).apply { topMargin = (24 * dp).toInt() })
        }
    }

    companion object {
        const val URL = "https://$APP_HOST"
    }
}
