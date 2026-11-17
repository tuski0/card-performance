package app.cardperf

import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.webkit.JavascriptInterface
import androidx.core.app.NotificationManagerCompat

/** Exposed to the web app as `window.CardApp`. */
class Bridge(private val context: Context) {
    private val prefs = Prefs(context)

    @JavascriptInterface
    fun setToken(token: String) {
        prefs.token = token
    }

    @JavascriptInterface
    fun hasToken(): Boolean = prefs.token != null

    @JavascriptInterface
    fun hasNotificationAccess(): Boolean =
        NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)

    @JavascriptInterface
    fun openNotificationAccess() = launch(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))

    @JavascriptInterface
    fun openBatterySettings() = launch(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))

    private fun launch(intent: Intent) {
        try {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: Exception) {
        }
    }
}
