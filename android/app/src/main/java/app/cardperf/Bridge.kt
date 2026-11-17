package app.cardperf

import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.webkit.JavascriptInterface
import androidx.core.app.NotificationManagerCompat

/** Exposed to the web app as `window.CardApp`. */
class Bridge(private val context: Context, private val currentUrl: () -> String?) {
    private val prefs = Prefs(context)

    private fun allowed() = isAppUrl(currentUrl())

    @JavascriptInterface
    fun setToken(token: String) {
        if (allowed()) prefs.token = token
    }

    @JavascriptInterface
    fun hasToken(): Boolean = allowed() && prefs.token != null

    @JavascriptInterface
    fun hasNotificationAccess(): Boolean =
        allowed() && NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)

    @JavascriptInterface
    fun openNotificationAccess() = if (allowed()) launch(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) else Unit

    @JavascriptInterface
    fun openBatterySettings() = if (allowed()) launch(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) else Unit

    private fun launch(intent: Intent) {
        try {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: Exception) {
        }
    }
}
